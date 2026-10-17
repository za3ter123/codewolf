import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseDiff } from '../../src/core/diff.ts';
import { parseEslint, parseGitleaks, parseRuff, parseSemgrep, runLinters, toolFindings } from '../../src/core/linters.ts';
import { config, tmpDir } from '../fixtures/helpers.ts';

const DIFF = ['diff --git a/pkg/mod.py b/pkg/mod.py', '--- a/pkg/mod.py', '+++ b/pkg/mod.py', '@@ -1,2 +1,3 @@', ' import os', '+import subprocess', '+x = eval(input())', ' y = 1', ''].join('\n');

test('tool output parsers map severities and categories', () => {
  const ruff = parseRuff(JSON.stringify([{ filename: '/r/pkg/mod.py', location: { row: 3 }, code: 'S307', message: 'Use of eval' }, { filename: 'a.py', location: { row: 1 }, code: 'F401', message: 'unused' }]));
  assert.deepEqual(ruff.map((h) => [h.code, h.severity, h.category]), [['S307', 'major', 'security'], ['F401', 'minor', 'bug']]);
  const es = parseEslint(JSON.stringify([{ filePath: '/r/a.js', messages: [{ line: 2, ruleId: 'no-eval', message: 'eval', severity: 2 }, { line: 3, ruleId: null, message: 'parse', severity: 2 }] }]));
  assert.deepEqual(es.map((h) => [h.line, h.category, h.severity]), [[2, 'security', 'minor']]);
  const sg = parseSemgrep(JSON.stringify({ results: [{ path: 'a.py', start: { line: 4 }, check_id: 'python.lang.security.audit.eval', extra: { message: 'eval', severity: 'ERROR' } }] }));
  assert.deepEqual([sg[0]!.severity, sg[0]!.category], ['major', 'security']);
  const gl = parseGitleaks(JSON.stringify([{ File: 'a.env', StartLine: 1, RuleID: 'generic-api-key', Description: 'Generic API Key' }]));
  assert.equal(gl[0]!.severity, 'critical');
});

test('tool findings keep only hits on added lines of changed files', () => {
  const files = parseDiff(DIFF);
  const root = path.resolve('/repo');
  const out = toolFindings('ruff', [
    { file: path.join(root, 'pkg', 'mod.py'), line: 3, code: 'S307', message: 'eval', severity: 'major', category: 'security' },
    { file: 'pkg/mod.py', line: 1, code: 'F401', message: 'context line', severity: 'minor', category: 'bug' },
    { file: 'other.py', line: 3, code: 'F401', message: 'not in diff', severity: 'minor', category: 'bug' },
  ], files, root);
  assert.equal(out.length, 1);
  assert.deepEqual([out[0]!.file, out[0]!.line, out[0]!.source], ['pkg/mod.py', 3, 'tool:ruff']);
});

test('runLinters runs a tool found on PATH and skips disabled or missing ones', async () => {
  const root = tmpDir();
  mkdirSync(path.join(root, 'pkg'));
  writeFileSync(path.join(root, 'pkg', 'mod.py'), 'import os\nimport subprocess\nx = eval(input())\ny = 1\n');
  const bin = tmpDir('cwbin-');
  const script = path.join(bin, 'fake-ruff.mjs');
  writeFileSync(script, `process.stdout.write(JSON.stringify([
    { filename: ${JSON.stringify(path.join(root, 'pkg', 'mod.py'))}, location: { row: 3 }, code: 'S307', message: 'Use of possibly insecure function eval' },
    { filename: 'pkg/mod.py', location: { row: 4 }, code: 'E501', message: 'context line, dropped' },
  ]));`);
  if (process.platform === 'win32') writeFileSync(path.join(bin, 'ruff.cmd'), `@"${process.execPath}" "${script}" %*\r\n`);
  else { writeFileSync(path.join(bin, 'ruff'), `#!/bin/sh\nexec "${process.execPath}" "${script}" "$@"\n`); chmodSync(path.join(bin, 'ruff'), 0o755); }
  const oldPath = process.env.PATH;
  process.env.PATH = bin + path.delimiter + (oldPath ?? '');
  try {
    const files = parseDiff(DIFF);
    const on = await runLinters(files, config({ root, tools: { ruff: true, eslint: false, semgrep: false, gitleaks: false } }));
    assert.equal(on.length, 1);
    assert.deepEqual([on[0]!.source, on[0]!.line, on[0]!.category], ['tool:ruff', 3, 'security']);
    const off = await runLinters(files, config({ root, tools: { ruff: false, eslint: false, semgrep: false, gitleaks: false } }));
    assert.equal(off.length, 0);
  } finally {
    process.env.PATH = oldPath;
  }
});
