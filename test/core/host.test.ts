import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDiff } from '../../src/core/diff.ts';
import { buildPacket, ingestAnswer } from '../../src/core/host.ts';
import { CANNED, CANNED_TEXT, FIXTURE_DIFF, config } from '../fixtures/helpers.ts';

const files = parseDiff(FIXTURE_DIFF);

test('packet carries our prompt, numbered chunks, builtin scanner hits, learnings and the answer schema', async () => {
  const p = await buildPacket(files, config({
    learnings: ['Prefer early returns.'], guidelines: 'From AGENTS.md:\nNo prints.',
    review: { ...config().review, pathInstructions: [{ path: 'src/**', instructions: 'Check SQL.' }, { path: 'web/**', instructions: 'NOT HERE' }] },
  }));
  assert.equal(p.version, 1);
  assert.match(p.instructions, /You are CodeWolf/);
  assert.match(p.instructions, /Host-agent mode/);
  assert.match(p.instructions, /Check SQL\./);
  assert.doesNotMatch(p.instructions, /NOT HERE/);
  assert.deepEqual(p.chunks.map((c) => [c.id, c.files]), [['c1', ['src/app.py']]]);
  assert.match(p.chunks[0]!.diff, /  13 \+     cur\.execute/);
  assert.ok(p.builtin.some((f) => f.source === 'builtin' && f.line === 15));
  assert.deepEqual(p.learnings, ['Prefer early returns.']);
  assert.match(p.guidelines, /No prints/);
  assert.deepEqual((p.schema as { required: string[] }).required, ['findings']);
  const sup = await buildPacket(files, config(), { suppressed: new Set(p.builtin.map((f) => f.fingerprint)) });
  assert.equal(sup.builtin.length, 0, 'dismissed builtin hits are not handed to the agent');
});

test('ingest runs the answer through the review filters: unknown files dropped, off-hunk lines bucketed, builtin merged', async () => {
  const answer = { ...CANNED, findings: [...CANNED.findings, { ...CANNED.findings[0], source: 'builtin', title: 'SQL injection via f-string query' }, { file: 'src/app.py', line: 12, severity: 'nit', category: 'style', title: 'n', body: 'b' }] };
  const r = await ingestAnswer('Sure, here it is:\n```json\n' + JSON.stringify(answer) + '\n```', files, config());
  assert.deepEqual(r.provider, { name: 'host-agent', model: '' });
  assert.equal(r.summary, CANNED.summary);
  assert.ok(!r.findings.some((f) => /HALLUCINATED/.test(f.title)));
  assert.deepEqual(r.outsideDiff!.map((f) => [f.title, f.line]), [['HALLUCINATED_LINE', 999]]);
  const llm = r.findings.filter((f) => f.source === 'llm');
  assert.equal(llm.filter((f) => f.line === 13).length, 1, 'a finding cannot claim to be builtin, and duplicates collapse');
  assert.deepEqual(llm.map((f) => f.kind), ['issue', 'nitpick']);
  assert.ok(r.findings.some((f) => f.source === 'builtin' && f.line === 15));
  assert.equal(r.stats.findings, r.findings.length);
  assert.ok(r.warnings!.some((w) => /dropped 1/.test(w)));
  const sup = await ingestAnswer(CANNED_TEXT, files, config(), { suppressed: new Set(llm.map((f) => f.fingerprint)) });
  assert.ok(!sup.findings.some((f) => f.source === 'llm'), 'suppressed fingerprints are dropped');
  await assert.rejects(ingestAnswer('no json here', files, config()), /not valid JSON/);
});
