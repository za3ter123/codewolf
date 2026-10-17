// `codewolf apply <id...> [--dry-run]`: write a stored finding's suggestion over its lines, after relocating them.
import { lstatSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readStore, relocate, writeStore } from '../core/store.ts';
import type { FindingsStore, StoredFinding } from '../core/store.ts';
import { repoRoot } from './git.ts';

/** Absolute real path of a repo-relative file. Throws for absolute paths, `..`, symlink escapes and non-files. */
export function repoFile(root: string, rel: string): string {
  if (!rel || path.isAbsolute(rel) || /^([a-z]:|[\\/])/i.test(rel) || rel.split(/[\\/]/).includes('..')) throw new Error(`unsafe path in finding: ${rel}`);
  const realRoot = realpathSync(root);
  let abs: string;
  try { abs = realpathSync(path.join(realRoot, rel)); } catch { throw new Error(`file not found: ${rel}`); }
  const r = path.relative(realRoot, abs);
  if (!r || r === '..' || r.startsWith('..' + path.sep) || path.isAbsolute(r)) throw new Error(`path escapes the repository: ${rel}`);
  if (!lstatSync(abs).isFile()) throw new Error(`not a regular file: ${rel}`);
  return abs;
}

/** Repo root and its findings store; errors outside git since state lives in the git dir. */
export function openStore(cwd: string): { root: string; store: FindingsStore } {
  const root = repoRoot(cwd);
  if (!root) throw new Error('not inside a git repository: the findings store is disabled');
  return { root, store: readStore(root) };
}

/** Stored findings by id, in the order given. Unknown ids are an error. */
export function byIds(store: FindingsStore, ids: string[]): StoredFinding[] {
  return ids.map((id) => {
    const f = store.findings.find((x) => x.id === id);
    if (!f) throw new Error(`no stored finding with id ${id} (run codewolf findings)`);
    return f;
  });
}

/** Applies one finding to its file. Returns an error string instead of throwing so other ids still run. */
function applyOne(root: string, f: StoredFinding, dryRun: boolean): string | null {
  if (typeof f.suggestion !== 'string') return 'it has no suggestion';
  let abs: string;
  try { abs = repoFile(root, f.file); } catch (e) { return (e as Error).message; }
  const text = readFileSync(abs, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split('\n').map((l) => l.replace(/\r$/, ''));
  const start = relocate(f, text);
  if (start === null) return 'its line changed since the review (snippet not found)';
  const end = start + Math.max(0, (f.endLine ?? f.line) - f.line);
  if (lines[start - 1] !== f.snippet || end > lines.length) return 'the target text no longer matches';
  const replacement = f.suggestion === '' ? [] : f.suggestion.replace(/\r?\n$/, '').split(/\r?\n/);
  const old = lines.slice(start - 1, end);
  if (dryRun) {
    process.stdout.write([`--- ${f.file}:${start}${end > start ? '-' + end : ''} (${f.id})`, ...old.map((l) => `-${l}`), ...replacement.map((l) => `+${l}`)].join('\n') + '\n');
    return null;
  }
  lines.splice(start - 1, end - start + 1, ...replacement);
  writeFileSync(abs, lines.join(eol));
  process.stdout.write(`applied ${f.id} to ${f.file}:${start}\n`);
  return null;
}

export function cmdApply(ids: string[], opts: { 'dry-run'?: boolean | undefined }, cwd: string): number {
  if (!ids.length) throw new Error('usage: codewolf apply <id...> [--dry-run]');
  const { root, store } = openStore(cwd);
  let failed = 0;
  for (const f of byIds(store, ids)) {
    const err = applyOne(root, f, !!opts['dry-run']);
    if (err) { failed++; process.stderr.write(`codewolf: refused ${f.id} (${f.file}:${f.line}): ${err}; file untouched\n`); continue; }
    if (!opts['dry-run']) f.status = 'fixed';
  }
  if (!opts['dry-run']) writeStore(root, store);
  return failed ? 2 : 0;
}
