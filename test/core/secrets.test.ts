import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDiff } from '../../src/core/diff.ts';
import { detectSecret, entropy, scanSecrets } from '../../src/core/secrets.ts';
import { FIXTURE_DIFF, fakeAnthropic, fakeAws, fakeGithub, fakeOpenAI, pemHeader } from '../fixtures/helpers.ts';

test('finds the AWS key on its added line as a builtin critical security finding', () => {
  const out = scanSecrets(parseDiff(FIXTURE_DIFF));
  assert.equal(out.length, 1);
  const f = out[0]!;
  assert.deepEqual([f.file, f.line, f.source, f.category, f.severity], ['src/app.py', 15, 'builtin', 'security', 'critical']);
  assert.ok(!f.body.includes(fakeAws()), 'finding body must not repeat the full secret');
  assert.equal(f.fingerprint.length, 16);
});

test('recognizes provider key shapes and tells Anthropic from OpenAI keys', () => {
  assert.equal(detectSecret(`token = "${fakeGithub()}"`)?.kind, 'GitHub token');
  assert.equal(detectSecret(`OPENAI=${fakeOpenAI()}`)?.kind, 'OpenAI API key');
  assert.equal(detectSecret(`k: ${fakeAnthropic()}`)?.kind, 'Anthropic API key');
  assert.equal(detectSecret(pemHeader())?.kind, 'private key block');
  assert.equal(detectSecret('const g = "AIza' + 'SyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q"')?.kind, 'Google API key');
});

test('generic assignments need high entropy and are not placeholders', () => {
  assert.equal(detectSecret('api_key = "q8Zr2Lx9Vb4Nm7Kt1Wp6Yd3"')?.kind, 'credential');
  assert.equal(detectSecret('password: "aaaaaaaaaaaaaaaaaaaa"'), undefined);
  assert.equal(detectSecret('api_key = "your-api-key-goes-here-123"'), undefined);
  assert.equal(detectSecret('token = "${process.env.TOKEN_VALUE_X}"'), undefined);
  assert.ok(entropy('abcdefgh') > entropy('aaaaaaab'));
});

test('only scans added lines, never removed or context lines', () => {
  const diff = ['--- a/c.env', '+++ b/c.env', '@@ -1,2 +1,2 @@', ` OLD=${fakeGithub()}`, `-GONE=${fakeAws()}`, '+SAFE=1', ''].join('\n');
  assert.equal(scanSecrets(parseDiff(diff)).length, 0);
});
