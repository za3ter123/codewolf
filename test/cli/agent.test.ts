import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectAgent } from '../../src/cli/agent.ts';
import { cleanEnv, runCli } from '../fixtures/helpers.ts';
import { noAgent } from '../fixtures/repo.ts';

test('detectAgent names the host agent from its env vars', () => {
  assert.equal(detectAgent({}, true), null);
  assert.equal(detectAgent({}, false), null);
  assert.equal(detectAgent({ CLAUDECODE: '1' }, true), 'claude');
  assert.equal(detectAgent({ CLAUDE_CODE_ENTRYPOINT: 'cli' }, true), 'claude');
  assert.equal(detectAgent({ CURSOR_AGENT: '1' }, true), 'cursor');
  assert.equal(detectAgent({ GEMINI_CLI: '1' }, true), 'gemini');
  assert.equal(detectAgent({ OPENCODE: '1' }, true), 'opencode');
  assert.equal(detectAgent({ CLAUDECODE: '' }, false), null);
});

test('detectAgent counts Codex and aider vars only off a terminal', () => {
  assert.equal(detectAgent({ CODEX_HOME: '/x' }, true), null);
  assert.equal(detectAgent({ CODEX_HOME: '/x' }, false), 'codex');
  assert.equal(detectAgent({ CODEX_SANDBOX: 'seatbelt' }, false), 'codex');
  assert.equal(detectAgent({ AIDER_MODEL: 'x' }, true), null);
  assert.equal(detectAgent({ AIDER_MODEL: 'x' }, false), 'aider');
});

test('help lists the agent commands', async () => {
  const h = await runCli(['--help'], { env: cleanEnv(noAgent()) });
  for (const w of ['codewolf fix', 'codewolf apply', 'codewolf install', 'codewolf hook', 'codewolf doctor', 'codewolf pr']) assert.ok(h.stdout.includes(w), w);
});
