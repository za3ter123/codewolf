// Local findings store in the git dir (never the work tree): <git-path codewolf>/findings.json.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Finding } from '../shared/types.ts';

export interface StoredFinding extends Finding {
  id: string;
  status: 'open' | 'dismissed' | 'fixed';
  snippet: string;
}

export interface FindingsStore {
  version: 1;
  head: string | null;
  reviewedAt: string;
  findings: StoredFinding[];
}

let warnedCorrupt = false;

/** `git rev-parse --git-path codewolf` (worktree-correct), created on demand. Null outside a git repo. */
export function stateDir(root: string): string | null {
  const r = spawnSync('git', ['rev-parse', '--git-path', 'codewolf'], { cwd: root, encoding: 'utf8', windowsHide: true });
  if (r.error || r.status !== 0 || !r.stdout.trim()) return null;
  const dir = path.resolve(root, r.stdout.trim());
  mkdirSync(dir, { recursive: true });
  return dir;
}

const empty = (): FindingsStore => ({ version: 1, head: null, reviewedAt: '', findings: [] });

export function readStore(root: string): FindingsStore {
  const dir = stateDir(root);
  const file = dir && path.join(dir, 'findings.json');
  if (!file || !existsSync(file)) return empty();
  try {
    const s = JSON.parse(readFileSync(file, 'utf8')) as FindingsStore;
    if (s?.version !== 1 || !Array.isArray(s.findings)) throw new Error('bad shape');
    return s;
  } catch {
    if (!warnedCorrupt) { warnedCorrupt = true; process.stderr.write(`codewolf: warn: ${file} is corrupt; starting with an empty findings store\n`); }
    return empty();
  }
}

export function writeStore(root: string, s: FindingsStore): void {
  const dir = stateDir(root);
  if (!dir) throw new Error('not inside a git repository: the findings store is disabled');
  const file = path.join(dir, 'findings.json');
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(s, null, 2) + '\n');
  renameSync(tmp, file);
}

/** New 1-based line of the finding's snippet, the match nearest its old line; null when the snippet is gone. */
export function relocate(f: StoredFinding, fileText: string): number | null {
  const lines = fileText.split('\n').map((l) => l.replace(/\r$/, ''));
  let best: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== f.snippet) continue;
    if (best === null || Math.abs(i + 1 - f.line) < Math.abs(best - f.line)) best = i + 1;
  }
  return best;
}

/** Fingerprints the user dismissed (`<stateDir>/suppressed.json`). */
export function suppressed(root: string): Set<string> {
  const dir = stateDir(root);
  const file = dir && path.join(dir, 'suppressed.json');
  if (!file || !existsSync(file)) return new Set();
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    const list = Array.isArray(raw) ? raw : (raw as { fingerprints?: unknown })?.fingerprints;
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []);
  } catch { return new Set(); }
}
