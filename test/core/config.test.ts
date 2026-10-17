import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ConfigError, findConfigFile, loadConfig, resolveConfig } from '../../src/core/config.ts';
import { appendLearning, readGuidelines, readLearnings } from '../../src/core/learnings.ts';
import { redact } from '../../src/shared/mask.ts';
import { tmpDir } from '../fixtures/helpers.ts';

const noEnv = {};

test('defaults: chill profile, failOn none, auto chain ends in local ollama', () => {
  const c = resolveConfig({}, {}, { env: noEnv, root: tmpDir(), learnings: [] });
  assert.equal(c.profile, 'chill');
  assert.equal(c.review.failOn, 'none');
  assert.equal(c.review.concurrency, 4);
  assert.deepEqual(c.providers.map((p) => p.name), ['ollama']);
  assert.equal(c.providers[0]!.baseUrl, 'http://127.0.0.1:11434');
  const withKeys = resolveConfig({}, {}, { env: { ANTHROPIC_API_KEYS: 'a1,a2', GEMINI_API_KEY: 'g1' }, root: tmpDir(), learnings: [] });
  assert.deepEqual(withKeys.providers.map((p) => p.name), ['anthropic', 'gemini', 'ollama']);
  assert.deepEqual(withKeys.providers[0]!.keys, ['a1', 'a2']);
});

test('env:NAME keys expand comma and newline lists, and are registered for redaction', () => {
  const c = resolveConfig({ providers: [{ name: 'anthropic', keys: ['env:MY_KEYS', 'literal-key-0001'] }] }, {}, { env: { MY_KEYS: 'first-key-aaaa\nsecond-key-bbbb, ' }, root: tmpDir(), learnings: [], trusted: true });
  assert.deepEqual(c.providers[0]!.keys, ['first-key-aaaa', 'second-key-bbbb', 'literal-key-0001']);
  assert.equal(redact('oops first-key-aaaa leaked'), 'oops first-...aaaa leaked');
});

test('CLI overrides: --provider replaces the chain and keeps matching config; --keys and --model apply to it', () => {
  const raw = { providers: [{ name: 'anthropic', keys: ['a'] }, { name: 'openai', baseUrl: 'http://x/v1', model: 'cfg-model' }] };
  const c = resolveConfig(raw, { provider: 'openai', keys: 'k1,k2' }, { env: noEnv, root: tmpDir(), learnings: [], trusted: true });
  assert.equal(c.providers.length, 1);
  assert.deepEqual([c.providers[0]!.name, c.providers[0]!.baseUrl, c.providers[0]!.model], ['openai', 'http://x/v1', 'cfg-model']);
  assert.deepEqual(c.providers[0]!.keys, ['k1', 'k2']);
  const m = resolveConfig(raw, { model: 'override', profile: 'assertive', failOn: 'major' }, { env: noEnv, root: tmpDir(), learnings: [] });
  assert.equal(m.providers[0]!.model, 'override');
  assert.equal(m.profile, 'assertive');
  assert.equal(m.review.failOn, 'major');
});

test('OpenAI env keys are never sent to a third-party base URL; openrouter alias works', () => {
  const env = { OPENAI_API_KEY: 'oa-secret-key-1', OPENROUTER_API_KEY: 'or-key-1' };
  const third = resolveConfig({ providers: [{ name: 'openai', baseUrl: 'https://api.groq.com/openai/v1' }] }, {}, { env, root: tmpDir(), learnings: [] });
  assert.deepEqual(third.providers[0]!.keys, []);
  const official = resolveConfig({ providers: ['openai'] }, {}, { env, root: tmpDir(), learnings: [] });
  assert.deepEqual(official.providers[0]!.keys, ['oa-secret-key-1']);
  const or = resolveConfig({ providers: [{ name: 'openrouter' }] }, {}, { env, root: tmpDir(), learnings: [] });
  assert.equal(or.providers[0]!.baseUrl, 'https://openrouter.ai/api/v1');
  assert.equal(or.providers[0]!.model, 'qwen/qwen3-coder');
  assert.deepEqual(or.providers[0]!.keys, ['or-key-1']);
});

test('rejects invalid values with a ConfigError naming the field', () => {
  const opts = { env: noEnv, root: tmpDir(), learnings: [] };
  assert.throws(() => resolveConfig({ profile: 'loud' }, {}, opts), (e: Error) => e instanceof ConfigError && /profile/.test(e.message));
  assert.throws(() => resolveConfig({ providers: [{ name: 'bard' }] }, {}, opts), /unknown provider/);
  assert.throws(() => resolveConfig({ review: { failOn: 'apocalyptic' } }, {}, opts), /failOn/);
  assert.throws(() => resolveConfig({ providers: 'anthropic' }, {}, opts), /providers must be a list/);
  assert.equal(resolveConfig({ profile: 'quiet' }, {}, opts).profile, 'quiet');
});

test('path excludes add to defaults, pathInstructions and tools parse', () => {
  const c = resolveConfig({
    review: { exclude: ['generated/**'], pathInstructions: [{ path: 'src/api/**', instructions: 'Check authz.' }], guidelines: false },
    tools: { ruff: false },
  }, {}, { env: noEnv, root: tmpDir(), learnings: [] });
  assert.ok(c.review.exclude.includes('generated/**'));
  assert.ok(c.review.exclude.includes('**/package-lock.json'));
  assert.deepEqual(c.review.pathInstructions, [{ path: 'src/api/**', instructions: 'Check authz.' }]);
  assert.equal(c.tools.ruff, false);
  assert.equal(c.tools.eslint, true);
  assert.equal(c.review.guidelines, false);
  assert.equal(resolveConfig({ tools: false }, {}, { env: noEnv, root: tmpDir(), learnings: [] }).tools.gitleaks, false);
});

test('discovers .codewolf.yaml upward from cwd and reads learnings from the root', () => {
  const root = tmpDir();
  const deep = path.join(root, 'a', 'b', 'c');
  mkdirSync(deep, { recursive: true });
  writeFileSync(path.join(root, '.codewolf.yaml'), 'profile: assertive\nproviders:\n  - name: ollama\n    model: tiny\n');
  appendLearning(root, 'Prefer early returns.');
  appendLearning(root, 'We use tabs\nnot spaces');
  assert.equal(findConfigFile(deep), path.join(root, '.codewolf.yaml'));
  const c = loadConfig({ cwd: deep, env: noEnv, root });
  assert.equal(c.profile, 'assertive');
  assert.equal(c.providers[0]!.model, 'tiny');
  assert.deepEqual(c.learnings, ['Prefer early returns.', 'We use tabs not spaces']);
  assert.deepEqual(readLearnings(root), c.learnings);
  assert.throws(() => loadConfig({ cwd: deep, configPath: 'missing.yaml', env: noEnv }), /not found/);
  writeFileSync(path.join(root, 'bad.yaml'), 'profile: [unclosed');
  assert.throws(() => loadConfig({ cwd: root, configPath: 'bad.yaml', env: noEnv }), /invalid YAML/);
});

test('guidelines files are concatenated and capped near 4k chars', () => {
  const root = tmpDir();
  writeFileSync(path.join(root, 'CLAUDE.md'), '# Rules\nNever log tokens.\n');
  mkdirSync(path.join(root, '.github'));
  writeFileSync(path.join(root, '.github', 'copilot-instructions.md'), 'x'.repeat(10_000));
  const g = readGuidelines(root);
  assert.match(g, /From CLAUDE\.md:\n# Rules\nNever log tokens\./);
  assert.match(g, /copilot-instructions/);
  assert.ok(g.length <= 4100, `too long: ${g.length}`);
  const c = resolveConfig({}, {}, { env: noEnv, root, learnings: [] });
  assert.match(c.guidelines, /Never log tokens/);
  assert.equal(resolveConfig({ review: { guidelines: false } }, {}, { env: noEnv, root, learnings: [] }).guidelines, '');
});

test('untrusted repo config: env keys and env refs never reach a repo-chosen base URL; literal keys stay', () => {
  const env = { ANTHROPIC_API_KEY: 'real-anthropic-key-1', GEMINI_API_KEY: 'real-gemini-key-1', UNRELATED: 'unrelated-token-1' };
  const raw = { providers: [
    { name: 'anthropic', baseUrl: 'http://127.0.0.1:18777' },
    { name: 'gemini', baseUrl: 'http://evil.example' },
    { name: 'openai', baseUrl: 'http://127.0.0.1:18777/v1', keys: ['env:UNRELATED', 'repo-literal-key'] },
    { name: 'anthropic' },
    { name: 'anthropic', baseUrl: 'https://api.anthropic.com' },
  ] };
  const warnings: string[] = [];
  const c = resolveConfig(raw, {}, { env, root: tmpDir(), learnings: [], warn: (m) => warnings.push(m) });
  assert.deepEqual(c.providers.map((p) => p.keys), [[], [], ['repo-literal-key'], ['real-anthropic-key-1'], ['real-anthropic-key-1']]);
  assert.ok(warnings.some((w) => /providers\[0\]: not sending API keys from the environment to http:\/\/127\.0\.0\.1:18777/.test(w)));
  assert.ok(warnings.some((w) => /ignoring env:UNRELATED/.test(w)));
  const trusted = resolveConfig(raw, {}, { env, root: tmpDir(), learnings: [], trusted: true, warn: () => {} });
  assert.deepEqual(trusted.providers[0]!.keys, ['real-anthropic-key-1']);
  assert.deepEqual(trusted.providers[2]!.keys, ['unrelated-token-1', 'repo-literal-key']);
});

test('--keys go to a repo base URL only when the user also chose the base URL (CLI or CODEWOLF_BASE_URL)', () => {
  const raw = { providers: [{ name: 'anthropic', baseUrl: 'http://127.0.0.1:18777' }] };
  const quiet = { root: tmpDir(), learnings: [], warn: () => {} };
  assert.deepEqual(resolveConfig(raw, { provider: 'anthropic', keys: 'cli-key-12345' }, { ...quiet, env: {} }).providers[0]!.keys, []);
  const viaFlag = resolveConfig(raw, { keys: 'cli-key-12345', baseUrl: 'http://127.0.0.1:9999' }, { ...quiet, env: {} });
  assert.deepEqual([viaFlag.providers[0]!.baseUrl, viaFlag.providers[0]!.keys], ['http://127.0.0.1:9999', ['cli-key-12345']]);
  const viaEnv = resolveConfig(raw, {}, { ...quiet, env: { CODEWOLF_BASE_URL: 'http://proxy.local', ANTHROPIC_API_KEY: 'env-key-123456' } });
  assert.deepEqual([viaEnv.providers[0]!.baseUrl, viaEnv.providers[0]!.keys], ['http://proxy.local', ['env-key-123456']]);
});

test('claude-code command never comes from a config file, only CODEWOLF_CLAUDE_BIN or --claude-bin', () => {
  const warnings: string[] = [];
  const raw = { providers: [{ name: 'claude-code', command: './pwn.js' }] };
  const none = resolveConfig(raw, {}, { env: {}, root: tmpDir(), learnings: [], trusted: true, warn: (m) => warnings.push(m) });
  assert.equal(none.providers[0]!.command, undefined);
  assert.ok(warnings.some((w) => /ignoring "command"/.test(w)));
  assert.equal(resolveConfig(raw, {}, { env: { CODEWOLF_CLAUDE_BIN: '/opt/claude' }, root: tmpDir(), learnings: [], warn: () => {} }).providers[0]!.command, '/opt/claude');
  assert.equal(resolveConfig(raw, { claudeBin: 'C:/tools/claude.exe' }, { env: { CODEWOLF_CLAUDE_BIN: '/opt/claude' }, root: tmpDir(), learnings: [], warn: () => {} }).providers[0]!.command, 'C:/tools/claude.exe');
});
