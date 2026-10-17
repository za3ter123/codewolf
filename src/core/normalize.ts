// Turn loosely-shaped model JSON into validated Findings, dropping anything that points outside the diff.
import { CATEGORIES, SEVERITIES } from '../shared/types.ts';
import type { Category, DiffFile, Effort, Finding, Severity } from '../shared/types.ts';
import { commentableLines, newLineText } from './diff.ts';
import { fingerprint } from './fingerprint.ts';

const SEVERITY_ALIASES: Record<string, Severity> = {
  blocker: 'critical', critical: 'critical', severe: 'critical',
  high: 'major', major: 'major', error: 'major', important: 'major',
  medium: 'minor', moderate: 'minor', minor: 'minor', warning: 'minor', warn: 'minor', low: 'minor',
  nit: 'nit', nitpick: 'nit', trivial: 'nit', info: 'nit', informational: 'nit', suggestion: 'nit', style: 'nit',
};

const CATEGORY_ALIASES: Record<string, Category> = {
  bug: 'bug', bugs: 'bug', correctness: 'bug', logic: 'bug', error: 'bug', 'error-handling': 'bug', reliability: 'bug', concurrency: 'bug',
  security: 'security', vulnerability: 'security', sec: 'security', secrets: 'security', injection: 'security',
  performance: 'performance', perf: 'performance', efficiency: 'performance',
  maintainability: 'maintainability', readability: 'maintainability', design: 'maintainability', documentation: 'maintainability', docs: 'maintainability', complexity: 'maintainability', 'best-practice': 'maintainability',
  style: 'style', formatting: 'style', naming: 'style', nit: 'style',
  test: 'test', tests: 'test', testing: 'test', coverage: 'test',
};

function s(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  return '';
}

export function toSeverity(v: unknown): Severity {
  const k = s(v).toLowerCase();
  return SEVERITY_ALIASES[k] ?? ((SEVERITIES as readonly string[]).includes(k) ? (k as Severity) : 'minor');
}

export function toCategory(v: unknown): Category {
  const k = s(v).toLowerCase().replace(/[\s_]+/g, '-');
  return CATEGORY_ALIASES[k] ?? ((CATEGORIES as readonly string[]).includes(k) ? (k as Category) : 'maintainability');
}

/** 13, "13", "L13", "13-15", "13:15" -> [13, 15?]. */
export function parseLine(v: unknown): [number, number | undefined] | undefined {
  if (typeof v === 'number' && Number.isInteger(v) && v > 0) return [v, undefined];
  const m = s(v).match(/^L?(\d+)(?:\s*(?:-|:|to|–)\s*L?(\d+))?$/i);
  if (!m) return undefined;
  const a = +m[1]!, b = m[2] ? +m[2] : undefined;
  return a > 0 ? [a, b && b > a ? b : undefined] : undefined;
}

function normPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/^[ab]\//, '');
}

/** Exact path, or a unique `/`-boundary suffix match (models often drop leading directories). */
export function matchFile(name: string, files: DiffFile[]): DiffFile | undefined {
  const n = normPath(name);
  if (!n) return undefined;
  const exact = files.find((f) => f.path === n) ?? files.find((f) => f.path === name);
  if (exact) return exact;
  const suffix = files.filter((f) => f.path.endsWith('/' + n));
  return suffix.length === 1 ? suffix[0] : undefined;
}

function stripFences(code: string): string {
  const m = code.match(/^\s*```[\w+-]*\s*\n([\s\S]*?)\n?```\s*$/);
  return (m ? m[1]! : code).replace(/\r\n/g, '\n').replace(/\n$/, '');
}

/** Models often drop the block's base indentation from suggestions; restore the original line's indent, keeping relative indents. */
export function reindent(suggestion: string, original: string): string {
  const indent = original.match(/^[ \t]*/)![0];
  const lines = suggestion.split('\n');
  const first = lines.find((l) => l.trim());
  if (!indent || !first || /^[ \t]/.test(first)) return suggestion;
  return lines.map((l) => (l.trim() ? indent + l : l)).join('\n');
}

export interface ModelReview {
  summary: string;
  walkthrough: { file: string; change: string }[];
  findings: Finding[];
  /** On a file in the diff but on a line outside every hunk. */
  outside: Finding[];
  diagram?: string;
  dropped: number;
}

type Obj = Record<string, unknown>;

/** Validate one chunk's parsed model output against the diff files it was given (anti-hallucination filter). */
export function normalizeModelOutput(raw: unknown, files: DiffFile[]): ModelReview {
  const o: Obj = Array.isArray(raw) ? { findings: raw } : raw && typeof raw === 'object' ? (raw as Obj) : {};
  const out: ModelReview = { summary: s(o.summary ?? o.overview), walkthrough: [], findings: [], outside: [], dropped: 0 };

  const wt = Array.isArray(o.walkthrough) ? o.walkthrough : [];
  for (const w of wt) {
    if (!w || typeof w !== 'object') continue;
    const e = w as Obj;
    const f = matchFile(s(e.file ?? e.path), files);
    const change = s(e.change ?? e.summary ?? e.description);
    if (f && change) out.walkthrough.push({ file: f.path, change });
  }

  const list = Array.isArray(o.findings) ? o.findings : Array.isArray(o.comments) ? o.comments : Array.isArray(o.issues) ? o.issues : [];
  for (const item of list) {
    if (!item || typeof item !== 'object') { out.dropped++; continue; }
    const e = item as Obj;
    const file = matchFile(s(e.file ?? e.path ?? e.filename), files);
    const parsed = parseLine(e.line ?? e.startLine ?? e.start_line ?? e.line_number);
    if (!file || !parsed) { out.dropped++; continue; }
    const ok = commentableLines(file);
    const line = parsed[0];
    const inDiff = ok.has(line);
    let endLine = parseLine(e.endLine ?? e.end_line)?.[0] ?? parsed[1];
    if (endLine !== undefined) {
      let valid = endLine > line;
      for (let n = line; inDiff && valid && n <= endLine; n++) if (!ok.has(n)) valid = false;
      if (!valid) endLine = undefined;
    }
    const body = s(e.body ?? e.description ?? e.message ?? e.comment ?? e.explanation);
    const title = (s(e.title ?? e.summary) || body.split(/(?<=[.!?])\s/)[0] || '').slice(0, 200);
    if (!title) { out.dropped++; continue; }
    const finding: Finding = {
      file: file.path,
      line,
      severity: toSeverity(e.severity ?? e.priority ?? e.level),
      category: toCategory(e.category ?? e.type ?? e.kind),
      title,
      body: body || title,
      source: 'llm',
      fingerprint: fingerprint(file.path, title, newLineText(file, line) ?? ''),
    };
    if (endLine !== undefined) finding.endLine = endLine;
    const sug = typeof e.suggestion === 'string' ? reindent(stripFences(e.suggestion), newLineText(file, line) ?? '') : '';
    if (sug.trim()) {
      const span = endLine ?? line;
      const current: string[] = [];
      for (let n = line; n <= span; n++) current.push(newLineText(file, n) ?? '');
      const multi = sug.includes('\n');
      // a multi-line replacement for a range we could not validate would clobber the wrong lines
      const askedEnd = e.endLine ?? e.end_line ?? parsed[1];
      const rangeOk = !multi || endLine !== undefined || askedEnd === undefined;
      if (rangeOk && sug !== current.join('\n')) finding.suggestion = sug;
    }
    const rw = e.rewrite as Obj | undefined;
    if (rw && typeof rw === 'object' && s(rw.reason) && s(rw.code) && s(rw.language)) {
      finding.rewrite = { language: s(rw.language), reason: s(rw.reason), code: stripFences(String(rw.code)) };
    }
    const effort = s(e.effort).toLowerCase();
    if (effort === 'quick' || effort === 'heavy') finding.effort = effort as Effort;
    if (s(e.kind).toLowerCase() === 'refactor') finding.kind = 'refactor';
    const cwe = s(e.cwe).toUpperCase();
    if (finding.category === 'security' && /^CWE-\d{1,5}$/.test(cwe)) finding.cwe = cwe;
    (inDiff ? out.findings : out.outside).push(finding);
  }

  const diagram = typeof o.diagram === 'string' ? stripFences(o.diagram).trim() : '';
  if (/^sequenceDiagram\b/.test(diagram)) out.diagram = diagram;
  return out;
}
