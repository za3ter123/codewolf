// Local state in the git dir (`git rev-parse --git-path codewolf`), never the work tree: findings store,
// suppressed fingerprints and the incremental-review checkpoint. Every write is tmp file + rename.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Finding } from '../shared/types.ts';

export interface StoredFinding extends Finding {
  /** First 8 hex chars of the fingerprint, longer on collision. */
  id: string;
  status: 'open' | 'dismissed' | 'fixed';
  /** Exact text of line `line` at review time, used to find the finding again after edits. */
  snippet: string;
}

export interface FindingsStore {
  version: 1;
  head: string | null;
  reviewedAt: string;
  findings: StoredFinding[];
}

export interface Checkpoint {
  version: 1;
  head: string | null;
  /** path -> git blob id of the new-side content at the last successful review. */
  files: Record<string, string>;
}

interface Suppressed { version: 1; items: { fingerprint: string; reason?: string; at: string }[] }

const STATUSES = ['open', 'dismissed', 'fixed'];

/** Absolute state directory for the repository at `root`, or null outside git. Not created here. */
export function stateDir(root: string): string | null {
  const r = spawnSync('git', ['rev-parse', '--git-path', 'codewolf'], { cwd: root, encoding: 'utf8', windowsHide: true });
  const out = r.status === 0 ? r.stdout.trim() : '';
  return out ? path.resolve(root, out) : null;
}

function readJson(file: string): unknown {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch (e) { return (e as NodeJS.ErrnoException).code === 'ENOENT' ? undefined : null; }
}

function writeJson(dir: string, name: string, value: unknown): void {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n');
  renameSync(tmp, file);
}

export const emptyStore = (): FindingsStore => ({ version: 1, head: null, reviewedAt: '', findings: [] });

let warnedCorrupt = false;

function validFinding(x: unknown): x is StoredFinding {
  const f = x as StoredFinding;
  return !!f && typeof f === 'object' && typeof f.id === 'string' && typeof f.fingerprint === 'string' && typeof f.file === 'string'
    && Number.isInteger(f.line) && f.line > 0 && typeof f.title === 'string' && typeof f.snippet === 'string' && STATUSES.includes(f.status);
}

/** The findings store; empty when missing or corrupt (corrupt warns once on stderr). */
export function readStore(root: string): FindingsStore {
  const dir = stateDir(root);
  if (!dir) return emptyStore();
  const raw = readJson(path.join(dir, 'findings.json')) as FindingsStore | null | undefined;
  if (raw === undefined) return emptyStore();
  if (!raw || raw.version !== 1 || !Array.isArray(raw.findings) || !raw.findings.every(validFinding)) {
    if (!warnedCorrupt) process.stderr.write('codewolf: warning: the findings store is corrupt; starting from an empty one\n');
    warnedCorrupt = true;
    return emptyStore();
  }
  return { version: 1, head: typeof raw.head === 'string' ? raw.head : null, reviewedAt: String(raw.reviewedAt ?? ''), findings: raw.findings };
}

export function writeStore(root: string, s: FindingsStore): void {
  const dir = stateDir(root);
  if (!dir) throw new Error('not inside a git repository; the findings store lives in the git dir');
  writeJson(dir, 'findings.json', s);
}

/** 1-based line of the finding's snippet in `fileText`, nearest to its old line; null when the snippet is gone. */
export function relocate(f: StoredFinding, fileText: string): number | null {
  const lines = fileText.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop(); // the final newline does not start a line
  // a blank snippet matches every blank line; only trust it where it was
  if (!f.snippet.trim()) return lines[f.line - 1] === f.snippet ? f.line : null;
  let best: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== f.snippet) continue;
    if (best === null || Math.abs(i + 1 - f.line) < Math.abs(best - f.line)) best = i + 1;
  }
  return best;
}

function readSuppressed(dir: string): Suppressed {
  const raw = readJson(path.join(dir, 'suppressed.json')) as Suppressed | null | undefined;
  return raw && raw.version === 1 && Array.isArray(raw.items) ? { version: 1, items: raw.items.filter((i) => i && typeof i.fingerprint === 'string') } : { version: 1, items: [] };
}

/** Fingerprints the user dismissed; reviews drop them. */
export function suppressed(root: string): Set<string> {
  const dir = stateDir(root);
  return new Set(dir ? readSuppressed(dir).items.map((i) => i.fingerprint) : []);
}

export function addSuppressed(root: string, fingerprints: string[], reason?: string): void {
  const dir = stateDir(root);
  if (!dir) throw new Error('not inside a git repository; suppressions live in the git dir');
  const s = readSuppressed(dir);
  const have = new Set(s.items.map((i) => i.fingerprint));
  const at = new Date().toISOString();
  for (const fp of fingerprints) if (!have.has(fp)) s.items.push({ fingerprint: fp, ...(reason ? { reason } : {}), at });
  writeJson(dir, 'suppressed.json', s);
}

export function readCheckpoint(root: string): Checkpoint | null {
  const dir = stateDir(root);
  const raw = dir ? readJson(path.join(dir, 'checkpoint.json')) as Checkpoint | null | undefined : undefined;
  return raw && raw.version === 1 && raw.files && typeof raw.files === 'object' ? raw : null;
}

export function writeCheckpoint(root: string, c: Checkpoint): void {
  const dir = stateDir(root);
  if (dir) writeJson(dir, 'checkpoint.json', c);
}

export function clearCheckpoint(root: string): void {
  const dir = stateDir(root);
  if (dir) rmSync(path.join(dir, 'checkpoint.json'), { force: true });
}

/** Short unique id: 8 hex chars of the fingerprint, 12 (then the full fingerprint) when another finding owns it. */
function newId(fp: string, taken: Map<string, string>): string {
  for (const n of [8, 12, fp.length]) {
    const id = fp.slice(0, n);
    const owner = taken.get(id);
    if (owner === undefined || owner === fp) return id;
  }
  return fp;
}

/**
 * Merge one review into the store. Re-found fingerprints keep their id and status (a 'fixed' one that came back is
 * open again); new ones are open; open ones on a re-reviewed file that were not found again become fixed.
 */
export function mergeStore(prev: FindingsStore, found: Finding[], reviewed: Set<string>, snippetOf: (f: Finding) => string, head: string | null): FindingsStore {
  const byFp = new Map(prev.findings.map((f) => [f.fingerprint, f]));
  const taken = new Map(prev.findings.map((f) => [f.id, f.fingerprint]));
  const seen = new Set<string>();
  const out: StoredFinding[] = [];
  for (const f of found) {
    if (seen.has(f.fingerprint)) continue;
    seen.add(f.fingerprint);
    const old = byFp.get(f.fingerprint);
    const id = old?.id ?? newId(f.fingerprint, taken);
    taken.set(id, f.fingerprint);
    out.push({ ...f, id, status: old?.status === 'dismissed' ? 'dismissed' : 'open', snippet: snippetOf(f) });
  }
  for (const f of prev.findings) {
    if (seen.has(f.fingerprint)) continue;
    out.push(f.status === 'open' && reviewed.has(f.file) ? { ...f, status: 'fixed' } : f);
  }
  return { version: 1, head, reviewedAt: new Date().toISOString(), findings: out };
}
