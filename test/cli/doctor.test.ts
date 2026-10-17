import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskKey } from '../../src/shared/mask.ts';
import { cleanEnv, fakeOpenAI, runCli, sendJson, startServer, tmpDir, tmpFile } from '../fixtures/helpers.ts';
import { tempRepo } from '../fixtures/repo.ts';

test('doctor prints OK/WARN lines, masks every key, pings Ollama at its base URL, exits 0 without FAIL', async () => {
  const srv = await startServer((q, _b, res) => sendJson(res, q.url === '/api/tags' ? 200 : 404, { models: [] }));
  const k1 = fakeOpenAI(), k2 = 'sk-' + 'second-key-0000aaaa1111';
  const cfg = tmpFile('cw.yaml', `providers:\n  - name: openai\n    keys: [${k1}, ${k2}]\n  - name: ollama\n    baseUrl: ${srv.url}\n`);
  const repo = tempRepo();
  const r = await runCli(['doctor', '--config', cfg], { cwd: repo });
  await srv.close();
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.ok(!r.stdout.includes(k1) && !r.stdout.includes(k2) && !r.stderr.includes(k1));
  assert.ok(r.stdout.includes(`2 key(s): ${maskKey(k1)}, ${maskKey(k2)}`), r.stdout);
  for (const re of [/^OK {3}node /m, /^OK {3}git version/m, /^OK {3}git repository/m, /^OK {3}config .*trusted: passed with --config/m, /^OK {3}ollama at http:\/\/127\.0\.0\.1:\d+ reachable/m, /^OK {3}state dir .*codewolf writable/m]) assert.match(r.stdout, re);
  assert.match(r.stdout, /^(OK|WARN) +(ruff|eslint|semgrep|gitleaks)/m);
  assert.match(r.stdout, /^(OK|WARN) +claude CLI/m);
  assert.ok(srv.log.some((l) => l.method === 'GET' && l.url === '/api/tags'));
});

test('doctor exits 1 on a FAIL (broken config) and warns outside git and for an unreachable Ollama', async () => {
  const env = cleanEnv({ OLLAMA_HOST: '127.0.0.1:1' });
  const r = await runCli(['doctor', '--config', 'missing.yaml'], { cwd: tmpDir(), env });
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stdout, /^FAIL config: config file not found/m);
  assert.match(r.stdout, /^WARN not inside a git repository/m);
  assert.match(r.stdout, /^WARN ollama not reachable at http:\/\/127\.0\.0\.1:1/m);
  assert.match(r.stdout, /^WARN state dir: unavailable/m);
});
