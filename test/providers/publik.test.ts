import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { offerPublik } from '../../src/cli/publik.ts';
import type { OfferIO } from '../../src/cli/publik.ts';
import { ConfigError, resolveConfig } from '../../src/core/config.ts';
import { createChain } from '../../src/providers/chain.ts';
import { DISCLOSURE, credentialPath, readCredential, resolveProvider, selfTest, topUpUrlFrom402 } from '../../src/providers/publik.ts';
import type { PublikCredential } from '../../src/providers/publik.ts';
import type { ResolvedConfig } from '../../src/shared/types.ts';
import { ROOT, cleanEnv, openaiReply, provider, sendJson, startServer, tmpDir } from '../fixtures/helpers.ts';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };

// Key-shaped strings are built at runtime so the repository never contains one.
const pk = (s: string) => 'pk' + '_' + s;
const APP_TOKEN = 'pat' + '_test_app_token';

const cred = (over: Partial<PublikCredential> = {}): PublikCredential => ({
  key: pk('from_file_1234'), base_url: 'https://publikhq.com/api/v1', install_id: '0123456789abcdef', claim_url: 'https://publikhq.com/claim/x',
  claim_state: 'anonymous', add_credit_url: null, cost_sentence: 'Each review costs about a cent.', balance_micros: 0, ...over,
});

const resolve = (env: Record<string, string>, credential: PublikCredential | null = null, raw: unknown = {}, overrides = {}) =>
  resolveConfig(raw, overrides, { env, root: tmpDir(), learnings: [], publikCredential: credential, warn: () => {} });
const names = (c: ResolvedConfig) => c.providers.map((p) => p.name);

/** Point the credential path, app token and fetch at test doubles; restore everything afterwards. */
async function sandbox<T>(fetchImpl: typeof fetch, fn: (dir: string) => Promise<T>, token = APP_TOKEN): Promise<T> {
  const dir = tmpDir('cwpublik-');
  const saved = { HOME: process.env.HOME, LOCALAPPDATA: process.env.LOCALAPPDATA, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME, PUBLIK_APP_TOKEN: process.env.PUBLIK_APP_TOKEN, PUBLIK_API_KEY: process.env.PUBLIK_API_KEY };
  const realFetch = globalThis.fetch;
  Object.assign(process.env, { HOME: dir, LOCALAPPDATA: dir, XDG_CONFIG_HOME: dir });
  delete process.env.PUBLIK_API_KEY;
  process.env.PUBLIK_APP_TOKEN = token;
  globalThis.fetch = fetchImpl;
  try {
    return await fn(dir);
  } finally {
    globalThis.fetch = realFetch;
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
}

const noNetwork: typeof fetch = async () => { throw new Error('network must not be touched'); };

function installsServer(calls: { url: string; body: Record<string, unknown> }[], status = 201, reply: Record<string, unknown> = {}): typeof fetch {
  return async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body ?? '{}')) });
    const body = status === 201 ? { key: pk('minted_5678'), install_id: 'abcdef0123456789', claim_url: 'https://publikhq.com/claim/abc', claim_state: 'anonymous', balance_micros: 0, disclosure: { cost: 'A review costs about one cent.' }, ...reply } : reply;
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
}

function io(over: Partial<OfferIO> = {}): OfferIO & { out: string[]; asked: number } {
  const state = { out: [] as string[], asked: 0 };
  return Object.assign(state, {
    interactive: true,
    ask: async () => { state.asked++; return 'y'; },
    write: (t: string) => { state.out.push(t); },
    ollamaUp: async () => false,
    ...over,
  });
}

test('resolution: own keys and explicit provider config win exactly as before', () => {
  const env = { ANTHROPIC_API_KEY: 'a-own-key-123', PUBLIK_API_KEY: pk('env_1') };
  assert.deepEqual(names(resolve(env, cred())), ['anthropic', 'ollama']);
  assert.deepEqual(names(resolve({ CODEWOLF_API_KEYS: 'x-own-key-1' }, cred())), ['ollama']);
  assert.deepEqual(names(resolve({ PUBLIK_API_KEY: pk('env_1') }, cred(), { providers: ['openai'] })), ['openai']);
  assert.deepEqual(names(resolve({ PUBLIK_API_KEY: pk('env_1') }, cred(), {}, { provider: 'ollama' })), ['ollama']);
  assert.ok(!resolve(env, null).nothingConfigured);
});

test('resolution: PUBLIK_API_KEY env, then the credential file, ahead of the default Ollama', () => {
  const fromEnv = resolve({ PUBLIK_API_KEY: pk('env_1'), PUBLIK_API_BASE_URL: 'https://staging.publik.test/api/v1/' }, cred());
  assert.deepEqual(names(fromEnv), ['publik', 'ollama']);
  assert.deepEqual(fromEnv.providers[0]!.keys, [pk('env_1')]);
  assert.equal(fromEnv.providers[0]!.baseUrl, 'https://staging.publik.test/api/v1');
  assert.equal(fromEnv.providers[0]!.model, 'publik-balanced');

  const fromFile = resolve({}, cred());
  assert.deepEqual(names(fromFile), ['publik', 'ollama']);
  assert.deepEqual(fromFile.providers[0]!.keys, [pk('from_file_1234')]);
  assert.equal(fromFile.providers[0]!.baseUrl, 'https://publikhq.com/api/v1');
  assert.ok(!fromFile.nothingConfigured);
});

test('regression: with a publik credential present, any own setting gives exactly today\'s chain', () => {
  const own = 'sk-' + 'ownkey-1234';
  const cases: [Record<string, string>, unknown, Record<string, string>][] = [
    [{}, {}, { keys: own }],
    [{}, {}, { model: 'qwen2.5-coder' }],
    [{}, {}, { baseUrl: 'http://10.0.0.5:8080/v1' }],
    [{ OLLAMA_HOST: '10.0.0.5:11434' }, {}, {}],
    [{ CODEWOLF_BASE_URL: 'http://10.0.0.5:8080/v1' }, {}, {}],
    [{ CODEWOLF_API_KEYS: own }, {}, {}],
    [{ OPENAI_API_KEY: own }, {}, {}],
    [{}, { providers: ['ollama'] }, {}],
    [{}, {}, { provider: 'openai', keys: own }],
  ];
  for (const [env, raw, over] of cases) {
    const today = resolve(env, null, raw, over).providers;
    const withCred = resolve(env, cred(), raw, over).providers;
    assert.deepEqual(withCred, today, JSON.stringify({ env: Object.keys(env), over: Object.keys(over) }));
    assert.ok(withCred.every((p) => p.name !== 'publik' && !p.keys.includes(cred().key)));
  }
});

test('explicit --provider publik works; its key only ever goes to the publik base URL', () => {
  const p = resolve({}, cred(), {}, { provider: 'publik' }).providers;
  assert.deepEqual(p.map((x) => [x.name, x.baseUrl, x.keys]), [['publik', 'https://publikhq.com/api/v1', [cred().key]]]);
  const moved = resolve({}, cred(), {}, { provider: 'publik', baseUrl: 'http://10.0.0.5:8080/v1' }).providers[0]!;
  assert.deepEqual(moved.keys, []);
  const viaEnv = resolve({ CODEWOLF_BASE_URL: 'http://10.0.0.5:8080/v1' }, cred(), {}, { provider: 'publik' }).providers[0]!;
  assert.deepEqual(viaEnv.keys, []);
  const staging = resolve({ PUBLIK_API_KEY: pk('env_1'), PUBLIK_API_BASE_URL: 'https://staging.publik.test/v1' }, null, {}, { provider: 'publik' }).providers[0]!;
  assert.deepEqual([staging.baseUrl, staging.keys], ['https://staging.publik.test/v1', [pk('env_1')]]);
});

test('a malformed credential file never throws and never redirects the publik key', () => {
  const own = 'sk-' + 'ant-own-1234';
  const numeric = cred({ base_url: 5 as unknown as string });
  const mine = resolve({ ANTHROPIC_API_KEY: own }, numeric);
  assert.deepEqual(mine.providers, resolve({ ANTHROPIC_API_KEY: own }, null).providers);
  assert.equal(resolve({}, numeric).providers[0]!.baseUrl, 'https://publikhq.com/api/v1');
  for (const bad of ['http://evil.test/v1', 'https://evil.test/v1', 'http://publikhq.com/api/v1', 'https://publikhq.com.evil.test/v1', 'not a url']) {
    const p = resolve({}, cred({ base_url: bad })).providers;
    assert.deepEqual(p.map((x) => [x.name, x.baseUrl, x.keys]), [['publik', 'https://publikhq.com/api/v1', [cred().key]], ['ollama', 'http://127.0.0.1:11434', []]], bad);
  }
  for (const key of [5, null, 'sk-not-publik']) {
    const c = resolve({}, cred({ key: key as unknown as string }));
    assert.deepEqual(names(c), ['ollama']);
    assert.equal(c.nothingConfigured, true);
  }
});

test('cleanEnv isolates spawned CLIs from a real publik credential', () => {
  const env = cleanEnv();
  assert.equal(env.PUBLIK_API_KEY ?? '', '');
  const mod = pathToFileURL(path.join(ROOT, 'src', 'providers', 'publik.ts')).href;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', `const m = await import(${JSON.stringify(mod)}); console.log(m.credentialPath());`], { env, encoding: 'utf8', windowsHide: true });
  assert.equal(r.status, 0, r.stderr);
  const where = r.stdout.trim();
  assert.ok(where.startsWith(env.LOCALAPPDATA!) && env.LOCALAPPDATA !== process.env.LOCALAPPDATA, where);
  for (const real of [process.env.LOCALAPPDATA, process.env.XDG_CONFIG_HOME, process.env.HOME].filter(Boolean)) assert.ok(!where.startsWith(path.join(real!, 'publik')));
});

test('resolution: nothing configured means needs consent; any setting at all does not', () => {
  const none = resolve({}, null);
  assert.deepEqual(names(none), ['ollama']);
  assert.equal(none.nothingConfigured, true);
  assert.ok(!resolve({ OLLAMA_HOST: '127.0.0.1:11434' }, null).nothingConfigured);
  assert.ok(!resolve({}, null, {}, { model: 'qwen2.5-coder:3b' }).nothingConfigured);
  assert.ok(!resolve({}, null, { providers: ['ollama'] }).nothingConfigured);
  assert.ok(!resolve({ CODEWOLF_BASE_URL: 'http://10.0.0.5:11434' }, null).nothingConfigured);
});

test('publik takes only publik model tiers; repo config cannot send the publik key elsewhere', () => {
  assert.throws(() => resolve({ PUBLIK_API_KEY: pk('env_1') }, null, {}, { provider: 'publik', model: 'gpt-4o' }), ConfigError);
  assert.equal(resolve({}, null, {}, { provider: 'publik', model: 'publik-smart' }).providers[0]!.model, 'publik-smart');
  const hostile = resolve({}, cred(), { providers: [{ name: 'publik', baseUrl: 'https://evil.example/v1' }] });
  assert.deepEqual(hostile.providers[0]!.keys, []);
});

test('publik.ts resolveProvider: own key > env > credential file > needs_consent', async () => {
  await sandbox(noNetwork, async (dir) => {
    assert.equal(resolveProvider(null).kind, 'needs_consent');
    mkdirSync(path.dirname(credentialPath()), { recursive: true });
    assert.ok(credentialPath().startsWith(dir));
    writeFileSync(credentialPath(), JSON.stringify(cred()));
    const file = resolveProvider(null);
    assert.equal(file.kind === 'publik' && file.apiKey, pk('from_file_1234'));
    process.env.PUBLIK_API_KEY = pk('env_1');
    const env = resolveProvider(null);
    assert.equal(env.kind === 'publik' && env.apiKey, pk('env_1'));
    assert.equal(resolveProvider({ baseURL: 'https://api.openai.com/v1', apiKey: 'own' }).kind, 'own');
  });
});

test('non-interactive runs never prompt or provision', async () => {
  await sandbox(noNetwork, async () => {
    const nothing = resolve({}, null);
    const quiet = io({ interactive: false, ask: async () => { throw new Error('must not ask'); } });
    assert.equal(await offerPublik(nothing, quiet), false);
    assert.deepEqual(quiet.out, []);
    // configured, or a local Ollama answering: no offer either
    const configured = io({ ask: async () => { throw new Error('must not ask'); } });
    assert.equal(await offerPublik(resolve({ OLLAMA_HOST: 'x:1' }, null), configured), false);
    assert.equal(await offerPublik(nothing, io({ ollamaUp: async () => true, ask: async () => { throw new Error('must not ask'); } })), false);
    assert.equal(readCredential(), null);
  });
});

test('the Action bundle cannot provision; the CLI bundle can (positive control)', () => {
  const action = readFileSync(path.join(ROOT, 'dist', 'action.js'), 'utf8');
  const cli = readFileSync(path.join(ROOT, 'dist', 'cli.js'), 'utf8');
  assert.ok(cli.includes('/installs') && cli.includes('PUBLIK_SELF_TEST'));
  assert.ok(!action.includes('/installs'));
  assert.ok(!action.includes('Use publik API?'));
});

test('interactive yes: provisions with mocked fetch, writes the credential 0600, prints the first-run card', async () => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  await sandbox(installsServer(calls), async (dir) => {
    const t = io();
    assert.equal(await offerPublik(resolve({}, null), t), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.url, 'https://publikhq.com/api/v1/installs');
    assert.equal(calls[0]!.body.app_slug, 'codewolf');
    assert.equal(calls[0]!.body.app_version, pkg.version);
    const out = t.out.join('');
    assert.ok(out.startsWith(DISCLOSURE));
    assert.ok(out.includes('$0.00 · link this computer for $0.05 of free use\nA review costs about one cent.\nSign in with publik: https://publikhq.com/claim/abc\n'));
    assert.ok(!out.includes(pk('minted_5678')), 'the key is never printed');
    const file = credentialPath();
    assert.ok(file.startsWith(dir) && existsSync(file));
    if (process.platform !== 'win32') assert.equal(statSync(file).mode & 0o777, 0o600);
    assert.equal(readCredential()?.key, pk('minted_5678'));
    // the next resolve picks the file up
    assert.deepEqual(names(resolveConfig({}, {}, { root: dir, learnings: [], env: {}, publikCredential: readCredential(), warn: () => {} })), ['publik', 'ollama']);
  });
});

test('interactive no, or a failed setup: message plus how to use your own key, nothing written', async () => {
  await sandbox(noNetwork, async () => {
    const no = io({ ask: async () => 'n' });
    assert.equal(await offerPublik(resolve({}, null), no), false);
    assert.match(no.out.join(''), /To use your own key, set ANTHROPIC_API_KEY/);
  });
  await sandbox(noNetwork, async () => {
    const t = io();
    assert.equal(await offerPublik(resolve({}, null), t), false);
    assert.match(t.out.join(''), /no publik API app token[\s\S]*To use your own key/);
    assert.equal(readCredential(), null);
  }, 'not-an-app-token');
});

test('402 from publik shows error.message plus only error.top_up_url; other providers stay usable', async () => {
  assert.deepEqual(topUpUrlFrom402({ error: { message: 'Out of balance.', top_up_url: 'https://publikhq.com/top-up' } }), { message: 'Out of balance.', url: 'https://publikhq.com/top-up' });
  const pub = await startServer((_q, _b, res) => sendJson(res, 402, { error: { message: 'Out of balance.', top_up_url: 'https://publikhq.com/top-up', docs: 'https://publikhq.com/other' } }));
  const own = await startServer((_q, _b, res) => sendJson(res, 200, openaiReply('ok')));
  try {
    const only = createChain([provider({ name: 'publik', model: 'publik-balanced', baseUrl: pub.url, keys: [pk('k_402')] })], { retryDelayMs: 0 });
    await assert.rejects(only.complete({ system: 's', prompt: 'p' }), (e: Error) => {
      assert.match(e.message, /Out of balance\. https:\/\/publikhq\.com\/top-up/);
      assert.equal(e.message.match(/https?:\/\//g)?.length, 1);
      return true;
    });
    assert.equal(pub.log[0]!.url, '/chat/completions');
    const both = createChain([
      provider({ name: 'publik', model: 'publik-balanced', baseUrl: pub.url, keys: [pk('k_402')] }),
      provider({ baseUrl: `${own.url}/v1`, keys: ['own-key-1'] }),
    ], { retryDelayMs: 0 });
    assert.equal((await both.complete({ system: 's', prompt: 'p' })).provider.name, 'openai');
  } finally {
    await pub.close();
    await own.close();
  }
});

test('selfTest: ok line with slug, version and install prefix; failed line on error', async () => {
  await sandbox(installsServer([]), async () => {
    assert.equal(await selfTest(), `publik self-test: ok codewolf ${pkg.version} (install abcdef01)`);
  });
  await sandbox(installsServer([], 403, { error: { type: 'forbidden', message: 'App token revoked.' } }), async () => {
    assert.equal(await selfTest(), 'publik self-test: failed: App token revoked.');
  });
});
