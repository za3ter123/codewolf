import type { DiffFile, Hunk } from '../shared/types.ts';

const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

/** Decode a git C-quoted path ("a/caf\303\251.txt"). Returns the input when it is not quoted. */
export function unquotePath(p: string): string {
  if (!(p.length >= 2 && p.startsWith('"') && p.endsWith('"'))) return p;
  const body = p.slice(1, -1);
  const bytes: number[] = [];
  const simple: Record<string, number> = { n: 10, t: 9, r: 13, '"': 34, '\\': 92, a: 7, b: 8, f: 12, v: 11 };
  for (let i = 0; i < body.length; i++) {
    const c = body[i]!;
    if (c !== '\\') { for (const b of Buffer.from(c, 'utf8')) bytes.push(b); continue; }
    const n = body[i + 1] ?? '';
    if (/[0-7]/.test(n)) {
      const oct = body.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)![0];
      bytes.push(parseInt(oct, 8));
      i += oct.length;
    } else {
      bytes.push(simple[n] ?? n.charCodeAt(0));
      i++;
    }
  }
  return Buffer.from(bytes).toString('utf8');
}

function cleanPath(raw: string, prefix: 'a/' | 'b/'): string | null {
  let p = raw.replace(/\t.*$/, '').trimEnd(); // drop timestamps / trailing tab that some tools append
  p = unquotePath(p);
  if (p === '/dev/null') return null;
  if (p.startsWith(prefix)) p = p.slice(2);
  return p;
}

/** `diff --git a/x b/y` -> [x, y]. Handles spaces when both sides are equal, and quoted paths. */
function parseGitHeader(line: string): [string, string] | null {
  const rest = line.slice('diff --git '.length);
  const quoted = rest.match(/^("(?:[^"\\]|\\.)*"|\S+) ("(?:[^"\\]|\\.)*"|\S+)$/);
  if (quoted && (quoted[1]!.startsWith('"') || quoted[2]!.startsWith('"'))) {
    return [cleanPath(quoted[1]!, 'a/') ?? '', cleanPath(quoted[2]!, 'b/') ?? ''];
  }
  if (rest.startsWith('a/') && (rest.length - 5) % 2 === 0) {
    const half = (rest.length - 5) / 2;
    const left = rest.slice(2, 2 + half);
    if (rest.slice(2 + half) === ` b/${left}`) return [left, left];
  }
  const m = rest.match(/^a\/(.+?) b\/(.+)$/);
  if (m) return [m[1]!, m[2]!];
  return null;
}

interface Building {
  file: DiffFile;
  raw: string[];
  oldNull: boolean;
  newNull: boolean;
  isNew: boolean;
  isDeleted: boolean;
  isRename: boolean;
  sawPaths: boolean;
}

function finish(b: Building): DiffFile {
  const f = b.file;
  if (b.isDeleted || b.newNull) f.status = 'deleted';
  else if (b.isNew || b.oldNull) f.status = 'added';
  else if (b.isRename || (f.oldPath !== undefined && f.oldPath !== f.path)) f.status = 'renamed';
  else f.status = 'modified';
  if (f.status === 'deleted' && f.oldPath && !f.path) f.path = f.oldPath;
  if (f.status !== 'renamed' || f.oldPath === f.path) delete f.oldPath;
  if (f.status === 'renamed' && !f.oldPath) f.status = 'modified';
  f.patch = b.raw.join('\n');
  return f;
}

/**
 * Parse a unified diff: `git diff` output (renames, new/deleted, binary, mode-only), plain `diff -u` output, or a
 * GitHub "patch" field that starts directly at `@@` (returned as one file with an empty path; see parseFilePatch).
 * CRLF input and "\ No newline at end of file" markers are handled. Never throws on malformed input.
 */
export function parseDiff(patch: string): DiffFile[] {
  const lines = patch.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  const files: DiffFile[] = [];
  let cur = null as Building | null;
  let hunk = null as Hunk | null;
  let oldLeft = 0, newLeft = 0, oldNo = 0, newNo = 0;

  const start = (): Building => {
    if (cur) files.push(finish(cur));
    hunk = null; oldLeft = 0; newLeft = 0;
    cur = { file: { path: '', status: 'modified', hunks: [], patch: '' }, raw: [], oldNull: false, newNull: false, isNew: false, isDeleted: false, isRename: false, sawPaths: false };
    return cur;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const inHunk = hunk !== null && (oldLeft > 0 || newLeft > 0);

    if (inHunk && cur && hunk) {
      const h: Hunk = hunk;
      const c = line[0];
      if (c === '+') { h.lines.push({ type: 'add', text: line.slice(1), newLine: newNo++ }); newLeft--; }
      else if (c === '-') { h.lines.push({ type: 'del', text: line.slice(1), oldLine: oldNo++ }); oldLeft--; }
      else if (c === ' ' || line === '') { h.lines.push({ type: 'ctx', text: line.slice(1), oldLine: oldNo++, newLine: newNo++ }); oldLeft--; newLeft--; }
      else if (c === '\\') { /* "\ No newline at end of file" */ }
      else { hunk = null; i--; continue; } // count mismatch: reprocess this line as a header
      (cur as Building).raw.push(line);
      continue;
    }

    if (line.startsWith('diff --git ')) {
      const b = start();
      const paths = parseGitHeader(line);
      if (paths) { b.file.oldPath = paths[0]; b.file.path = paths[1]; }
      b.raw.push(line);
      continue;
    }
    if (line.startsWith('diff --cc ') || line.startsWith('diff --combined ')) { start(); cur = null; continue; } // merge diffs: skip
    if (line.startsWith('--- ') && lines[i + 1]?.startsWith('+++ ')) {
      if (!cur || cur.sawPaths || cur.file.hunks.length > 0) start(); // plain `diff -u` output has no `diff --git` line
      const b = cur!;
      b.sawPaths = true;
      const oldP = cleanPath(line.slice(4), 'a/');
      const newP = cleanPath(lines[i + 1]!.slice(4), 'b/');
      b.oldNull = oldP === null; b.newNull = newP === null;
      if (oldP !== null) b.file.oldPath = oldP;
      if (newP !== null) b.file.path = newP;
      else if (oldP !== null) b.file.path = oldP;
      b.raw.push(line, lines[i + 1]!);
      i++;
      continue;
    }
    const hm = line.match(HUNK_RE);
    if (hm) {
      const b = cur ?? start();
      const h: Hunk = {
        oldStart: +hm[1]!, oldLines: hm[2] === undefined ? 1 : +hm[2],
        newStart: +hm[3]!, newLines: hm[4] === undefined ? 1 : +hm[4],
        lines: [],
      };
      b.file.hunks.push(h);
      hunk = h;
      oldLeft = h.oldLines; newLeft = h.newLines;
      oldNo = h.oldStart; newNo = h.newStart;
      b.raw.push(line);
      continue;
    }
    if (!cur) continue; // preamble (commit message, etc.)
    const b: Building = cur;
    b.raw.push(line);
    if (line.startsWith('new file mode')) b.isNew = true;
    else if (line.startsWith('deleted file mode')) b.isDeleted = true;
    else if (line.startsWith('rename from ')) { b.isRename = true; b.file.oldPath = unquotePath(line.slice(12)); }
    else if (line.startsWith('rename to ')) { b.isRename = true; b.file.path = unquotePath(line.slice(10)); }
    else if (line.startsWith('copy from ')) { b.isNew = true; }
    else if (line.startsWith('copy to ')) { b.file.path = unquotePath(line.slice(8)); }
    else if (line.startsWith('Binary files ') || line.startsWith('GIT binary patch')) {
      b.file.binary = true;
      const m = line.match(/^Binary files (.+) and (.+) differ$/);
      if (m) {
        const o = cleanPath(m[1]!, 'a/'), n = cleanPath(m[2]!, 'b/');
        b.oldNull = o === null; b.newNull = n === null;
        if (n !== null) b.file.path = n; else if (o !== null) b.file.path = o;
      }
    }
  }
  if (cur) files.push(finish(cur));
  // a crafted patch must not point linters or file reads outside the repository
  return files.filter((f) => (f.path !== '' || f.hunks.length > 0) && isSafePath(f.path) && (f.oldPath === undefined || isSafePath(f.oldPath)));
}

/** Relative, inside the repo: no absolute paths, drive letters, `..` segments or NUL bytes. Empty (headerless patch) is allowed. */
export function isSafePath(p: string): boolean {
  if (p === '') return true;
  if (p.includes('\0') || /^[/\\]/.test(p) || /^[a-zA-Z]:/.test(p)) return false;
  return !p.split(/[/\\]/).includes('..');
}

/** Build a DiffFile from a GitHub API file entry (`patch` starts at `@@`, path given separately). */
export function parseFilePatch(path: string, patch: string | undefined | null, status: DiffFile['status'] = 'modified', oldPath?: string): DiffFile {
  const parsed = patch ? parseDiff(patch) : [];
  const hunks = parsed.flatMap((f) => f.hunks);
  const file: DiffFile = { path, status, hunks, patch: patch ?? '' };
  if (oldPath && oldPath !== path) file.oldPath = oldPath;
  if (!patch) file.binary = true;
  return file;
}

/** New-side line numbers a review comment may target (added + context lines). */
export function commentableLines(file: DiffFile): Set<number> {
  const s = new Set<number>();
  for (const h of file.hunks) for (const l of h.lines) if (l.type !== 'del' && l.newLine !== undefined) s.add(l.newLine);
  return s;
}

/** Text of a new-side line, or undefined when the line is not in the diff. */
export function newLineText(file: DiffFile, line: number): string | undefined {
  for (const h of file.hunks) for (const l of h.lines) if (l.type !== 'del' && l.newLine === line) return l.text;
  return undefined;
}
