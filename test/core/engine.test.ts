import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDiff } from '../../src/core/diff.ts';
import { chunkFiles, dedupe, estimateEffort, mapLimit, review } from '../../src/core/engine.ts';
import { fingerprint } from '../../src/core/fingerprint.ts';
import { createChain } from '../../src/providers/chain.ts';
import type { AdapterRequest } from '../../src/providers/adapters.ts';
import type { Finding } from '../../src/shared/types.ts';
import { CANNED, CANNED_TEXT, FIXTURE_DIFF, config, provider } from '../fixtures/helpers.ts';

/** A chain whose only provider answers through `fn`, recording every request. */
function fakeChain(fn: (req: AdapterRequest, n: number) => string | Promise<string>) {
  const calls: AdapterRequest[] = [];
  const chain = createChain([provider({ name: 'openai', model: 'fake' })], {
    retryDelayMs: 0,
    adapters: { openai: async (_p, _k, req) => { calls.push(req); return fn(req, calls.length); } },
  });
  return { chain, calls };
}

function manyFiles(n: number, linesEach = 20): string {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(`diff --git a/src/f${i}.ts b/src/f${i}.ts`, '--- a/src/f' + i + '.ts', '+++ b/src/f' + i + '.ts', `@@ -1,0 +1,${linesEach} @@`);
    for (let j = 0; j < linesEach; j++) out.push(`+export const v${j} = compute(${j}); // padding text to make the chunk larger`);
  }
  return out.join('\n') + '\n';
}

test('full review: keeps the real finding, drops hallucinations, adds builtin secret, fingerprints and agent prompts', async () => {
  const { chain, calls } = fakeChain(() => CANNED_TEXT);
  const r = await review(parseDiff(FIXTURE_DIFF), config(), { chain });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.json, true);
  assert.match(calls[0]!.prompt, /  13 \+     cur\.execute\(f"SELECT/);
  const titles = r.findings.map((f) => f.title);
  assert.ok(!titles.includes('HALLUCINATED_LINE') && !titles.includes('HALLUCINATED_FILE'));
  const llm = r.findings.find((f) => f.source === 'llm')!;
  assert.deepEqual([llm.line, llm.severity, llm.category], [13, 'critical', 'security']);
  assert.match(llm.agentPrompt!, /^Check this against the current code/);
  assert.match(llm.agentPrompt!, /src\/app\.py line 13/);
  assert.ok(r.findings.some((f) => f.source === 'builtin' && f.line === 15));
  assert.ok(r.findings.every((f) => /^[0-9a-f]{16}$/.test(f.fingerprint)));
  assert.equal(r.summary, CANNED.summary);
  assert.deepEqual(r.walkthrough, CANNED.walkthrough);
  assert.deepEqual(r.provider, { name: 'openai', model: 'fake' });
  assert.equal(r.stats.findings, r.findings.length);
  assert.equal(r.stats.bySeverity.critical, 2);
  assert.ok(r.effort.score >= 1 && r.effort.score <= 5 && r.effort.minutes > 0);
});

test('profiles: quiet keeps only critical, chill drops nits and caps minors', async () => {
  const many = { summary: 's', findings: [10, 11, 12, 13, 14, 15, 16].map((line, i) => ({ file: 'src/app.py', line, severity: ['major', 'minor', 'minor', 'minor', 'minor', 'nit', 'critical'][i], category: 'bug', title: `t${line}`, body: 'b' })) };
  const run = async (profile: 'quiet' | 'chill' | 'assertive') => {
    const { chain } = fakeChain(() => JSON.stringify(many));
    return (await review(parseDiff(FIXTURE_DIFF), config({ profile }), { chain })).findings.filter((f) => f.source === 'llm').map((f) => f.severity);
  };
  assert.deepEqual(await run('quiet'), ['critical']);
  const chill = await run('chill');
  assert.ok(!chill.includes('nit'));
  assert.equal(chill.filter((s) => s === 'minor').length, 3);
  assert.equal((await run('assertive')).length, 7);
});

test('invalid JSON gets one repair request; if that fails too the chunk warns instead of crashing', async () => {
  const fixed = fakeChain((req, n) => (n === 1 ? 'I think the code is fine but {broken' : (assert.match(req.system, /malformed/), JSON.stringify(CANNED))));
  const r1 = await review(parseDiff(FIXTURE_DIFF), config(), { chain: fixed.chain });
  assert.equal(fixed.calls.length, 2);
  assert.ok(r1.findings.some((f) => f.source === 'llm' && f.line === 13));

  const broken = fakeChain(() => 'no json here at all');
  const r2 = await review(parseDiff(FIXTURE_DIFF), config(), { chain: broken.chain });
  assert.equal(broken.calls.length, 2);
  assert.ok(r2.warnings!.some((w) => /unparseable/.test(w)));
  assert.ok(r2.findings.every((f) => f.source === 'builtin'), 'builtin scanner still runs');
});

test('large diffs are chunked under the token budget and run with the concurrency limit', async () => {
  let inFlight = 0, peak = 0;
  const { chain, calls } = fakeChain(async (req) => {
    inFlight++; peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 15));
    inFlight--;
    if (/Merge them into one summary/.test(req.prompt)) return '{"summary": "merged summary"}';
    const file = req.prompt.match(/=== (src\/f\d+\.ts)/)![1];
    return JSON.stringify({ summary: `part ${file}`, walkthrough: [{ file, change: 'adds constants' }], findings: [] });
  });
  const files = parseDiff(manyFiles(12));
  const chunks = chunkFiles(files, 600);
  assert.ok(chunks.length >= 4, `expected several chunks, got ${chunks.length}`);
  assert.ok(chunks.every((c) => c.body.length <= 600 * 4 + 100));
  const r = await review(files, config({ review: { ...config().review, maxChunkTokens: 600, concurrency: 2 } }), { chain });
  assert.equal(calls.length, chunks.length + 1, 'one call per chunk plus one summary merge');
  assert.ok(peak <= 2, `concurrency exceeded: ${peak}`);
  assert.equal(r.summary, 'merged summary');
  assert.equal(r.walkthrough.length, 12);
  assert.match(calls[0]!.prompt, /part 1 of/);
});

test('a single huge file is split by hunk and line without losing new-side numbers', () => {
  const files = parseDiff(manyFiles(1, 400));
  const chunks = chunkFiles(files, 1000);
  assert.ok(chunks.length > 1);
  const lines = chunks.flatMap((c) => c.files.flatMap((f) => f.hunks.flatMap((h) => h.lines.map((l) => l.newLine))));
  assert.equal(lines.length, 400);
  assert.equal(lines[0], 1);
  assert.equal(lines[399], 400);
  assert.match(chunks[1]!.body, /\(part 2 of \d+\)/);
});

test('excluded, binary and deleted files never reach the model; empty diffs make no calls', async () => {
  const diff = [
    'diff --git a/package-lock.json b/package-lock.json', '--- a/package-lock.json', '+++ b/package-lock.json', '@@ -1 +1 @@', '-{}', '+{"a":1}',
    'diff --git a/gone.py b/gone.py', 'deleted file mode 100644', '--- a/gone.py', '+++ /dev/null', '@@ -1 +0,0 @@', '-x',
    'diff --git a/logo.png b/logo.png', 'Binary files a/logo.png and b/logo.png differ', '',
  ].join('\n');
  const { chain, calls } = fakeChain(() => CANNED_TEXT);
  const r = await review(parseDiff(diff), config(), { chain });
  assert.equal(calls.length, 0);
  assert.equal(r.findings.length, 0);
  assert.equal(r.summary, 'No reviewable changes.');
  assert.deepEqual(r.walkthrough.map((w) => w.file), ['gone.py']);
  const empty = await review([], config(), { chain });
  assert.equal(empty.stats.files, 0);
  assert.equal(calls.length, 0);
});

test('learnings, guidelines and matching path instructions are injected into the prompt', async () => {
  const { chain, calls } = fakeChain(() => '{"summary":"s","findings":[]}');
  await review(parseDiff(FIXTURE_DIFF), config({
    learnings: ['Prefer parameterized queries everywhere.'],
    guidelines: 'From AGENTS.md:\nNo print statements.',
    review: { ...config().review, pathInstructions: [{ path: 'src/**/*.py', instructions: 'Check SQL safety.' }, { path: 'web/**', instructions: 'NOT FOR THIS FILE' }] },
  }), { chain });
  const p = calls[0]!.prompt;
  assert.match(p, /- Prefer parameterized queries everywhere\./);
  assert.match(p, /No print statements\./);
  assert.match(p, /Check SQL safety\./);
  assert.doesNotMatch(p, /NOT FOR THIS FILE/);
  assert.match(calls[0]!.system, /Profile ASSERTIVE/);
});

test('chain exhaustion fails the review instead of returning a clean-looking result', async () => {
  const chain = createChain([provider({ keys: ['only-key-123456'] })], {
    retryDelayMs: 0,
    adapters: { openai: async () => { const { ProviderError } = await import('../../src/providers/http.ts'); throw new ProviderError('HTTP 401: bad', 'auth', 401); } },
  });
  await assert.rejects(review(parseDiff(FIXTURE_DIFF), config(), { chain }), /all providers failed.*openai/);
});

test('dedupe keeps the most severe copy and drops model findings that repeat a builtin secret hit', () => {
  const base = { file: 'a.py', line: 3, category: 'security', title: 'x', body: 'b', source: 'llm', fingerprint: 'f1' } as const;
  const out = dedupe([
    { ...base, severity: 'minor' },
    { ...base, severity: 'major' },
    { ...base, fingerprint: 'f2', title: 'Hardcoded AWS key', severity: 'critical', source: 'builtin' },
    { ...base, fingerprint: 'f3', title: 'Secret committed to source', severity: 'major' },
    { ...base, fingerprint: 'f4', line: 4, title: 'Unrelated', severity: 'nit', category: 'style' },
  ] as Finding[]);
  assert.deepEqual(out.map((f) => `${f.fingerprint}:${f.severity}`), ['f1:major', 'f2:critical', 'f4:nit']);
});

test('fingerprints survive line shifts but change with file or title; helpers behave', async () => {
  assert.equal(fingerprint('a.py', 'SQL Injection!', '  x = 1'), fingerprint('a.py', 'sql injection', 'x  =  1'));
  assert.notEqual(fingerprint('a.py', 't', 'x'), fingerprint('b.py', 't', 'x'));
  assert.deepEqual(await mapLimit([3, 1, 2], 2, async (n) => n * 2), [6, 2, 4]);
  const small = estimateEffort(parseDiff(FIXTURE_DIFF), []);
  const big = estimateEffort(parseDiff(manyFiles(30, 60)), []);
  assert.ok(small.score < big.score && big.score <= 5);
});

test('megabyte-long lines are truncated in the prompt but stay commentable', async () => {
  const diff = ['--- a/gen.js', '+++ b/gen.js', '@@ -1 +1 @@', '-a', '+' + 'q'.repeat(500_000), ''].join('\n');
  const { chain, calls } = fakeChain(() => '{"summary":"s","findings":[{"file":"gen.js","line":1,"severity":"minor","category":"maintainability","title":"generated code committed","body":"b"}]}');
  const r = await review(parseDiff(diff), config(), { chain });
  assert.ok(calls[0]!.prompt.length < 10_000, `prompt too big: ${calls[0]!.prompt.length}`);
  assert.match(calls[0]!.prompt, /more chars\]/);
  assert.equal(r.findings[0]!.line, 1);
});
