import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { addSuppressed, emptyStore, mergeStore, readStore, relocate, stateDir, suppressed, writeStore } from '../../src/core/store.ts';
import type { FindingsStore, StoredFinding } from '../../src/core/store.ts';
import type { Finding } from '../../src/shared/types.ts';
import { tmpDir } from '../fixtures/helpers.ts';

function repo(): string {
  const dir = tmpDir('cwstore-');
  const r = spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return dir;
}

const finding = (over: Partial<Finding> = {}): Finding => ({ file: 'a.py', line: 3, severity: 'major', category: 'bug', title: 't', body: 'b', source: 'llm', fingerprint: 'aaaaaaaa11111111', ...over });
const stored = (over: Partial<StoredFinding> = {}): StoredFinding => ({ ...finding(), id: 'aaaaaaaa', status: 'open', snippet: 'x = 1', ...over });

test('stateDir lives in the git dir (also for linked worktrees) and is null outside git', () => {
  const dir = repo();
  assert.equal(stateDir(dir), path.join(dir, '.git', 'codewolf'));
  const g = (...a: string[]) => assert.equal(spawnSync('git', ['-c', 'user.email=t@e', '-c', 'user.name=t', ...a], { cwd: dir, encoding: 'utf8' }).status, 0);
  writeFileSync(path.join(dir, 'f.txt'), 'x\n');
  g('add', 'f.txt'); g('commit', '-q', '-m', 'i');
  const wt = path.join(tmpDir(), 'wt');
  g('worktree', 'add', '-q', wt);
  assert.equal(stateDir(wt), path.join(dir, '.git', 'worktrees', 'wt', 'codewolf'));

  const lone = tmpDir();
  const before = process.env.GIT_CEILING_DIRECTORIES;
  process.env.GIT_CEILING_DIRECTORIES = path.dirname(lone); // a home-directory repo above the temp dir must not count
  try {
    assert.equal(stateDir(lone), null);
    assert.deepEqual(readStore(lone), emptyStore());
    assert.throws(() => writeStore(lone, emptyStore()), /not inside a git repository/);
  } finally {
    if (before === undefined) delete process.env.GIT_CEILING_DIRECTORIES; else process.env.GIT_CEILING_DIRECTORIES = before;
  }
});

test('store round-trips atomically, never touches the work tree, and reads corrupt files as empty', () => {
  const dir = repo();
  assert.deepEqual(readStore(dir), emptyStore(), 'missing store is empty');
  const s: FindingsStore = { version: 1, head: null, reviewedAt: '2026-10-17T00:00:00.000Z', findings: [stored()] };
  writeStore(dir, s);
  assert.deepEqual(readStore(dir), s);
  assert.deepEqual(readdirSync(path.join(dir, '.git', 'codewolf')), ['findings.json'], 'no tmp file left behind');
  assert.deepEqual(readdirSync(dir), ['.git']);
  writeFileSync(path.join(dir, '.git', 'codewolf', 'findings.json'), '{"version":1,"findings":[{"id":1}]}');
  assert.deepEqual(readStore(dir), emptyStore());
  writeFileSync(path.join(dir, '.git', 'codewolf', 'findings.json'), 'not json');
  assert.deepEqual(readStore(dir), emptyStore());
});

test('relocate finds the snippet nearest the old line, handles CRLF, and returns null when it is gone', () => {
  const f = stored({ line: 5, snippet: '  return x' });
  assert.equal(relocate(f, 'a\n  return x\nb\nc\nd\ne\n  return x\n'), 7);
  assert.equal(relocate(f, 'a\r\nb\r\n  return x\r\n'), 3);
  assert.equal(relocate(f, 'a\n    return x\n'), null, 'exact text only');
  assert.equal(relocate(stored({ line: 9, snippet: '' }), 'a\n\nb\n'), null, 'a blank snippet past the end is gone, not moved to a blank line');
  assert.equal(relocate(stored({ line: 2, snippet: '' }), 'a\n\nb\n'), 2);
});

test('mergeStore keeps ids and dismissed status, opens new ones, marks unfound open ones on re-reviewed files fixed', () => {
  const prev: FindingsStore = { version: 1, head: 'h0', reviewedAt: '', findings: [
    stored({ fingerprint: 'aaaaaaaa11111111', id: 'aaaaaaaa', status: 'dismissed' }),
    stored({ fingerprint: 'bbbbbbbb22222222', id: 'bbbbbbbb', file: 'a.py' }),
    stored({ fingerprint: 'cccccccc33333333', id: 'cccccccc', file: 'other.py' }),
    stored({ fingerprint: 'dddddddd44444444', id: 'dddddddd', status: 'fixed' }),
  ] };
  const found = [
    finding({ fingerprint: 'aaaaaaaa11111111' }),
    finding({ fingerprint: 'dddddddd44444444' }),
    finding({ fingerprint: 'eeeeeeee55555555', line: 9 }),
    finding({ fingerprint: 'aaaaaaaa99999999', title: 'collides on the short id' }),
  ];
  const next = mergeStore(prev, found, new Set(['a.py']), (f) => `line ${f.line}`, 'h1');
  const by = new Map(next.findings.map((f) => [f.fingerprint, f]));
  assert.equal(by.get('aaaaaaaa11111111')!.status, 'dismissed');
  assert.equal(by.get('dddddddd44444444')!.status, 'open', 'a fixed finding that came back is open again');
  assert.deepEqual([by.get('eeeeeeee55555555')!.status, by.get('eeeeeeee55555555')!.id, by.get('eeeeeeee55555555')!.snippet], ['open', 'eeeeeeee', 'line 9']);
  assert.equal(by.get('aaaaaaaa99999999')!.id, 'aaaaaaaa9999', 'collision extends the id to 12 chars');
  assert.equal(by.get('bbbbbbbb22222222')!.status, 'fixed');
  assert.equal(by.get('cccccccc33333333')!.status, 'open', 'file not re-reviewed: untouched');
  assert.equal(next.head, 'h1');
});

test('suppressed fingerprints accumulate without duplicates', () => {
  const dir = repo();
  assert.equal(suppressed(dir).size, 0);
  addSuppressed(dir, ['f1', 'f2'], 'false positive');
  addSuppressed(dir, ['f2', 'f3']);
  assert.deepEqual([...suppressed(dir)].sort(), ['f1', 'f2', 'f3']);
  assert.ok(existsSync(path.join(dir, '.git', 'codewolf', 'suppressed.json')));
});
