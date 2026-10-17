// Review state for the CLI: incremental checkpoint, findings store updates, `codewolf findings` and `codewolf dismiss`.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { isSafePath, newLineText } from '../core/diff.ts';
import { countSeverities, reviewableFiles } from '../core/engine.ts';
import { appendLearning } from '../core/learnings.ts';
import {
  addSuppressed, clearCheckpoint, emptyStore, mergeStore, readCheckpoint, readStore, relocate, stateDir, suppressed, writeCheckpoint, writeStore,
} from '../core/store.ts';
import type { StoredFinding } from '../core/store.ts';
import { errorMessage } from '../shared/log.ts';
import type { LogFn } from '../shared/log.ts';
import { SEVERITIES } from '../shared/types.ts';
import type { DiffFile, Finding, ResolvedConfig, ReviewResult } from '../shared/types.ts';
import { git, repoRoot } from './git.ts';
import type { DiffScope } from './git.ts';

export type Scope = DiffScope | { kind: 'file'; path: string };

export interface Prepared {
  scope: Scope;
  /** Every parsed file of the diff. */
  all: DiffFile[];
  /** Files to review: `all` minus the ones unchanged since the checkpoint. */
  files: DiffFile[];
  skipped: string[];
  /** Repository root when the findings store applies (any scope but --diff). */
  root: string | null;
  incremental: boolean;
  head: string | null;
  hashes: Record<string, string>;
  /** Open stored findings on skipped files: still true, since the file has not changed. */
  carried: Finding[];
  suppressed: Set<string>;
}

const rank = (s: string) => SEVERITIES.indexOf(s as (typeof SEVERITIES)[number]);

/** Git blob ids of the new side: the work tree, or HEAD for --committed. Empty on any failure (then nothing is skipped). */
export function blobIds(root: string, paths: string[], committed: boolean): Record<string, string> {
  const out: Record<string, string> = {};
  if (!paths.length) return out;
  try {
    if (committed) {
      const want = new Set(paths);
      for (const rec of git(['ls-tree', '-r', '-z', 'HEAD'], root).split('\0')) {
        const m = rec.match(/^\d+ blob ([0-9a-f]+)\t(.*)$/s);
        if (m && want.has(m[2]!)) out[m[2]!] = m[1]!;
      }
      return out;
    }
    const r = spawnSync('git', ['hash-object', '--stdin-paths'], { cwd: root, input: paths.join('\n') + '\n', encoding: 'utf8', windowsHide: true });
    const ids = r.status === 0 ? r.stdout.trim().split('\n') : [];
    if (ids.length === paths.length) paths.forEach((p, i) => (out[p] = ids[i]!));
  } catch { /* no incremental this time */ }
  return out;
}

function headSha(root: string): string | null {
  try { return git(['rev-parse', '--verify', '--quiet', 'HEAD'], root).trim() || null; } catch { return null; }
}

function strip(f: StoredFinding): Finding {
  const { id: _id, status: _status, snippet: _snippet, ...rest } = f;
  return rest;
}

/** Decide what to review: apply the checkpoint (unless --fresh), load suppressions, and warn when the change is huge. */
export function prepareReview(scope: Scope, all: DiffFile[], config: ResolvedConfig, cwd: string, opts: { fresh?: boolean; log: LogFn }): Prepared {
  const repo = repoRoot(cwd) ?? null;
  const root = scope.kind === 'file' ? null : repo;
  const incremental = root !== null && scope.kind !== 'staged' && scope.kind !== 'file';
  const keep = reviewableFiles(all, config.review.exclude).keep;
  const hashes = incremental ? blobIds(root!, keep.map((f) => f.path), scope.kind === 'committed') : {};
  const cp = incremental && !opts.fresh ? readCheckpoint(root!) : null;
  const skipped = cp ? keep.filter((f) => hashes[f.path] && cp.files[f.path] === hashes[f.path]).map((f) => f.path) : [];
  const skip = new Set(skipped);
  const carried = skipped.length ? readStore(root!).findings.filter((f) => f.status === 'open' && skip.has(f.file)).map(strip) : [];
  if (skipped.length) {
    opts.log('info', `skipped ${skipped.length} file(s) unchanged since the last review${carried.length ? `, ${carried.length} open finding(s) on them carried over` : ''} (--fresh reviews everything)`);
  }
  const files = all.filter((f) => !skip.has(f.path));
  const tokens = Math.round(reviewableFiles(files, config.review.exclude).keep.reduce((n, f) => n + f.patch.length, 0) / 4);
  const limit = config.review.maxChunkTokens * config.review.concurrency * 4;
  if (tokens > limit) {
    opts.log('warn', `this change is large (about ${tokens} tokens, over ${limit}); reviewing it anyway. Smaller reviews are sharper: try --staged, `
      + 'a path-limited diff (git diff <base> -- <path> | codewolf review --diff -), or splitting the commit');
  }
  return {
    scope, all, files, skipped, root, incremental, head: root ? headSha(root) : null, hashes, carried,
    suppressed: repo ? suppressed(repo) : new Set(),
  };
}

function fileLine(root: string, file: string, line: number): string {
  if (!isSafePath(file)) return '';
  try { return readFileSync(path.join(root, file), 'utf8').split(/\r?\n/)[line - 1] ?? ''; } catch { return ''; }
}

/** Add carried findings to the result, then save the store and checkpoint. State errors warn; they never fail a review. */
export function recordReview(prep: Prepared, result: ReviewResult, config: ResolvedConfig, log: LogFn): ReviewResult {
  const have = new Set([...result.findings, ...(result.outsideDiff ?? [])].map((f) => f.fingerprint));
  const extra = prep.carried.filter((f) => !have.has(f.fingerprint) && !prep.suppressed.has(f.fingerprint));
  let out = result;
  if (extra.length) {
    const findings = [...result.findings, ...extra].sort((a, b) => rank(a.severity) - rank(b.severity) || a.file.localeCompare(b.file) || a.line - b.line);
    out = { ...result, findings, stats: { ...result.stats, findings: findings.length, bySeverity: countSeverities(findings) } };
  }
  const root = prep.root;
  if (!root) return out;
  try {
    const byPath = new Map(prep.all.map((f) => [f.path, f]));
    const snippetOf = (f: Finding) => {
      const d = byPath.get(f.file);
      return (d && newLineText(d, f.line)) ?? fileLine(root, f.file, f.line);
    };
    const reviewed = new Set(reviewableFiles(prep.files, config.review.exclude).keep.map((f) => f.path));
    writeStore(root, mergeStore(readStore(root), [...out.findings, ...(out.outsideDiff ?? [])], reviewed, snippetOf, prep.head));
    if (prep.incremental) writeCheckpoint(root, { version: 1, head: prep.head, files: prep.hashes });
  } catch (e) {
    log('warn', `could not save review state: ${errorMessage(e)}`);
  }
  return out;
}

function stateRoot(cwd: string): string {
  const root = repoRoot(cwd);
  if (!root || !stateDir(root)) throw new Error('not inside a git repository; CodeWolf keeps findings in the git dir, so this command needs one');
  return root;
}

/** Where the finding sits now: its snippet relocated in the current file, else the line it was found on. */
function currentLine(root: string, f: StoredFinding): number {
  if (!isSafePath(f.file)) return f.line;
  try { return relocate(f, readFileSync(path.join(root, f.file), 'utf8')) ?? f.line; } catch { return f.line; }
}

export function cmdFindings(v: { all?: boolean; json?: boolean; clear?: boolean }, cwd: string): number {
  const root = stateRoot(cwd);
  if (v.clear) {
    writeStore(root, emptyStore());
    clearCheckpoint(root); // an empty store with an old checkpoint would make the next review skip files and look clean
    process.stdout.write('cleared the findings store; the next review covers every changed file\n');
    return 0;
  }
  const list = readStore(root).findings.filter((f) => v.all || f.status === 'open').map((f) => ({ ...f, line: currentLine(root, f) }));
  if (v.json) { process.stdout.write(JSON.stringify(list, null, 2) + '\n'); return 0; }
  if (!list.length) { process.stdout.write(v.all ? 'no stored findings. run codewolf review first\n' : 'no open findings\n'); return 0; }
  const rows = list.map((f) => [f.id, `${f.file}:${f.line}`, f.severity, f.kind ?? 'issue', ...(v.all ? [f.status] : []), f.title.replace(/\s*\r?\n\s*/g, ' ')].join(' '));
  process.stdout.write(rows.join('\n') + '\n');
  return 0;
}

export function cmdDismiss(ids: string[], v: { reason?: string; learn?: boolean }, cwd: string): number {
  if (!ids.length) throw new Error('usage: codewolf dismiss <id...> [--reason "<text>"] [--learn]');
  const reason = v.reason?.replace(/\s+/g, ' ').trim();
  if (v.learn && !reason) throw new Error('--learn needs --reason "<what to stop flagging and why>"');
  const root = stateRoot(cwd);
  const store = readStore(root);
  const picked = ids.map((id) => store.findings.find((f) => f.id === id || f.fingerprint === id));
  const unknown = ids.filter((_, i) => !picked[i]);
  if (unknown.length) throw new Error(`unknown finding id(s): ${unknown.join(', ')} (see codewolf findings --all)`);
  const fps = new Set(picked.map((f) => f!.fingerprint));
  writeStore(root, { ...store, findings: store.findings.map((f) => (fps.has(f.fingerprint) ? { ...f, status: 'dismissed' } : f)) });
  addSuppressed(root, [...fps], reason);
  const learned = v.learn && reason ? appendLearning(root, reason) : undefined;
  process.stdout.write(`dismissed ${fps.size} finding(s); future reviews will not report them${learned ? `. learned: saved to ${learned}` : ''}\n`);
  return 0;
}
