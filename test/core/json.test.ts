import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closeTruncated, extractJson } from '../../src/core/json.ts';

test('extracts JSON from fences with prose around it', () => {
  const v = extractJson('Sure! Here it is:\n```json\n{"summary": "ok", "findings": []}\n```\nHope that helps.') as { summary: string };
  assert.equal(v.summary, 'ok');
});

test('extracts a bare object surrounded by prose, skipping bracketed prose', () => {
  const v = extractJson('Review [draft]: {"summary": "s", "findings": [{"line": 3}]} -- end') as { findings: unknown[] };
  assert.equal(v.findings.length, 1);
});

test('repairs trailing commas, comments, raw newlines and Python literals', () => {
  const messy = `{
    // model commentary
    "summary": "line one
line two",
    "ok": True, "none": None,
    "findings": [{"file": "a.py", "line": 1,},], /* trailing */
  }`;
  const v = extractJson(messy) as { summary: string; ok: boolean; none: null; findings: unknown[] };
  assert.equal(v.summary, 'line one\nline two');
  assert.equal(v.ok, true);
  assert.equal(v.none, null);
  assert.equal(v.findings.length, 1);
});

test('salvages truncated output by closing open strings and brackets', () => {
  const cut = '{"summary": "s", "findings": [{"file": "a.py", "line": 2, "title": "first"}, {"file": "a.py", "line": 5, "title": "seco';
  const v = extractJson(cut) as { findings: { title: string }[] };
  assert.ok(v.findings.length >= 1);
  assert.equal(v.findings[0]!.title, 'first');
  assert.doesNotThrow(() => JSON.parse(closeTruncated('{"a": [1, 2, {"b": ')));
});

test('strips <think> blocks and smart quotes; returns undefined for garbage', () => {
  const v = extractJson('<think>{"not": "this"}</think>“” {"summary": "real"}') as { summary: string };
  assert.equal(v.summary, 'real');
  assert.equal(extractJson('I could not review this diff, sorry.'), undefined);
  assert.equal(extractJson(''), undefined);
});

test('returns a top-level array as-is', () => {
  const v = extractJson('```\n[{"file": "x", "line": 1}]\n```');
  assert.ok(Array.isArray(v));
});
