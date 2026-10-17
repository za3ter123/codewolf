// Review engine: filter, chunk, prompt, call the provider chain, parse, validate, dedupe, merge.
import { isExcluded } from '../shared/glob.ts';
import { errorMessage } from '../shared/log.ts';
import type { LogFn } from '../shared/log.ts';
import { redact } from '../shared/mask.ts';
import { SEVERITIES } from '../shared/types.ts';
import type { DiffFile, Finding, Hunk, ResolvedConfig, ReviewResult, Severity } from '../shared/types.ts';
import { createChain } from '../providers/chain.ts';
import type { Chain } from '../providers/chain.ts';
import { isSafePath } from './diff.ts';
import { extractJson } from './json.ts';
import { runLinters } from './linters.ts';
import { normalizeModelOutput } from './normalize.ts';
import type { ModelReview } from './normalize.ts';
import { fileHeader, mergeSummaryPrompt, renderHunk, repairPrompt, systemPrompt, userPrompt } from './prompt.ts';
import { scanSecrets } from './secrets.ts';

export interface ReviewOptions {
  signal?: AbortSignal;
  log?: LogFn;
  /** Reuse a provider chain (keeps key cooldowns across calls). Defaults to one built from config.providers. */
  chain?: Chain;
  /** Run external linters (default true; each tool still obeys config.tools). */
  linters?: boolean;
}

export interface Chunk { files: DiffFile[]; body: string; paths: string[] }

const CHARS_PER_TOKEN = 4;
const CHILL_MINOR_CAP = 3;
const rank = (s: Severity) => SEVERITIES.indexOf(s);

/** Files the LLM should see: not excluded, not binary, not pure deletions, with at least one hunk. */
export function reviewableFiles(files: DiffFile[], exclude: string[]): { keep: DiffFile[]; skipped: DiffFile[] } {
  const keep: DiffFile[] = [], skipped: DiffFile[] = [];
  for (const f of files) {
    const ok = !f.binary && f.status !== 'deleted' && f.hunks.length > 0 && f.path !== '' && isSafePath(f.path) && !isExcluded(f.path, exclude)
      && f.hunks.some((h) => h.lines.some((l) => l.type === 'add'));
    (ok ? keep : skipped).push(f);
  }
  return { keep, skipped };
}

/** Split a hunk whose rendering exceeds the budget into consecutive slices. */
function splitHunk(h: Hunk, maxChars: number): Hunk[] {
  const out: Hunk[] = [];
  let cur: Hunk | null = null, size = 0;
  for (const l of h.lines) {
    const len = l.text.length + 8;
    if (!cur || (size + len > maxChars && cur.lines.length)) {
      const first = l.newLine ?? h.newStart;
      cur = { oldStart: l.oldLine ?? h.oldStart, oldLines: 0, newStart: first, newLines: 0, lines: [] };
      out.push(cur);
      size = 0;
    }
    cur.lines.push(l);
    if (l.type !== 'add') cur.oldLines++;
    if (l.type !== 'del') cur.newLines++;
    size += len;
  }
  return out;
}

/** Group files into prompts under a token budget (~chars/4). Big files are split by hunk, huge hunks by line. */
export function chunkFiles(files: DiffFile[], maxTokens: number): Chunk[] {
  const maxChars = Math.max(2000, maxTokens * CHARS_PER_TOKEN);
  const pieces: { file: DiffFile; text: string }[] = [];
  for (const f of files) {
    const hunks = f.hunks.flatMap((h) => (renderHunk(h).length > maxChars ? splitHunk(h, maxChars) : [h]));
    const groups: Hunk[][] = [];
    let g: Hunk[] = [], size = 0;
    for (const h of hunks) {
      const len = renderHunk(h).length + 1;
      if (g.length && size + len > maxChars) { groups.push(g); g = []; size = 0; }
      g.push(h); size += len;
    }
    if (g.length) groups.push(g);
    groups.forEach((hs, i) => {
      const part = groups.length > 1 ? `(part ${i + 1} of ${groups.length})` : undefined;
      pieces.push({ file: { ...f, hunks: hs }, text: `${fileHeader(f, part)}\n${hs.map((h) => renderHunk(h)).join('\n')}` });
    });
  }
  const chunks: Chunk[] = [];
  let cur: Chunk | null = null, size = 0;
  for (const p of pieces) {
    if (!cur || size + p.text.length > maxChars) { cur = { files: [], body: '', paths: [] }; chunks.push(cur); size = 0; }
    cur.files.push(p.file);
    if (!cur.paths.includes(p.file.path)) cur.paths.push(p.file.path);
    cur.body += (cur.body ? '\n\n' : '') + p.text;
    size += p.text.length + 2;
  }
  return chunks;
}

/** Run tasks with at most `limit` in flight; results keep input order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]!, i); } };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
  return out;
}

function applyProfile(findings: Finding[], profile: ResolvedConfig['profile']): Finding[] {
  if (profile === 'assertive') return findings;
  if (profile === 'quiet') return findings.filter((f) => f.severity === 'critical');
  let minors = 0;
  return findings.filter((f) => f.severity === 'critical' || f.severity === 'major' || (f.severity === 'minor' && minors++ < CHILL_MINOR_CAP));
}

const SECRET_WORDS = /secret|credential|api.?key|access.?key|token|password|hard-?coded|private key/i;

/** Dedupe by fingerprint (keep the most severe) and drop model/tool findings that repeat a builtin secret hit. */
export function dedupe(findings: Finding[]): Finding[] {
  const byFp = new Map<string, Finding>();
  for (const f of findings) {
    const prev = byFp.get(f.fingerprint);
    if (!prev || rank(f.severity) < rank(prev.severity)) byFp.set(f.fingerprint, f);
  }
  const all = [...byFp.values()];
  const builtin = new Set(all.filter((f) => f.source === 'builtin').map((f) => `${f.file}:${f.line}`));
  return all.filter((f) => f.source === 'builtin' || !(f.category === 'security' && builtin.has(`${f.file}:${f.line}`) && SECRET_WORDS.test(`${f.title} ${f.body}`)));
}

/** Instruction a coding agent can act on, built from the finding alone. */
export function agentPrompt(f: Finding): string {
  const where = `${f.file} line${f.endLine ? `s ${f.line}-${f.endLine}` : ` ${f.line}`}`;
  const parts = [
    'Check this against the current code before you edit; if it is already fixed or the code has moved on, do nothing.',
    `Location: ${where}.`,
    `Problem (${f.severity} ${f.category}): ${f.title}.`,
  ];
  if (f.body && f.body !== f.title) parts.push(f.body);
  if (f.suggestion !== undefined) parts.push(`Fix: replace ${f.endLine ? 'those lines' : 'that line'} with exactly:\n${f.suggestion}`);
  else if (f.rewrite) parts.push(`Fix: consider moving this to ${f.rewrite.language} (${f.rewrite.reason}).`);
  else parts.push('Fix: make the smallest change that resolves it and keep all other behavior the same.');
  return parts.join(' ');
}

/** Effort for a human reviewer: grows with changed lines, file count and serious findings. */
export function estimateEffort(files: DiffFile[], findings: Finding[]): { score: number; minutes: number } {
  let changed = 0;
  for (const f of files) for (const h of f.hunks) for (const l of h.lines) if (l.type !== 'ctx') changed++;
  const serious = findings.filter((f) => f.severity === 'critical').length * 8 + findings.filter((f) => f.severity === 'major').length * 4;
  const minutes = Math.max(1, Math.round(2 + changed / 15 + files.length * 1.5 + serious));
  const score = minutes <= 10 ? 1 : minutes <= 25 ? 2 : minutes <= 50 ? 3 : minutes <= 90 ? 4 : 5;
  return { score, minutes };
}

function defaultChange(f: DiffFile): string {
  if (f.status === 'added') return 'New file.';
  if (f.status === 'deleted') return 'File deleted.';
  if (f.status === 'renamed') return `Renamed from ${f.oldPath ?? 'another path'}.`;
  return f.binary ? 'Binary file changed.' : 'Modified.';
}

async function reviewChunk(chunk: Chunk, idx: number, total: number, config: ResolvedConfig, chain: Chain, signal: AbortSignal | undefined, warn: (m: string) => void): Promise<{ review: ModelReview; provider: string } | undefined> {
  const req = {
    system: systemPrompt(config.profile, config.language),
    prompt: userPrompt(chunk.body, chunk.paths, { learnings: config.learnings, guidelines: config.guidelines, pathInstructions: config.review.pathInstructions, part: { index: idx + 1, total } }),
    json: true,
    ...(signal ? { signal } : {}),
  };
  const res = await chain.complete(req); // chain exhaustion propagates: a partial review must not look clean
  let parsed = extractJson(res.text);
  if (parsed === undefined) {
    warn(`chunk ${idx + 1}/${total}: model output was not valid JSON, asking for a repair`);
    try {
      const fix = repairPrompt(res.text);
      parsed = extractJson((await chain.complete({ ...fix, json: true, ...(signal ? { signal } : {}) })).text);
    } catch (e) { if (signal?.aborted) throw e; warn(`chunk ${idx + 1}/${total}: repair request failed: ${errorMessage(e)}`); }
  }
  if (parsed === undefined) { warn(`chunk ${idx + 1}/${total} (${chunk.paths.join(', ')}): unparseable model output, no findings from it`); return undefined; }
  const review = normalizeModelOutput(parsed, chunk.files);
  if (review.dropped) warn(`chunk ${idx + 1}/${total}: dropped ${review.dropped} finding(s) outside the diff or malformed`);
  return { review, provider: `${res.provider.name}\u0000${res.provider.model}` };
}

export async function review(files: DiffFile[], config: ResolvedConfig, opts: ReviewOptions = {}): Promise<ReviewResult> {
  const log: LogFn = opts.log ?? (() => {});
  const warnings: string[] = [];
  const warn = (m: string) => { const r = redact(m); warnings.push(r); log('warn', r); };
  const chain = opts.chain ?? createChain(config.providers, { log: (lvl, m) => log(lvl, m) });
  const { keep } = reviewableFiles(files, config.review.exclude);
  const first = config.providers[0];
  const providerUsed = new Map<string, number>();

  const chunks = chunkFiles(keep, config.review.maxChunkTokens);
  if (chunks.length > 1) log('info', `reviewing ${keep.length} file(s) in ${chunks.length} chunks`);
  const lintersOn = opts.linters !== false && Object.values(config.tools).some(Boolean);
  // one failed chunk fails the review, so stop the others instead of spending more requests
  const stop = new AbortController();
  const signal = opts.signal ? AbortSignal.any([opts.signal, stop.signal]) : stop.signal;
  const [results, toolHits] = await Promise.all([
    mapLimit(chunks, config.review.concurrency, (c, i) => reviewChunk(c, i, chunks.length, config, chain, signal, warn).catch((e: unknown) => { stop.abort(e); throw e; })),
    lintersOn ? runLinters(keep, config, (m) => log('debug', m)).catch(() => [] as Finding[]) : Promise.resolve([] as Finding[]),
  ]);

  const findings: Finding[] = [...scanSecrets(keep), ...toolHits];
  const walk = new Map<string, string>();
  const summaries: string[] = [];
  let diagram: string | undefined;
  for (const r of results) {
    if (!r) continue;
    providerUsed.set(r.provider, (providerUsed.get(r.provider) ?? 0) + 1);
    findings.push(...r.review.findings);
    for (const w of r.review.walkthrough) walk.set(w.file, walk.has(w.file) ? `${walk.get(w.file)} ${w.change}` : w.change);
    if (r.review.summary) summaries.push(r.review.summary);
    diagram ??= r.review.diagram;
  }

  let summary = summaries[0] ?? '';
  if (summaries.length > 1) {
    try {
      const m = mergeSummaryPrompt(summaries, config.language);
      const out = extractJson((await chain.complete({ ...m, json: true, ...(opts.signal ? { signal: opts.signal } : {}) })).text) as { summary?: unknown } | undefined;
      summary = typeof out?.summary === 'string' && out.summary.trim() ? out.summary.trim() : summaries.join(' ');
    } catch (e) {
      if (opts.signal?.aborted) throw e;
      summary = summaries.join(' ');
    }
  }
  if (!summary) summary = keep.length ? `Reviewed ${keep.length} file(s).` : 'No reviewable changes.';

  const final = applyProfile(dedupe(findings), config.profile)
    .sort((a, b) => rank(a.severity) - rank(b.severity) || a.file.localeCompare(b.file) || a.line - b.line)
    .map((f) => ({ ...f, agentPrompt: agentPrompt(f) }));

  const shown = files.filter((f) => !isExcluded(f.path, config.review.exclude));
  const walkthrough = shown.map((f) => ({ file: f.path, change: walk.get(f.path) ?? defaultChange(f) }));
  const bySeverity: Record<string, number> = { critical: 0, major: 0, minor: 0, nit: 0 };
  for (const f of final) bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;

  const top = [...providerUsed.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const [pname, pmodel] = top ? top.split('\u0000') : [first?.name ?? 'none', first?.model ?? ''];
  const result: ReviewResult = {
    summary,
    walkthrough,
    findings: final,
    stats: { files: shown.length, findings: final.length, bySeverity },
    provider: { name: pname ?? 'none', model: pmodel ?? '' },
    effort: estimateEffort(keep, final),
  };
  if (diagram) result.diagram = diagram;
  if (warnings.length) result.warnings = warnings;
  return result;
}
