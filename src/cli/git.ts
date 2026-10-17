// Collect diffs from git for `codewolf review`. Always run with argument arrays (no shell).
import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const MAX_UNTRACKED_BYTES = 1024 * 1024;
const BINARY_SNIFF_BYTES = 8000;
// Force a/ b/ prefixes and raw paths regardless of the user's git config (diff.noprefix, mnemonicPrefix, quotepath).
const DIFF_FLAGS = ['--no-color', '--no-ext-diff', '--no-textconv', '--find-renames', '--src-prefix=a/', '--dst-prefix=b/', '--submodule=short'];

export class GitError extends Error {
  override name = 'GitError';
}

export function git(args: string[], cwd: string): string {
  const r = spawnSync('git', ['-c', 'core.quotepath=off', ...args], { cwd, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, windowsHide: true });
  if (r.error) throw new GitError(`git not available: ${r.error.message}`);
  if (r.status !== 0) throw new GitError(`git ${args[0]} failed: ${(r.stderr || '').trim().split('\n')[0] || `exit ${r.status}`}`);
  return r.stdout;
}

function tryGit(args: string[], cwd: string): string | undefined {
  try { return git(args, cwd).trim(); } catch { return undefined; }
}

export function repoRoot(cwd: string): string | undefined {
  const top = tryGit(['rev-parse', '--show-toplevel'], cwd);
  return top ? path.resolve(top) : undefined;
}

function hasHead(cwd: string): boolean {
  return tryGit(['rev-parse', '--verify', '--quiet', 'HEAD^{commit}'], cwd) !== undefined;
}

/** origin/HEAD target, else the first of origin/main, origin/master, main, master that exists. */
export function defaultBranch(cwd: string): string {
  const sym = tryGit(['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD'], cwd);
  if (sym) return sym.replace(/^refs\/remotes\//, '');
  for (const c of ['origin/main', 'origin/master', 'main', 'master']) {
    if (tryGit(['rev-parse', '--verify', '--quiet', `${c}^{commit}`], cwd)) return c;
  }
  throw new GitError('cannot find the default branch (no origin/HEAD, main or master); use --base <ref>');
}

function mergeBase(ref: string, cwd: string): string {
  if (ref.startsWith('-')) throw new GitError(`invalid ref: ${ref}`);
  const mb = tryGit(['merge-base', ref, 'HEAD'], cwd);
  if (!mb) throw new GitError(`no merge base between ${ref} and HEAD (does the ref exist? try git fetch)`);
  return mb;
}

/** Synthesize a "new file" diff for an untracked file. Binary or huge files get a header only. */
export function untrackedPatch(root: string, rel: string): string {
  const header = `diff --git a/${rel} b/${rel}\nnew file mode 100644\n`;
  const abs = path.join(root, rel);
  let size: number;
  try {
    const st = lstatSync(abs);
    if (!st.isFile()) return ''; // symlinks (could point anywhere, e.g. ~/.ssh) and other non-regular files are never read
    size = st.size;
  } catch { return ''; }
  if (size > MAX_UNTRACKED_BYTES) return `${header}Binary files /dev/null and b/${rel} differ\n`;
  const buf = readFileSync(abs);
  if (buf.subarray(0, BINARY_SNIFF_BYTES).includes(0)) return `${header}Binary files /dev/null and b/${rel} differ\n`;
  const text = buf.toString('utf8');
  if (!text.length) return header;
  const endsWithNewline = text.endsWith('\n');
  const lines = (endsWithNewline ? text.slice(0, -1) : text).split('\n').map((l) => l.replace(/\r$/, ''));
  const body = lines.map((l) => `+${l}`).join('\n');
  return `${header}--- /dev/null\n+++ b/${rel}\n@@ -0,0 +1,${lines.length} @@\n${body}\n${endsWithNewline ? '' : '\\ No newline at end of file\n'}`;
}

function untrackedFiles(root: string): string[] {
  return git(['ls-files', '--others', '--exclude-standard', '-z'], root).split('\0').filter(Boolean);
}

export type DiffScope = { kind: 'uncommitted' } | { kind: 'staged' } | { kind: 'base'; ref: string } | { kind: 'committed' };

/** The unified diff text for a scope. Untracked text files are included where the working tree is in scope. */
export function collectDiff(scope: DiffScope, cwd: string): string {
  const root = repoRoot(cwd);
  if (!root) throw new GitError('not inside a git repository (use --diff <file> to review a patch file)');
  const head = hasHead(root);
  let tracked: string;
  let withUntracked = true;
  switch (scope.kind) {
    case 'staged':
      tracked = git(['diff', '--cached', ...DIFF_FLAGS, ...(head ? [] : [EMPTY_TREE])], root);
      withUntracked = false;
      break;
    case 'base':
      tracked = git(['diff', ...DIFF_FLAGS, mergeBase(scope.ref, root)], root);
      break;
    case 'committed': {
      if (!head) throw new GitError('no commits yet; nothing committed to review');
      tracked = git(['diff', ...DIFF_FLAGS, mergeBase(defaultBranch(root), root), 'HEAD'], root);
      withUntracked = false;
      break;
    }
    default:
      tracked = git(['diff', ...DIFF_FLAGS, head ? 'HEAD' : EMPTY_TREE], root);
  }
  if (!withUntracked) return tracked;
  const extra = untrackedFiles(root).map((f) => untrackedPatch(root, f)).filter(Boolean);
  return [tracked.replace(/\n?$/, '\n'), ...extra].join('').replace(/^\n$/, '');
}
