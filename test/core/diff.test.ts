import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commentableLines, isSafePath, newLineText, parseDiff, parseFilePatch } from '../../src/core/diff.ts';
import { FIXTURE_DIFF } from '../fixtures/helpers.ts';

test('parses a modified file with exact new-side line numbers', () => {
  const [f, ...rest] = parseDiff(FIXTURE_DIFF);
  assert.equal(rest.length, 0);
  assert.equal(f!.path, 'src/app.py');
  assert.equal(f!.status, 'modified');
  assert.equal(f!.oldPath, undefined);
  const h = f!.hunks[0]!;
  assert.deepEqual([h.oldStart, h.oldLines, h.newStart, h.newLines], [10, 4, 10, 7]);
  assert.deepEqual([...commentableLines(f!)].sort((a, b) => a - b), [10, 11, 12, 13, 14, 15, 16]);
  assert.match(newLineText(f!, 13)!, /f"SELECT/);
  assert.equal(h.lines.find((l) => l.type === 'del')!.oldLine, 12);
  assert.ok(f!.patch.startsWith('diff --git a/src/app.py'));
});

test('detects added and deleted files via /dev/null and mode lines', () => {
  const diff = [
    'diff --git a/new.txt b/new.txt', 'new file mode 100644', 'index 0000000..1111111', '--- /dev/null', '+++ b/new.txt', '@@ -0,0 +1,2 @@', '+one', '+two',
    'diff --git a/old.txt b/old.txt', 'deleted file mode 100644', 'index 1111111..0000000', '--- a/old.txt', '+++ /dev/null', '@@ -1,2 +0,0 @@', '-one', '-two', '',
  ].join('\n');
  const [a, d] = parseDiff(diff);
  assert.equal(a!.status, 'added');
  assert.equal(a!.path, 'new.txt');
  assert.deepEqual([...commentableLines(a!)], [1, 2]);
  assert.equal(d!.status, 'deleted');
  assert.equal(d!.path, 'old.txt');
  assert.equal(commentableLines(d!).size, 0);
});

test('handles pure renames and renames with edits', () => {
  const diff = [
    'diff --git a/a.js b/b.js', 'similarity index 100%', 'rename from a.js', 'rename to b.js',
    'diff --git a/lib/x.ts b/lib/y.ts', 'similarity index 90%', 'rename from lib/x.ts', 'rename to lib/y.ts', 'index 1..2 100644', '--- a/lib/x.ts', '+++ b/lib/y.ts', '@@ -1 +1 @@', '-a', '+b', '',
  ].join('\n');
  const [r1, r2] = parseDiff(diff);
  assert.equal(r1!.status, 'renamed');
  assert.equal(r1!.oldPath, 'a.js');
  assert.equal(r1!.path, 'b.js');
  assert.equal(r1!.hunks.length, 0);
  assert.equal(r2!.status, 'renamed');
  assert.equal(r2!.oldPath, 'lib/x.ts');
  assert.equal(r2!.path, 'lib/y.ts');
  assert.deepEqual([...commentableLines(r2!)], [1]);
});

test('GitHub patch fields that start at @@ parse headerless and via parseFilePatch', () => {
  const patch = FIXTURE_DIFF.split('\n').slice(4).join('\n');
  const [f] = parseDiff(patch);
  assert.equal(f!.path, '');
  assert.equal(f!.hunks[0]!.newLines, 7);
  const g = parseFilePatch('src/app.py', patch);
  assert.equal(g.path, 'src/app.py');
  assert.equal(g.status, 'modified');
  assert.ok(commentableLines(g).has(15));
  const bin = parseFilePatch('logo.png', undefined, 'added');
  assert.equal(bin.binary, true);
  assert.equal(bin.hunks.length, 0);
});

test('ignores "No newline at end of file" markers and keeps counts right', () => {
  const diff = ['--- a/x.txt', '+++ b/x.txt', '@@ -1,2 +1,2 @@', ' keep', '-old', '\\ No newline at end of file', '+new', '\\ No newline at end of file', ''].join('\n');
  const [f] = parseDiff(diff);
  assert.equal(f!.path, 'x.txt');
  assert.deepEqual(f!.hunks[0]!.lines.map((l) => l.type), ['ctx', 'del', 'add']);
  assert.equal(newLineText(f!, 2), 'new');
});

test('accepts CRLF line endings without leaking carriage returns', () => {
  const [f] = parseDiff(FIXTURE_DIFF.replace(/\n/g, '\r\n'));
  assert.equal(f!.path, 'src/app.py');
  assert.equal(commentableLines(f!).size, 7);
  assert.ok(f!.hunks[0]!.lines.every((l) => !l.text.includes('\r')));
});

test('marks binary files and parses their paths', () => {
  const diff = ['diff --git a/img/logo.png b/img/logo.png', 'new file mode 100644', 'index 0000000..abc', 'Binary files /dev/null and b/img/logo.png differ', ''].join('\n');
  const [f] = parseDiff(diff);
  assert.equal(f!.binary, true);
  assert.equal(f!.status, 'added');
  assert.equal(f!.path, 'img/logo.png');
});

test('removed lines that look like headers stay inside the hunk', () => {
  const diff = [
    'diff --git a/q.sql b/q.sql', '--- a/q.sql', '+++ b/q.sql', '@@ -1,3 +1,2 @@', '--- a comment', '-++ odd', '+select 1;', ' end', '',
    'diff --git a/z.txt b/z.txt', '--- a/z.txt', '+++ b/z.txt', '@@ -5,0 +6,1 @@', '+tail', '',
  ].join('\n');
  const files = parseDiff(diff);
  assert.equal(files.length, 2);
  assert.deepEqual(files[0]!.hunks[0]!.lines.map((l) => l.type), ['del', 'del', 'add', 'ctx']);
  assert.equal(files[0]!.hunks[0]!.lines[0]!.text, '-- a comment');
  assert.equal(files[1]!.path, 'z.txt');
  assert.deepEqual([...commentableLines(files[1]!)], [6]);
});

test('decodes quoted paths and paths with spaces', () => {
  const diff = [
    'diff --git "a/caf\\303\\251.txt" "b/caf\\303\\251.txt"', '--- "a/caf\\303\\251.txt"', '+++ "b/caf\\303\\251.txt"', '@@ -1 +1 @@', '-a', '+b',
    'diff --git a/my file.txt b/my file.txt', 'old mode 100644', 'new mode 100755', '',
  ].join('\n');
  const [q, s] = parseDiff(diff);
  assert.equal(q!.path, 'café.txt');
  assert.equal(s!.path, 'my file.txt');
  assert.equal(s!.status, 'modified');
  assert.equal(s!.hunks.length, 0);
});

test('parses multi-file plain `diff -u` output and multiple hunks', () => {
  const diff = [
    '--- a/one.c\t2026-01-01 00:00:00', '+++ b/one.c\t2026-01-02 00:00:00', '@@ -1,2 +1,2 @@', ' a', '-b', '+B', '@@ -10 +10,2 @@', ' j', '+k',
    '--- a/two.c', '+++ b/two.c', '@@ -3 +3 @@', '-x', '+y', '',
  ].join('\n');
  const files = parseDiff(diff);
  assert.deepEqual(files.map((f) => f.path), ['one.c', 'two.c']);
  assert.equal(files[0]!.hunks.length, 2);
  assert.deepEqual([...commentableLines(files[0]!)].sort((a, b) => a - b), [1, 2, 10, 11]);
});

test('empty or junk input yields no files and never throws', () => {
  assert.deepEqual(parseDiff(''), []);
  assert.deepEqual(parseDiff('\n\n'), []);
  assert.deepEqual(parseDiff('commit abc\nAuthor: x\n\n    message only\n'), []);
  assert.doesNotThrow(() => parseDiff('@@ -1,5 +1,5 @@\n+only one line\ndiff --git a/x b/x\n'));
});

test('skips files whose paths are absolute or escape the repository', () => {
  const mk = (p: string) => [`--- a/${p}`, `+++ b/${p}`, '@@ -1 +1 @@', '-a', '+b'].join('\n');
  const diff = [mk('ok/file.py'), mk('../outside.py'), mk('src/../../etc/passwd'), '--- /etc/shadow', '+++ /etc/shadow', '@@ -1 +1 @@', '-a', '+b', mk('C:/Windows/win.ini'), ''].join('\n');
  assert.deepEqual(parseDiff(diff).map((f) => f.path), ['ok/file.py']);
  assert.ok(isSafePath('a/b..c/d.txt'));
  assert.ok(!isSafePath(['a', '..', 'b'].join(String.fromCharCode(92))));
});
