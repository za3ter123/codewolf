import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { createChain, ChainExhaustedError, KeyPool } from '../../src/providers/chain.ts';
import { parseClaudeOutput } from '../../src/providers/claude-code.ts';
import { parseRetryAfter, ProviderError } from '../../src/providers/http.ts';
import { maskKey, redact, registerSecret } from '../../src/shared/mask.ts';
import { openaiReply, provider, sendJson, startServer, tmpDir } from '../fixtures/helpers.ts';

const req = { system: 'sys', prompt: 'hello' };

test('round-robins across healthy keys', async () => {
  const srv = await startServer((_q, _b, res) => sendJson(res, 200, openaiReply('ok')));
  const chain = createChain([provider({ baseUrl: `${srv.url}/v1`, keys: ['k1', 'k2', 'k3'] })], { retryDelayMs: 0 });
  for (let i = 0; i < 4; i++) await chain.complete(req);
  await srv.close();
  assert.deepEqual(srv.log.map((l) => l.headers.authorization), ['Bearer k1', 'Bearer k2', 'Bearer k3', 'Bearer k1']);
  assert.equal(srv.log[0]!.url, '/v1/chat/completions');
  const body = JSON.parse(srv.log[0]!.body);
  assert.deepEqual(body.messages.map((m: { role: string }) => m.role), ['system', 'user']);
});

test('429 cools the key for retry-after seconds and rotates; the key returns after cooldown', async () => {
  let clock = 1_000_000;
  const srv = await startServer((q, _b, res) => {
    if (q.headers.authorization === 'Bearer k1' && clock < 1_000_000 + 30_000) sendJson(res, 429, { error: { message: 'slow down' } }, { 'retry-after': '30' });
    else sendJson(res, 200, openaiReply('ok'));
  });
  const warnings: string[] = [];
  const chain = createChain([provider({ baseUrl: `${srv.url}/v1`, keys: ['k1', 'k2'] })], { retryDelayMs: 0, now: () => clock, log: (_l, m) => warnings.push(m) });
  await chain.complete(req); // k1 429 -> k2
  await chain.complete(req); // k1 cooling -> k2
  clock += 31_000;
  await chain.complete(req); // k1 healthy again
  await srv.close();
  assert.deepEqual(srv.log.map((l) => l.headers.authorization), ['Bearer k1', 'Bearer k2', 'Bearer k2', 'Bearer k1']);
  assert.ok(warnings.some((w) => /rate limited, cooling 30s/.test(w)));
});

test('401/403 disable a key for the run; 5xx retries at most twice per key, then falls through', async () => {
  const a = await startServer((q, _b, res) => {
    if (q.headers['x-api-key'] === 'bad') sendJson(res, 403, { error: { message: 'forbidden' } });
    else sendJson(res, 503, { error: { message: 'overloaded' } });
  });
  const o = await startServer((_q, _b, res) => sendJson(res, 200, openaiReply('from openai')));
  const chain = createChain([
    provider({ name: 'anthropic', model: 'claude-x', baseUrl: a.url, keys: ['bad', 'flaky'] }),
    provider({ name: 'openai', baseUrl: `${o.url}/v1`, keys: ['o1'] }),
  ], { retryDelayMs: 0 });
  const r = await chain.complete(req);
  await chain.complete(req);
  await a.close(); await o.close();
  assert.equal(r.text, 'from openai');
  assert.deepEqual(r.provider, { name: 'openai', model: 'fake' });
  const keys = a.log.map((l) => l.headers['x-api-key']);
  assert.equal(keys.filter((k) => k === 'bad').length, 1, 'disabled key must not be retried, even on the next request');
  assert.equal(keys.filter((k) => k === 'flaky').length, 6, '1 try + 2 retries on each of two requests');
  assert.equal(a.log[0]!.url, '/v1/messages');
  assert.equal(a.log[0]!.headers['anthropic-version'], '2023-06-01');
});

test('exhausted chain throws one error naming every provider, with keys masked', async () => {
  const dead = await startServer((_q, _b, res) => sendJson(res, 401, { error: { message: 'invalid key' } }));
  const gone = await startServer(() => {});
  await gone.close(); // a port nobody listens on
  const key = 'sk-live-0123456789abcdefWXYZ';
  const chain = createChain([
    provider({ baseUrl: `${dead.url}/v1`, keys: [key] }),
    provider({ name: 'ollama', model: 'm', baseUrl: gone.url, keys: [] }),
  ], { retryDelayMs: 0 });
  const err = await chain.complete(req).then(() => undefined, (e: Error) => e);
  await dead.close();
  assert.ok(err instanceof ChainExhaustedError);
  assert.match(err.message, /openai \(fake\): key sk-\.\.\.WXYZ: disabled/);
  assert.match(err.message, /ollama \(m\): cannot reach/);
  assert.ok(!err.message.includes(key));
});

test('gemini and ollama adapters send the right shapes and parse replies', async () => {
  const srv = await startServer((q, _b, res) => {
    if (q.url!.includes(':generateContent')) sendJson(res, 200, { candidates: [{ content: { parts: [{ text: '{"a":' }, { text: '1}' }] } }] });
    else if (q.url === '/api/chat') sendJson(res, 200, { message: { role: 'assistant', content: '{"b":2}' }, done: true });
    else sendJson(res, 404, {});
  });
  const g = await createChain([provider({ name: 'gemini', model: 'gemini-x', baseUrl: srv.url, keys: ['gk-123456789'] })]).complete({ ...req, json: true });
  const o = await createChain([provider({ name: 'ollama', model: 'qwen:7b', baseUrl: srv.url })]).complete({ ...req, json: true });
  await srv.close();
  assert.equal(g.text, '{"a":1}');
  assert.equal(o.text, '{"b":2}');
  const gl = srv.log[0]!, ol = srv.log[1]!;
  assert.equal(gl.url, '/v1beta/models/gemini-x:generateContent');
  assert.equal(gl.headers['x-goog-api-key'], 'gk-123456789');
  assert.equal(JSON.parse(gl.body).generationConfig.responseMimeType, 'application/json');
  const ob = JSON.parse(ol.body);
  assert.deepEqual([ob.model, ob.stream, ob.format, ob.think], ['qwen:7b', false, 'json', false]);
  assert.ok(ob.options.num_ctx >= 8192);
  assert.equal(ol.headers.authorization, undefined);
});

test('timeouts abort through AbortSignal and do not retry the same key', async () => {
  const slow = await startServer(async (_q, _b, res) => { await new Promise((r) => setTimeout(r, 1500)); sendJson(res, 200, openaiReply('late')); });
  const chain = createChain([provider({ baseUrl: `${slow.url}/v1`, keys: ['only-1'], timeoutMs: 150 })], { retryDelayMs: 0 });
  const started = Date.now();
  await assert.rejects(chain.complete(req), /timed out/);
  assert.ok(Date.now() - started < 1400);
  assert.equal(slow.log.length, 1);
  const ac = new AbortController();
  const p = chain.complete({ ...req, signal: ac.signal });
  ac.abort(new Error('user cancelled'));
  await assert.rejects(p, /cancelled|aborted/);
  await slow.close();
});

test('retry-after parsing, key masking and redaction', () => {
  assert.equal(parseRetryAfter('120'), 120);
  assert.equal(parseRetryAfter(new Date(Date.now() + 10_000).toUTCString()), 10);
  assert.equal(parseRetryAfter('soon'), undefined);
  assert.equal(parseRetryAfter('999999'), 3600);
  assert.equal(maskKey('sk-deadkey-1234567890abcdef'), 'sk-...cdef');
  assert.equal(maskKey('short'), '***');
  registerSecret('very-secret-value-9876');
  assert.equal(redact('token=very-secret-value-9876;'), 'token=very-...9876;');
  assert.match(new ProviderError('echo very-secret-value-9876', 'client').message, /very-\.\.\.9876/);
  const pool = new KeyPool([]);
  assert.equal(pool.next(0)!.key, null, 'keyless providers get one null key');
});

test('claude-code provider runs a CLI and reads its JSON result', async () => {
  const dir = tmpDir();
  const fake = path.join(dir, 'fake-claude.mjs');
  writeFileSync(fake, [
    "let input = ''; process.stdin.on('data', (d) => (input += d)); process.stdin.on('end', () => {",
    "  const args = process.argv.slice(2);",
    "  const ok = args.includes('-p') && args.includes('json') && args[args.indexOf('--tools') + 1] === '' && input.includes('<reviewer_instructions>');",
    "  process.stdout.write(JSON.stringify({ type: 'result', is_error: !ok, result: ok ? 'model:' + args[args.indexOf('--model') + 1] : 'bad args ' + args.join(' ') }));",
    '});',
  ].join('\n'));
  const r = await createChain([provider({ name: 'claude-code', model: 'sonnet', baseUrl: '', command: fake })]).complete(req);
  assert.equal(r.text, 'model:sonnet');
  assert.equal(parseClaudeOutput('[{"type":"system"},{"type":"result","result":"done","is_error":false}]'), 'done');
  assert.throws(() => parseClaudeOutput('{"type":"result","is_error":true,"result":"usage limit reached"}'), (e: ProviderError) => e.kind === 'rate');
  await assert.rejects(createChain([provider({ name: 'claude-code', model: 'x', baseUrl: '', command: 'definitely-not-a-real-binary-cw' })]).complete(req), /not found on PATH/);
});
