import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isExcluded, matchGlob } from '../../src/shared/glob.ts';
import { DEFAULT_EXCLUDES } from '../../src/core/config.ts';

test('glob supports **, *, ?, braces and basename patterns', () => {
  assert.ok(matchGlob('src/api/users.ts', 'src/api/**'));
  assert.ok(matchGlob('src/api/v1/deep/x.ts', 'src/**/*.ts'));
  assert.ok(matchGlob('src/x.ts', 'src/**/*.ts'));
  assert.ok(!matchGlob('lib/x.ts', 'src/**'));
  assert.ok(matchGlob('a/b/yarn.lock', '*.lock'));
  assert.ok(matchGlob('img/a.PNG'.toLowerCase(), '**/*.{png,jpg}'));
  assert.ok(matchGlob('file1.txt', 'file?.txt'));
  assert.ok(!matchGlob('src/a.ts', '*.js'));
  assert.ok(matchGlob(['src', 'win', 'path.ts'].join(String.fromCharCode(92)), 'src/**'));
});

test('default excludes cover lockfiles, dist, minified and binaries; ! re-includes', () => {
  for (const p of ['package-lock.json', 'web/yarn.lock', 'dist/cli.js', 'public/app.min.js', 'assets/logo.png', 'go.sum'])
    assert.ok(isExcluded(p, DEFAULT_EXCLUDES), p);
  for (const p of ['src/index.ts', 'README.md', 'distance.py']) assert.ok(!isExcluded(p, DEFAULT_EXCLUDES), p);
  assert.ok(!isExcluded('dist/keep.js', [...DEFAULT_EXCLUDES, '!dist/keep.js']));
});
