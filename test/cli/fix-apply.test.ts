import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readStore } from '../../src/core/store.ts';
import { whichSync } from '../../src/providers/claude-code.ts';
import { cleanEnv, runCli, tmpDir } from '../fixtures/helpers.ts';
import { fakeBin, finding, pathWith, seed, tempRepo } from '../fixtures/repo.ts';

function seeded(): string {
  const repo = tempRepo();
  seed(repo, [
    finding(),
    finding({ id: 'bbbb2222', fingerprint: 'bbbb', severity: 'nit', title: 'Name b better', snippet: 'def b():', line: 4, suggestion: undefined }),
    finding({ id: 'cccc3333', fingerprint: 'cccc', status: 'dismissed', title: 'Dismissed one' }),
  ]);
  return repo;
}

test('fix prints one prompt: --all skips nits and closed findings, --nits only nits, ids pick exactly', async () => {
  const repo = seeded();
  const all = await runCli(['fix'], { cwd: repo });
  assert.equal(all.code, 0, all.stderr);
  assert.match(all.stdout, /\[aaaa1111\] In app\.py:2, fix this major bug issue: Returns the wrong value/);
  assert.match(all.stdout, /Replace those lines with:\n {4}return 0/);
  assert.ok(!all.stdout.includes('bbbb2222') && !all.stdout.includes('cccc3333'));
  const nits = await runCli(['fix', '--nits'], { cwd: repo });
  assert.ok(nits.stdout.includes('bbbb2222') && !nits.stdout.includes('aaaa1111'));
  const one = await runCli(['fix', 'bbbb2222', '--to', 'print'], { cwd: repo });
  assert.ok(one.stdout.includes('bbbb2222'));
  assert.equal((await runCli(['fix', 'cccc3333'], { cwd: repo })).code, 2);
  assert.equal((await runCli(['fix', 'zzzz'], { cwd: repo })).code, 2);
  assert.equal((await runCli(['fix', '--to', 'emacs'], { cwd: repo })).code, 2);
  assert.equal((await runCli(['fix'], { cwd: tmpDir() })).code, 2);
});

test('fix relocates findings whose line moved before building the prompt', async () => {
  const repo = seeded();
  writeFileSync(path.join(repo, 'app.py'), '# header\n# more\ndef a():\n    return 1\n');
  const r = await runCli(['fix', 'aaaa1111'], { cwd: repo });
  assert.match(r.stdout, /In app\.py:4,/);
});

test('fix --to claude / codex sends the prompt on stdin only, with fixed argv', async () => {
  const repo = seeded();
  // a title full of shell metacharacters must reach the agent only through stdin
  seed(repo, [finding({ title: 'evil " & calc | x' })]);
  const out = path.join(tmpDir(), 'out.json');
  const bin = fakeBin('codex', fakeBin('claude'));
  for (const [to, argv] of [['claude', ['-p']], ['codex', ['exec', '-']]] as const) {
    const r = await runCli(['fix', '--to', to], { cwd: repo, env: cleanEnv({ ...pathWith(bin), FAKE_OUT: out, FAKE_STDOUT: 'agent done' }) });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, 'agent done');
    const got = JSON.parse(readFileSync(out, 'utf8')) as { args: string[]; input: string };
    assert.deepEqual(got.args, argv);
    assert.match(got.input, /evil " & calc \| x/);
  }
});

test('a failing or missing fix target falls back to printing the prompt', async () => {
  const repo = seeded();
  const out = path.join(tmpDir(), 'out.json');
  const bin = fakeBin('opencode');
  const failed = await runCli(['fix', '--to', 'opencode'], { cwd: repo, env: cleanEnv({ ...pathWith(bin), FAKE_OUT: out, FAKE_EXIT: '3' }) });
  assert.equal(failed.code, 0);
  assert.match(failed.stderr, /fix target opencode failed \(opencode exited 3\); printing/);
  assert.match(failed.stdout, /aaaa1111/);
  const gitOnly = path.dirname(whichSync('git')!); // PATH with git but surely no gemini
  const missing = await runCli(['fix', '--to', 'gemini'], { cwd: repo, env: cleanEnv({ [Object.keys(pathWith(''))[0]!]: gitOnly }) });
  assert.match(missing.stderr, /gemini not found on PATH/);
  assert.match(missing.stdout, /aaaa1111/);
});

test('apply writes the suggestion at the relocated line and marks the finding fixed; --dry-run writes nothing', async () => {
  const repo = seeded();
  const file = path.join(repo, 'app.py');
  writeFileSync(file, '# new first line\ndef a():\n    return 1\n\ndef b():\n    return 2\n');
  const dry = await runCli(['apply', 'aaaa1111', '--dry-run'], { cwd: repo });
  assert.equal(dry.code, 0, dry.stderr);
  assert.match(dry.stdout, /--- app\.py:3 \(aaaa1111\)\n- {4}return 1\n\+ {4}return 0/);
  assert.match(readFileSync(file, 'utf8'), /return 1/);
  const r = await runCli(['apply', 'aaaa1111'], { cwd: repo });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(readFileSync(file, 'utf8'), '# new first line\ndef a():\n    return 0\n\ndef b():\n    return 2\n');
  assert.equal(readStore(repo).findings.find((f) => f.id === 'aaaa1111')!.status, 'fixed');
});

test('apply keeps CRLF files CRLF and replaces a multi-line range', async () => {
  const repo = tempRepo();
  const file = path.join(repo, 'app.py');
  writeFileSync(file, 'a\r\nb\r\nc\r\nd\r\n');
  seed(repo, [finding({ snippet: 'b', line: 2, endLine: 3, suggestion: 'B\nC\nX\n' })]);
  const r = await runCli(['apply', 'aaaa1111'], { cwd: repo });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(readFileSync(file, 'utf8'), 'a\r\nB\r\nC\r\nX\r\nd\r\n');
});

test('apply refuses (exit 2, file untouched) without a suggestion, when the code changed, or for unsafe paths', async (t) => {
  const repo = tempRepo();
  const outside = path.join(tmpDir(), 'victim.py');
  writeFileSync(outside, '    return 1\n');
  const cases = [
    finding({ id: 'nosugg01', suggestion: undefined }),
    finding({ id: 'changed1', snippet: '    return 42' }),
    finding({ id: 'dotdot01', file: '../victim.py' }),
    finding({ id: 'absolut1', file: outside }),
  ];
  let linked = true;
  try { symlinkSync(outside, path.join(repo, 'link.py')); } catch { linked = false; }
  if (linked) cases.push(finding({ id: 'symlink1', file: 'link.py' }));
  else t.diagnostic('file symlinks unavailable; file symlink case skipped');
  symlinkSync(path.dirname(outside), path.join(repo, 'linkdir'), 'junction'); // a directory link works without privileges on Windows
  cases.push(finding({ id: 'dirlink1', file: 'linkdir/victim.py' }));
  seed(repo, cases);
  const before = readFileSync(path.join(repo, 'app.py'), 'utf8');
  for (const f of cases) {
    const r = await runCli(['apply', f.id], { cwd: repo });
    assert.equal(r.code, 2, `${f.id}: ${r.stderr}`);
    assert.match(r.stderr, new RegExp(`refused ${f.id}`));
  }
  assert.equal(readFileSync(path.join(repo, 'app.py'), 'utf8'), before);
  assert.equal(readFileSync(outside, 'utf8'), '    return 1\n');
  assert.ok(readStore(repo).findings.every((f) => f.status === 'open'));
});
