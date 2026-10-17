import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDiff } from '../../src/core/diff.ts';
import { matchFile, normalizeModelOutput, parseLine, reindent, toCategory, toSeverity } from '../../src/core/normalize.ts';
import { CANNED, FIXTURE_DIFF } from '../fixtures/helpers.ts';

const files = parseDiff(FIXTURE_DIFF);

test('drops findings on lines or files outside the diff (anti-hallucination)', () => {
  const r = normalizeModelOutput(CANNED, files);
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0]!.line, 13);
  assert.equal(r.findings[0]!.source, 'llm');
  assert.equal(r.findings[0]!.effort, 'quick');
  assert.equal(r.dropped, 2);
  assert.equal(r.walkthrough[0]!.file, 'src/app.py');
});

test('matches a path by unique suffix but never guesses between two candidates', () => {
  const two = parseDiff(['--- a/a/util.py', '+++ b/a/util.py', '@@ -1 +1 @@', '-x', '+y', '--- a/b/util.py', '+++ b/b/util.py', '@@ -1 +1 @@', '-x', '+y', ''].join('\n'));
  assert.equal(matchFile('app.py', files)?.path, 'src/app.py');
  assert.equal(matchFile('./src/app.py', files)?.path, 'src/app.py');
  assert.equal(matchFile('util.py', two), undefined);
  assert.equal(matchFile('a/util.py', two)?.path, 'a/util.py');
});

test('coerces severity, category and line formats from loose model output', () => {
  assert.equal(toSeverity('HIGH'), 'major');
  assert.equal(toSeverity('blocker'), 'critical');
  assert.equal(toSeverity('whatever'), 'minor');
  assert.equal(toCategory('Error Handling'), 'bug');
  assert.equal(toCategory('perf'), 'performance');
  assert.equal(toCategory('unknown-thing'), 'maintainability');
  assert.deepEqual(parseLine('L13'), [13, undefined]);
  assert.deepEqual(parseLine('12-14'), [12, 14]);
  assert.equal(parseLine('abc'), undefined);
  assert.equal(parseLine(0), undefined);
});

test('drops an invalid endLine and the multi-line suggestion that depended on it', () => {
  const r = normalizeModelOutput({ findings: [
    { file: 'src/app.py', line: 12, endLine: 40, severity: 'minor', category: 'bug', title: 'range escapes hunk', body: 'b', suggestion: 'a\nb' },
    { file: 'src/app.py', line: 12, endLine: 14, severity: 'minor', category: 'bug', title: 'valid range', body: 'b', suggestion: '```python\n    x = 1\n    y = 2\n```' },
  ] }, files);
  assert.equal(r.findings[0]!.endLine, undefined);
  assert.equal(r.findings[0]!.suggestion, undefined); // meant for 12..40; applying it to line 12 alone would clobber code
  assert.equal(r.findings[1]!.endLine, 14);
  assert.equal(r.findings[1]!.suggestion, '    x = 1\n    y = 2');
});

test('drops no-op suggestions, keeps a valid rewrite, and keeps only sequence diagrams', () => {
  const r = normalizeModelOutput({
    diagram: '```mermaid\nsequenceDiagram\n  A->>B: call\n```',
    findings: [
      { file: 'src/app.py', line: 12, severity: 'nit', category: 'style', title: 'same text', body: 'b', suggestion: '    cur = db.cursor()' },
      { file: 'src/app.py', line: 13, severity: 'minor', category: 'performance', title: 'hot', body: 'b', rewrite: { language: 'Rust', reason: 'called per row in a 10M row loop', code: 'fn f() {}' } },
      { file: 'src/app.py', line: 14, severity: 'minor', category: 'performance', title: 'no reason', body: 'b', rewrite: { language: 'Rust', code: 'fn f() {}' } },
    ],
  }, files);
  assert.equal(r.findings[0]!.suggestion, undefined);
  assert.equal(r.findings[1]!.rewrite?.language, 'Rust');
  assert.equal(r.findings[2]!.rewrite, undefined);
  assert.match(r.diagram!, /^sequenceDiagram/);
  assert.equal(normalizeModelOutput({ diagram: 'graph TD; A-->B' }, files).diagram, undefined);
});

test('restores base indentation the model dropped from a suggestion, keeping relative indents', () => {
  const r = normalizeModelOutput({ findings: [{ file: 'src/app.py', line: 13, endLine: 14, severity: 'major', category: 'bug', title: 't', body: 'b', suggestion: 'if user_id:\n    cur.execute("q", (user_id,))' }] }, files);
  assert.equal(r.findings[0]!.suggestion, '    if user_id:\n        cur.execute("q", (user_id,))');
  assert.equal(reindent('  kept', '    orig'), '  kept');
  assert.equal(reindent('x = 1', 'top = 0'), 'x = 1');
});
