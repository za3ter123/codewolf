import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { cleanEnv, runCli, tmpDir } from '../fixtures/helpers.ts';
import { noAgent, tempRepo } from '../fixtures/repo.ts';

const CLAUDE_FILES = ['.claude/commands/codewolf.md', '.claude/skills/codewolf/SKILL.md'];

test('install without --yes prints the plan and writes nothing', async () => {
  const repo = tempRepo();
  const r = await runCli(['install', '--all'], { cwd: repo });
  assert.equal(r.code, 0, r.stderr);
  for (const rel of [...CLAUDE_FILES, '.codex/skills/codewolf/SKILL.md', '.cursor/rules/codewolf.mdc', '.gemini/commands/codewolf.toml', '.opencode/command/codewolf.md', '.agents/skills/codewolf/SKILL.md']) {
    assert.ok(r.stdout.includes(`create     ${path.join(repo, rel)}`), rel);
    assert.ok(!existsSync(path.join(repo, rel)), rel);
  }
  assert.match(r.stdout, /nothing written/);
});

test('install --yes writes managed files, reinstall is unchanged, a foreign file is kept unless --force', async () => {
  const repo = tempRepo();
  const w = await runCli(['install', 'claude', 'gemini', '--yes'], { cwd: repo });
  assert.equal(w.code, 0, w.stderr);
  const cmd = path.join(repo, CLAUDE_FILES[0]!);
  const text = readFileSync(cmd, 'utf8');
  assert.match(text, /^---\ndescription: /);
  assert.ok(text.includes('codewolf:managed') && text.includes('$ARGUMENTS') && text.includes('codewolf packet'));
  assert.match(readFileSync(path.join(repo, CLAUDE_FILES[1]!), 'utf8'), /^---\nname: codewolf\n/);
  assert.match(readFileSync(path.join(repo, '.gemini/commands/codewolf.toml'), 'utf8'), /^# codewolf:managed[^\n]*\ndescription = "[^"\n]+"\nprompt = """\n[\s\S]*\{\{args\}\}[\s\S]*"""\n$/);
  const again = await runCli(['install', 'claude', '--yes'], { cwd: repo });
  assert.match(again.stdout, /unchanged/);
  writeFileSync(cmd, 'my own command\n');
  const kept = await runCli(['install', 'claude', '--yes'], { cwd: repo });
  assert.equal(kept.code, 2);
  assert.match(kept.stdout, /skip \(not ours, use --force\)/);
  assert.equal(readFileSync(cmd, 'utf8'), 'my own command\n');
  const forced = await runCli(['install', 'claude', '--yes', '--force'], { cwd: repo });
  assert.equal(forced.code, 0, forced.stderr);
  assert.ok(readFileSync(cmd, 'utf8').includes('codewolf:managed'));
});

test('install --user writes only into the agent config dir; cursor has no user scope', async () => {
  const home = tmpDir('cwhome-');
  const env = cleanEnv({ HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: path.join(home, 'claude-cfg'), CODEX_HOME: path.join(home, 'codex-cfg') });
  const cwd = tmpDir();
  const r = await runCli(['install', 'claude', 'codex', 'agents', 'cursor', '--user', '--yes'], { cwd, env });
  assert.equal(r.code, 0, r.stderr);
  assert.ok(existsSync(path.join(home, 'claude-cfg', 'commands', 'codewolf.md')));
  assert.ok(existsSync(path.join(home, 'codex-cfg', 'skills', 'codewolf', 'SKILL.md')));
  assert.ok(existsSync(path.join(home, '.agents', 'skills', 'codewolf', 'SKILL.md')));
  assert.match(r.stderr, /cursor has no user-level file/);
  assert.deepEqual(readdirSync(cwd), []);
});

test('install refuses a symlinked config dir that leaves the repo, and rejects bad input', async () => {
  const repo = tempRepo();
  const outside = tmpDir('cwout-');
  symlinkSync(outside, path.join(repo, '.claude'), 'junction');
  const r = await runCli(['install', 'claude', '--yes'], { cwd: repo });
  assert.equal(r.code, 2);
  assert.match(r.stdout, /refused \(outside the allowed dir\)/);
  assert.deepEqual(readdirSync(outside), []);
  assert.equal((await runCli(['install', 'vim'], { cwd: repo })).code, 2);
  assert.equal((await runCli(['install', 'claude', '--user', '--project'], { cwd: repo })).code, 2);
  assert.equal((await runCli(['install'], { cwd: repo, env: cleanEnv(noAgent()) })).code, 2);
  const fresh = tempRepo();
  mkdirSync(path.join(fresh, 'sub'));
  const auto = await runCli(['install'], { cwd: path.join(fresh, 'sub'), env: cleanEnv({ CLAUDECODE: '1' }) });
  assert.match(auto.stdout, /create {5}.*commands[\\/]codewolf\.md/);
});
