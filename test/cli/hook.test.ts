import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { hookBlock } from '../../src/cli/hook.ts';
import { spawnSync } from 'node:child_process';
import { cleanEnv, runCli } from '../fixtures/helpers.ts';
import { git, tempRepo } from '../fixtures/repo.ts';

const hookPath = (repo: string) => path.join(repo, '.git', 'hooks', 'post-commit');

test('hook install writes a backgrounded block; the commit succeeds and the review lands in the state dir', async () => {
  const repo = tempRepo();
  const st0 = await runCli(['hook', 'status'], { cwd: repo });
  assert.match(st0.stdout, /not installed/);
  const r = await runCli(['hook', 'install'], { cwd: repo });
  assert.equal(r.code, 0, r.stderr);
  const text = readFileSync(hookPath(repo), 'utf8');
  assert.match(text, /^#!\/bin\/sh\n# >>> codewolf:managed post-commit/);
  assert.match(text, /review --committed --format plain --fail-on none > '[^']*last-hook-review\.txt' 2>&1 < \/dev\/null & \)/);
  writeFileSync(path.join(repo, 'b.py'), 'x = 1\n');
  git(repo, 'add', 'b.py');
  // keyless env so the background review can never reach a real provider; the commit must still exit 0
  const c = spawnSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'second'], { cwd: repo, env: cleanEnv(), encoding: 'utf8' });
  assert.equal(c.status, 0, c.stderr);
  const out = path.join(repo, '.git', 'codewolf', 'last-hook-review.txt');
  for (let i = 0; i < 100 && !(existsSync(out) && readFileSync(out, 'utf8').includes('codewolf')); i++) await sleep(200);
  assert.match(readFileSync(out, 'utf8'), /codewolf/);
  assert.match((await runCli(['hook', 'status'], { cwd: repo })).stdout, /installed[\s\S]*last hook review/);
  await runCli(['hook', 'uninstall'], { cwd: repo });
  assert.ok(!existsSync(hookPath(repo)));
});

test('hook install chains a foreign sh hook and uninstall restores it exactly; non-shell hooks are refused', async () => {
  const repo = tempRepo();
  const foreign = '#!/bin/sh\necho foreign >> ran.txt\nexit 0\n';
  writeFileSync(hookPath(repo), foreign);
  const r = await runCli(['hook', 'install'], { cwd: repo });
  assert.match(r.stdout, /chained into existing/);
  const text = readFileSync(hookPath(repo), 'utf8');
  assert.ok(text.startsWith('#!/bin/sh\n# >>> codewolf:managed') && text.endsWith('echo foreign >> ran.txt\nexit 0\n'), text);
  await runCli(['hook', 'install'], { cwd: repo }); // idempotent
  assert.equal(readFileSync(hookPath(repo), 'utf8'), text);
  await runCli(['hook', 'uninstall'], { cwd: repo });
  assert.equal(readFileSync(hookPath(repo), 'utf8'), foreign);
  writeFileSync(hookPath(repo), '#!/usr/bin/env python3\nprint(1)\n');
  const py = await runCli(['hook', 'install'], { cwd: repo });
  assert.equal(py.code, 2);
  assert.equal(readFileSync(hookPath(repo), 'utf8'), '#!/usr/bin/env python3\nprint(1)\n');
  assert.equal((await runCli(['hook', 'bogus'], { cwd: repo })).code, 2);
});

test('hook honours core.hooksPath and quotes paths so they cannot break out of the shell line', async () => {
  const repo = tempRepo();
  git(repo, 'config', 'core.hooksPath', 'my-hooks');
  await runCli(['hook', 'install'], { cwd: repo });
  assert.ok(existsSync(path.join(repo, 'my-hooks', 'post-commit')));
  assert.equal(hookBlock("C:\\a b\\node.exe", "/x/it's $(rm -rf)/cli.js", '/o').split('\n')[1], "( 'C:/a b/node.exe' '/x/it'\\''s $(rm -rf)/cli.js' review --committed --format plain --fail-on none > '/o' 2>&1 < /dev/null & ) > /dev/null 2>&1");
});

test('hook uninstall restores a foreign hook byte for byte: CRLF line endings and runs of blank lines survive', async () => {
  for (const foreign of ['#!/bin/sh\r\necho one >> ran.txt\r\n\r\n\r\nexit 0\r\n', '#!/bin/sh\necho two\n\n\n\nexit 0\n\n\n', 'echo no shebang\n\n\n\n']) {
    const repo = tempRepo();
    writeFileSync(hookPath(repo), foreign);
    assert.equal((await runCli(['hook', 'install'], { cwd: repo })).code, 0);
    const text = readFileSync(hookPath(repo), 'utf8');
    assert.ok(text.includes(foreign.split('\n').slice(1).join('\n')) || text.endsWith(foreign), JSON.stringify(text));
    await runCli(['hook', 'install'], { cwd: repo }); // update in place
    assert.equal(readFileSync(hookPath(repo), 'utf8'), text);
    await runCli(['hook', 'uninstall'], { cwd: repo });
    assert.equal(readFileSync(hookPath(repo), 'utf8'), foreign);
  }
});
