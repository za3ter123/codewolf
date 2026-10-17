// Host-agent mode: the user's own coding agent is the model. `packet` hands it the review job; `ingest` validates its
// answer with the same filters a provider reply goes through, so an agent can never get more than a model could.
import type { LogFn } from '../shared/log.ts';
import type { DiffFile, Finding, ResolvedConfig, ReviewResult } from '../shared/types.ts';
import { buildResult, chunkFiles, reviewableFiles } from './engine.ts';
import { extractJson } from './json.ts';
import { runLinters } from './linters.ts';
import { normalizeModelOutput } from './normalize.ts';
import { instructionsFor, systemPrompt } from './prompt.ts';
import { scanSecrets } from './secrets.ts';

export interface Packet {
  version: 1;
  instructions: string;
  chunks: { id: string; files: string[]; diff: string }[];
  builtin: Finding[];
  learnings: string[];
  guidelines: string;
  schema: Record<string, unknown>;
}

const str = { type: 'string' };
const int = { type: 'integer', minimum: 1 };

/** JSON Schema of the answer `codewolf ingest` accepts. */
export const ANSWER_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: ['findings'],
  properties: {
    summary: str,
    walkthrough: { type: 'array', items: { type: 'object', required: ['file', 'change'], properties: { file: str, change: str } } },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'line', 'severity', 'category', 'title', 'body'],
        properties: {
          file: str, line: int, endLine: int,
          severity: { enum: ['critical', 'major', 'minor', 'nit'] },
          category: { enum: ['bug', 'security', 'performance', 'maintainability', 'style', 'test'] },
          title: str, body: str, suggestion: str,
          effort: { enum: ['quick', 'heavy'] },
          kind: { enum: ['refactor'] },
          cwe: { type: 'string', pattern: '^CWE-\\d+$' },
          rewrite: { type: 'object', required: ['language', 'reason', 'code'], properties: { language: str, reason: str, code: str } },
        },
      },
    },
    diagram: str,
  },
};

const HOST_NOTE = `Host-agent mode: you, the coding agent that ran \`codewolf packet\`, are the reviewer. Review every entry of "chunks" (each "diff" uses the format described above), then write ONE JSON answer covering all chunks, shaped like "schema", and pass it to \`codewolf ingest\` with the same scope flags you gave \`codewolf packet\`. "builtin" lists what deterministic scanners already found; do not repeat those. Apply "learnings" (team preferences, they override your defaults) and "guidelines" (repository rules) as a reviewer would.`;

async function builtinFindings(keep: DiffFile[], config: ResolvedConfig, linters: boolean, log: LogFn): Promise<Finding[]> {
  const on = linters && Object.values(config.tools).some(Boolean);
  const tools = on ? await runLinters(keep, config, (m) => log('debug', m)).catch(() => [] as Finding[]) : [];
  return [...scanSecrets(keep), ...tools];
}

export interface HostOptions { linters?: boolean; log?: LogFn; suppressed?: Set<string> }

export async function buildPacket(files: DiffFile[], config: ResolvedConfig, opts: HostOptions = {}): Promise<Packet> {
  const { keep } = reviewableFiles(files, config.review.exclude);
  const ins = instructionsFor(keep.map((f) => f.path), config.review.pathInstructions);
  const instructions = [systemPrompt(config.profile, config.language), HOST_NOTE];
  if (ins.length) instructions.push(`Extra instructions for specific paths:\n${ins.join('\n')}`);
  const builtin = (await builtinFindings(keep, config, opts.linters !== false, opts.log ?? (() => {}))).filter((f) => !opts.suppressed?.has(f.fingerprint));
  return {
    version: 1,
    instructions: instructions.join('\n\n'),
    chunks: chunkFiles(keep, config.review.maxChunkTokens).map((c, i) => ({ id: `c${i + 1}`, files: c.paths, diff: c.body })),
    builtin,
    learnings: config.learnings,
    guidelines: config.guidelines,
    schema: ANSWER_SCHEMA,
  };
}

/** Validate an agent's answer against the diff (anti-hallucination, outside-diff bucket), merge builtin scanners, build the result. */
export async function ingestAnswer(text: string, files: DiffFile[], config: ResolvedConfig, opts: HostOptions = {}): Promise<ReviewResult> {
  const raw = extractJson(text);
  if (raw === undefined) throw new Error('the answer is not valid JSON; expected {"summary", "walkthrough", "findings": [...]}');
  const log: LogFn = opts.log ?? (() => {});
  const { keep } = reviewableFiles(files, config.review.exclude);
  const answer = normalizeModelOutput(raw, keep);
  const warnings: string[] = [];
  if (answer.dropped) { warnings.push(`dropped ${answer.dropped} finding(s) on files outside the diff or malformed`); log('warn', warnings[0]!); }
  const walk = new Map(answer.walkthrough.map((w) => [w.file, w.change]));
  const builtin = await builtinFindings(keep, config, opts.linters !== false, log);
  return buildResult(files, keep, config, {
    findings: [...builtin, ...answer.findings], outside: answer.outside, walk, summary: answer.summary,
    ...(answer.diagram ? { diagram: answer.diagram } : {}), provider: { name: 'host-agent', model: '' }, warnings,
  }, opts.suppressed);
}
