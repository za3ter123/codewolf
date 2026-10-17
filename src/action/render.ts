// Pure helpers for the GitHub Action: inputs, markers, commands, comment bodies. No I/O, so all of it is unit-testable.
import type { DiffFile, Finding, ReviewResult, Severity } from '../core/index.ts';

export const SUMMARY_MARKER = '<!-- codewolf:summary -->';
export const REPLY_MARKER = '<!-- codewolf:reply -->';
export const REVIEW_MARKER = '<!-- codewolf:review -->';
export const PAUSED_MARKER = '<!-- codewolf:paused -->';
const SHA_MARKER_RE = /<!-- codewolf:reviewed-sha:([0-9a-f]{7,64}) -->/i;
const FP_MARKER_RE = /<!-- codewolf:fp:([^\s>]+) -->/g;
const SEVERITY_ORDER: Severity[] = ['critical', 'major', 'minor', 'nit'];
// GitHub rejects comment bodies over 65536 characters.
export const MAX_BODY = 60000;

export const shaMarker = (sha: string): string => `<!-- codewolf:reviewed-sha:${sha} -->`;
export const fpMarker = (fp: string): string => `<!-- codewolf:fp:${fp} -->`;
const short = (sha: string): string => sha.slice(0, 7);

/**
 * Breaks any `<!-- codewolf:...` sequence so text from a model, a diff or a user can never act as one of our markers.
 * Applied to every assembled body before our own markers are appended. Works inside code blocks too.
 */
export function defang(text: string): string {
  return text.replace(/<!--(\s*)codewolf(\s*):/gi, '<!--$1codewolf-quoted$2:');
}

/** Removes HTML comments from prose (model output, user questions), including an unterminated trailing one. */
export function stripComments(text: string): string {
  return text.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
}

// ---------------------------------------------------------------- inputs

export interface ActionInputs {
  githubToken: string;
  provider?: string;
  model?: string;
  apiKeys: string[];
  baseUrl?: string;
  profile?: string;
  config?: string;
  language?: string;
}

export function splitList(s: string): string[] {
  return s.split(/[,\n\r]+/).map((x) => x.trim()).filter(Boolean);
}

/** Reads action inputs from INPUT_<NAME> env vars with the hyphen kept, as the Actions runner sets them. */
export function parseInputs(env: Record<string, string | undefined>): ActionInputs {
  const get = (name: string): string | undefined => {
    const upper = name.toUpperCase();
    const t = (env[`INPUT_${upper}`] ?? env[`INPUT_${upper.replace(/-/g, '_')}`])?.trim();
    return t ? t : undefined;
  };
  return {
    githubToken: get('github-token') ?? env.GITHUB_TOKEN?.trim() ?? '',
    provider: get('provider'),
    model: get('model'),
    apiKeys: splitList(get('api-keys') ?? ''),
    baseUrl: get('base-url'),
    profile: get('profile'),
    config: get('config'),
    language: get('language'),
  };
}

// ---------------------------------------------------------------- comments and markers

export interface CommentUser { login?: string; type?: string }
export interface CommentLike { id?: number; body?: string | null; user?: CommentUser | null }

export function isBot(user: CommentUser | null | undefined): boolean {
  if (!user) return true;
  return user.type === 'Bot' || /\[bot\]$/i.test(user.login ?? '');
}

/** True for comments CodeWolf wrote itself, even when it posts with a personal token. */
export function isOwnComment(c: CommentLike): boolean {
  const b = c.body ?? '';
  return b.includes(SUMMARY_MARKER) || b.includes(REPLY_MARKER) || b.includes(REVIEW_MARKER) || b.includes('<!-- codewolf:fp:');
}

/** A comment whose markers we trust: written by a bot account (GITHUB_TOKEN or a GitHub App token). */
export function isBotAuthored(c: CommentLike): boolean {
  return c.user?.type === 'Bot';
}

/** Our summary comment: the oldest bot-authored comment with the summary marker. Markers typed by people are ignored. */
export function findSummaryComment<T extends CommentLike>(comments: T[]): T | undefined {
  return comments.find((c) => isBotAuthored(c) && (c.body ?? '').includes(SUMMARY_MARKER));
}

export function parseReviewedSha(body: string | null | undefined): string | undefined {
  return (body ?? '').match(SHA_MARKER_RE)?.[1]?.toLowerCase();
}

export function isPaused(body: string | null | undefined): boolean {
  return (body ?? '').includes(PAUSED_MARKER);
}

/** Fingerprint markers from bot-authored comments only. */
export function collectFingerprints(comments: CommentLike[]): Set<string> {
  const out = new Set<string>();
  for (const c of comments.filter(isBotAuthored)) for (const m of (c.body ?? '').matchAll(FP_MARKER_RE)) out.add(m[1]!);
  return out;
}

/** Sets or clears the paused marker in an existing summary body, keeping everything else. */
export function setPaused(body: string, paused: boolean): string {
  const clean = body.split(PAUSED_MARKER + '\n').join('').split(PAUSED_MARKER).join('');
  if (!paused) return clean;
  return clean.includes(SUMMARY_MARKER) ? clean.replace(SUMMARY_MARKER, `${PAUSED_MARKER}\n${SUMMARY_MARKER}`) : `${clean}\n${PAUSED_MARKER}\n${SUMMARY_MARKER}`;
}

// ---------------------------------------------------------------- chat commands

const MENTION_RE = /(^|[^\w@/.-])@codewolf\b/i;

export function mentionsCodewolf(body: string | null | undefined): boolean {
  return MENTION_RE.test(body ?? '');
}

export type CommandKind = 'review' | 'full-review' | 'pause' | 'resume' | 'summary' | 'configuration' | 'help';
export type ChatCommand = { kind: CommandKind } | { kind: 'question'; text: string };

const COMMANDS: [RegExp, CommandKind][] = [
  [/^(full[\s-]+review|full[\s-]+re-?review|review\s+all)$/i, 'full-review'],
  [/^(re-?review|review(\s+(this|again|it|the\s+pr|the\s+changes|new\s+commits))?)$/i, 'review'],
  [/^pause(\s+reviews?)?$/i, 'pause'],
  [/^(resume|unpause)(\s+reviews?)?$/i, 'resume'],
  [/^(summary|summari[sz]e|regenerate\s+summary)$/i, 'summary'],
  [/^(configuration|config|show\s+config(uration)?)$/i, 'configuration'],
  [/^(help|commands|\?)$/i, 'help'],
];

/** A command is the whole comment after the mention; anything else is a question. */
export function parseCommand(body: string): ChatCommand {
  const text = body.replace(/(^|[^\w@/.-])@codewolf\b[:,]?/gi, '$1').trim();
  const bare = text.replace(/[.!]+$/, '').trim();
  for (const [re, kind] of COMMANDS) if (re.test(bare)) return { kind };
  return { kind: 'question', text };
}

export const HELP_TEXT = [
  'CodeWolf commands (mention `@codewolf` followed by one of these):',
  '',
  '| Command | What it does |',
  '| --- | --- |',
  '| `review` | Review the commits pushed since the last review |',
  '| `full review` | Review the whole pull request again from scratch |',
  '| `pause` | Stop automatic reviews on this pull request |',
  '| `resume` | Start automatic reviews again |',
  '| `summary` | Regenerate the summary comment |',
  '| `configuration` | Show the settings CodeWolf is using (keys are never shown) |',
  '| `help` | Show this list |',
  '',
  'Anything else is treated as a question about the pull request.',
].join('\n');

// ---------------------------------------------------------------- auto review settings

export interface AutoReview { enabled: boolean; drafts: boolean; baseBranches: string[]; ignoreUsers: string[]; commandAccess: string[] }

/** Who may run @codewolf commands and questions: author associations, plus AUTHOR for the pull request author. */
export const DEFAULT_COMMAND_ACCESS = ['OWNER', 'MEMBER', 'COLLABORATOR', 'CONTRIBUTOR', 'AUTHOR'];

const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});

/** Reads `review.auto` from a parsed .codewolf.yaml object, tolerating missing or odd values. */
export function parseAutoReview(raw: unknown): AutoReview {
  const review = asObj(asObj(raw).review);
  const auto = asObj(review.auto ?? review.auto_review);
  const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : d);
  const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean) : typeof v === 'string' && v.trim() ? [v.trim()] : []);
  return {
    enabled: bool(auto.enabled, true),
    drafts: bool(auto.drafts, false),
    baseBranches: list(auto.baseBranches ?? auto.base_branches),
    ignoreUsers: list(auto.ignoreUsers ?? auto.ignore_users),
    commandAccess: (() => {
      const l = list(auto.commandAccess ?? auto.command_access).map((x) => x.toUpperCase());
      return l.length ? l : DEFAULT_COMMAND_ACCESS;
    })(),
  };
}

function branchMatches(branch: string, pattern: string): boolean {
  const re = new RegExp('^' + pattern.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
  return re.test(branch);
}

/** Why an automatic review should be skipped, or undefined to review. */
export function autoSkipReason(auto: AutoReview, pr: { draft?: boolean; baseRef?: string; author?: string }): string | undefined {
  if (!auto.enabled) return 'automatic reviews are disabled (review.auto.enabled: false)';
  if (pr.draft && !auto.drafts) return 'the pull request is a draft';
  const base = pr.baseRef;
  if (auto.baseBranches.length && base && !auto.baseBranches.some((p) => branchMatches(base, p))) return `base branch ${base} is not in review.auto.baseBranches`;
  const author = pr.author?.toLowerCase();
  if (author && auto.ignoreUsers.some((u) => u.toLowerCase() === author)) return `author ${pr.author} is in review.auto.ignoreUsers`;
  return undefined;
}

/** Whether a commenter may spend model calls. GitHub always sends author_association; a payload without one is allowed. */
export function commandAllowed(access: string[], association: string | undefined, isPrAuthor: boolean): boolean {
  if (!association) return true;
  return access.includes(association.toUpperCase()) || (isPrAuthor && access.includes('AUTHOR'));
}

// ---------------------------------------------------------------- GitHub files

export interface GitHubFile { filename: string; previous_filename?: string; status: string; patch?: string }

export function mapStatus(s: string): DiffFile['status'] {
  if (s === 'added') return 'added';
  if (s === 'removed') return 'deleted';
  if (s === 'renamed') return 'renamed';
  return 'modified';
}

/** Files GitHub sent without a patch: binary, or too large for the API. Pure renames and deletions are not listed. */
export function filesWithoutPatch(files: GitHubFile[]): string[] {
  return files.filter((f) => !f.patch && f.status !== 'renamed' && f.status !== 'removed').map((f) => f.filename);
}

// ---------------------------------------------------------------- findings

export function newFindings(findings: Finding[], posted: Set<string>): Finding[] {
  const seen = new Set(posted);
  const out: Finding[] = [];
  for (const f of findings) {
    if (seen.has(f.fingerprint)) continue;
    seen.add(f.fingerprint);
    out.push(f);
  }
  return out;
}

export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const out: Record<Severity, number> = { critical: 0, major: 0, minor: 0, nit: 0 };
  for (const f of findings) if (f.severity in out) out[f.severity]++;
  return out;
}

export function toolCounts(findings: Finding[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of findings) if (f.source.startsWith('tool:')) out[f.source.slice(5)] = (out[f.source.slice(5)] ?? 0) + 1;
  return out;
}

export function sourceLabel(source: string): string | undefined {
  if (source === 'builtin') return 'Found by the built-in secret scanner';
  if (source.startsWith('tool:')) return `Found by ${source.slice(5)}`;
  return undefined;
}

function fence(content: string, info: string): string {
  const longest = Math.max(2, ...[...content.matchAll(/`{3,}/g)].map((m) => m[0].length));
  const ticks = '`'.repeat(longest + 1);
  return `${ticks}${info}\n${content.replace(/\n$/, '')}\n${ticks}`;
}

function truncate(s: string, max = MAX_BODY): string {
  return s.length <= max ? s : s.slice(0, max) + '\n\n(truncated)';
}

function oneLine(s: string): string {
  return stripComments(s).replace(/\s*\r?\n\s*/g, ' ').trim();
}

function prose(s: string): string {
  return stripComments(s).trim();
}

function cell(s: string): string {
  return oneLine(s).replace(/\|/g, '\\|');
}

const loc = (f: Finding): string => `${f.file}:${f.line}${f.endLine && f.endLine > f.line ? '-' + f.endLine : ''}`;

/** The instruction a coding agent can act on: the engine's own text when it gave one. */
export function agentPromptFor(f: Finding): string {
  if (f.agentPrompt?.trim()) return prose(f.agentPrompt);
  const fix = typeof f.suggestion === 'string' ? ` Replace those lines with:\n${f.suggestion.replace(/\n$/, '')}` : '';
  return `In ${loc(f)}, fix this ${f.severity} ${f.category} issue: ${oneLine(f.title)}. ${oneLine(f.body)}${fix}`;
}

export function renderFindingBody(f: Finding): string {
  const head = [f.category, f.severity, f.kind, f.cwe, f.effort].filter(Boolean).join(' · ');
  const parts = [`_${head}_`, '', `**${oneLine(f.title)}**`, '', prose(f.body)];
  if (typeof f.suggestion === 'string') parts.push('', fence(f.suggestion, 'suggestion'));
  if (f.rewrite) {
    parts.push('', `<details><summary>Rewrite in ${oneLine(f.rewrite.language)}</summary>`, '', prose(f.rewrite.reason), '', fence(f.rewrite.code, oneLine(f.rewrite.language).toLowerCase().replace(/[^\w+#-]/g, '')), '', '</details>');
  }
  parts.push('', '<details><summary>Prompt for your coding agent</summary>', '', fence(agentPromptFor(f), 'text'), '', '</details>');
  const label = sourceLabel(f.source);
  if (label) parts.push('', `_${label}_`);
  const marker = fpMarker(f.fingerprint);
  return truncate(defang(parts.join('\n')), MAX_BODY - marker.length - 20) + '\n\n' + marker;
}

export interface ReviewCommentPayload {
  path: string;
  line: number;
  side: 'RIGHT';
  start_line?: number;
  start_side?: 'RIGHT';
  body: string;
}

export function toReviewComment(f: Finding): ReviewCommentPayload {
  const c: ReviewCommentPayload = { path: f.file, line: f.line, side: 'RIGHT', body: renderFindingBody(f) };
  if (f.endLine && f.endLine > f.line) {
    c.start_line = f.line;
    c.start_side = 'RIGHT';
    c.line = f.endLine;
  }
  return c;
}

/**
 * Splits findings into ones GitHub will accept inline and ones it would reject.
 * `lines` maps a path to its commentable new-side lines. A multi-line finding whose start is outside becomes single-line.
 */
export function partitionPlaceable(findings: Finding[], lines: Map<string, Set<number>>): { inline: Finding[]; outside: Finding[] } {
  const inline: Finding[] = [];
  const outside: Finding[] = [];
  for (const f of findings) {
    const set = lines.get(f.file);
    const end = f.endLine && f.endLine > f.line ? f.endLine : f.line;
    if (!set || !set.has(end)) { outside.push(f); continue; }
    if (end !== f.line && !set.has(f.line)) {
      const { endLine: _drop, ...single } = f;
      inline.push({ ...single, line: end });
    } else inline.push(f);
  }
  return { inline, outside };
}

// ---------------------------------------------------------------- review body

export interface ReviewBodyInput {
  inline: Finding[];
  nits: Finding[];
  outside: Finding[];
  profile: string;
  provider: { name: string; model: string };
  fromSha: string;
  headSha: string;
  files: string[];
  /** Findings per linter for this run, from toolCounts(). */
  tools: Record<string, number>;
}

function findingList(fs: Finding[]): string[] {
  const out: string[] = [];
  for (const f of fs) {
    const label = sourceLabel(f.source);
    out.push(`- \`${loc(f)}\` _${[f.category, f.severity, f.kind].filter(Boolean).join(' · ')}_ **${cell(f.title)}**${label ? ` (${label})` : ''}`);
    const body = prose(f.body);
    if (body) out.push('  ' + body.replace(/\r?\n/g, '\n  '));
    if (typeof f.suggestion === 'string') out.push('', fence(f.suggestion, '').split('\n').map((l) => '  ' + l).join('\n'));
    out.push('');
  }
  return out;
}

const details = (title: string, body: string[]): string[] => ['<details>', `<summary>${title}</summary>`, '', ...body, '', '</details>', ''];

export function renderReviewBody(r: ReviewBodyInput): string {
  const all = [...r.inline, ...r.outside, ...r.nits];
  const out = [`**Actionable findings: ${r.inline.length + r.outside.length}**`, ''];
  if (r.nits.length) out.push(...details(`Nitpicks (${r.nits.length})`, findingList(r.nits)));
  if (r.outside.length) out.push(...details(`Findings outside the diff (${r.outside.length})`, ['GitHub only accepts inline comments on lines that are part of the diff, so these are listed here.', '', ...findingList(r.outside)]));
  const tools = Object.entries(r.tools);
  if (tools.length) out.push(...details(`Linter output (${tools.reduce((n, [, c]) => n + c, 0)})`, tools.map(([t, c]) => `- ${t}: ${c} finding${c === 1 ? '' : 's'}`)));
  if (all.length) {
    const prompt = all.map((f, i) => `${i + 1}. ${agentPromptFor(f)}`).join('\n\n');
    out.push(...details('Prompt for your coding agent (all findings)', [fence(`Fix these review findings. Check each one against the code before changing it.\n\n${prompt}`, 'text')]));
  }
  const shown = r.files.length > 50 ? [...r.files.slice(0, 50).map((f) => '`' + f + '`'), `and ${r.files.length - 50} more`] : r.files.map((f) => '`' + f + '`');
  out.push(...details('Review details', [
    `- Profile: ${r.profile}`,
    `- Model: ${r.provider.name} (${r.provider.model})`,
    `- Commits reviewed: \`${short(r.fromSha)}..${short(r.headSha)}\``,
    `- Files reviewed (${r.files.length}): ${shown.join(', ')}`,
  ]));
  return truncateKeepingTail(defang(out.join('\n')), [REVIEW_MARKER, ...[...r.nits, ...r.outside].map((f) => fpMarker(f.fingerprint))]);
}

// ---------------------------------------------------------------- summary comment

export interface SummaryInput {
  result: ReviewResult;
  headSha: string;
  /** Sha recorded as reviewed. The summary command leaves the previous value in place. */
  reviewedSha?: string;
  /** Set when this run reviewed only the commits since this sha. */
  incrementalFrom?: string;
  paused: boolean;
  /** Fingerprints of findings posted in review bodies (nitpicks, outside the diff), carried across runs. */
  bodyFingerprints: string[];
  skippedFiles: string[];
}

export function renderSummary(s: SummaryInput): string {
  const { result } = s;
  const out: string[] = ['## CodeWolf summary', ''];
  if (s.incrementalFrom) out.push(`_Incremental review of the commits ${short(s.incrementalFrom)}..${short(s.headSha)}._`, '');
  out.push(prose(result.summary) || 'No summary was produced.', '');
  if (result.walkthrough.length) {
    out.push('### Walkthrough', '', '| File | Change |', '| --- | --- |');
    for (const w of result.walkthrough) out.push(`| \`${cell(w.file)}\` | ${cell(w.change)} |`);
    out.push('');
  }
  if (result.effort?.score) out.push(`Estimated review effort: ${result.effort.score}/5, about ${result.effort.minutes} minutes`, '');
  if (result.diagram?.trim()) {
    const d = result.diagram.trim().replace(/^```(?:mermaid)?[ \t]*\r?\n?/, '').replace(/\r?\n?```$/, '');
    out.push(...details('Sequence diagram', [fence(d, 'mermaid')]));
  }
  const counts = countBySeverity(result.findings);
  out.push('### Findings', '', `| ${SEVERITY_ORDER.join(' | ')} |`, `| ${SEVERITY_ORDER.map(() => '---').join(' | ')} |`, `| ${SEVERITY_ORDER.map((k) => counts[k]).join(' | ')} |`, '');
  // never inline, never counted above: the model pointed at an unchanged line of a changed file
  if (result.outsideDiff?.length) out.push(...details(`Findings on unchanged lines of changed files (${result.outsideDiff.length})`, findingList(result.outsideDiff)));
  if (s.skippedFiles.length) out.push(`Not reviewed (binary or too large for the GitHub API): ${s.skippedFiles.map((f) => '`' + f + '`').join(', ')}.`, '');
  if (result.warnings?.length) out.push(...details('Warnings', result.warnings.map((w) => `- ${cell(w)}`)));
  if (s.paused) out.push('Automatic reviews are paused on this pull request. Comment `@codewolf resume` to turn them back on.', '');
  out.push('---', `Reviewed \`${short(s.headSha)}\` with ${result.provider.name} (${result.provider.model}). Comment \`@codewolf help\` for commands, or \`@codewolf\` followed by a question.`, '');
  const tail = s.bodyFingerprints.slice(-500).map(fpMarker);
  if (s.paused) tail.push(PAUSED_MARKER);
  if (s.reviewedSha) tail.push(shaMarker(s.reviewedSha));
  tail.push(SUMMARY_MARKER);
  return truncateKeepingTail(defang(out.join('\n')), tail);
}

/** Minimal summary that holds the paused marker before any review has run. */
export function renderPausedStub(): string {
  return ['## CodeWolf summary', '', 'Automatic reviews are paused on this pull request. Comment `@codewolf resume` to turn them back on.', '', PAUSED_MARKER, SUMMARY_MARKER].join('\n');
}

function truncateKeepingTail(body: string, tail: string[]): string {
  const t = tail.join('\n');
  const full = `${body}\n${t}`;
  if (full.length <= MAX_BODY) return full;
  return body.slice(0, Math.max(0, MAX_BODY - t.length - 20)) + '\n\n(truncated)\n\n' + t;
}

export function renderReply(answer: string, question: string, login?: string): string {
  const q = prose(question);
  const quoted = q ? q.split(/\r?\n/).slice(0, 6).map((l) => `> ${l}`).join('\n') + '\n\n' : '';
  const who = login ? `@${login} ` : '';
  return truncate(defang(`${quoted}${who}${stripComments(answer).trim()}`)) + `\n\n${REPLY_MARKER}`;
}
