import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readStore, relocate, stateDir, suppressed, writeStore } from '../../src/core/store.ts';
import { tmpDir } from '../fixtures/helpers.ts';
import { finding, git, tempRepo } from '../fixtures/repo.ts';

test('stateDir lives in the git dir (worktrees too) and is null outside git', () => {
  const repo = tempRepo();
  assert.equal(stateDir(repo), path.join(repo, '.git', 'codewolf'));
  const wt = path.join(tmpDir('cwwt-'), 'wt');
  git(repo, 'worktree', 'add', '-q', wt);
  const d = stateDir(wt)!;
  assert.ok(d.startsWith(path.join(repo, '.git', 'worktrees')), d);
  assert.ok(!existsSync(path.join(wt, 'codewolf')));
  assert.equal(stateDir(tmpDir()), null);
});

test('readStore/writeStore round-trip atomically; missing or corrupt files read as empty', () => {
  const repo = tempRepo();
  assert.deepEqual(readStore(repo).findings, []);
  writeStore(repo, { version: 1, head: 'abc', reviewedAt: 't', findings: [finding()] });
  assert.equal(readStore(repo).findings[0]!.id, 'aaaa1111');
  assert.deepEqual(readFileSync(path.join(repo, '.git', 'codewolf', 'findings.json'), 'utf8').length > 0, true);
  writeFileSync(path.join(repo, '.git', 'codewolf', 'findings.json'), '{nope');
  assert.deepEqual(readStore(repo).findings, []);
  assert.throws(() => writeStore(tmpDir(), readStore(repo)), /not inside a git repository/);
});

test('relocate finds the snippet nearest its old line, null when gone', () => {
  const f = finding({ snippet: 'x = 1', line: 5 });
  assert.equal(relocate(f, 'x = 1\na\nb\nc\nd\ne\nx = 1\n'), 7);
  assert.equal(relocate(f, 'x = 1\r\na\nb\n'), 1);
  assert.equal(relocate(f, 'y = 2\n'), null);
});

test('suppressed reads fingerprints and tolerates a missing or odd file', () => {
  const repo = tempRepo();
  assert.equal(suppressed(repo).size, 0);
  const dir = stateDir(repo)!;
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'suppressed.json'), JSON.stringify({ version: 1, fingerprints: ['a', 'b', 3] }));
  assert.deepEqual([...suppressed(repo)], ['a', 'b']);
  writeFileSync(path.join(dir, 'suppressed.json'), 'garbage');
  assert.equal(suppressed(repo).size, 0);
});
