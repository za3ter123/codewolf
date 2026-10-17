// `codewolf hook install|uninstall|status`: opt-in post-commit hook that reviews the commit in the background.
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { stateDir } from '../core/store.ts';
import { git, repoRoot } from './git.ts';

const BEGIN = '# >>> codewolf:managed post-commit (codewolf hook uninstall removes this block) >>>';
const END = '# <<< codewolf:managed post-commit <<<';
// exactly the bytes hookBlock writes, so uninstall gives back the foreign hook byte for byte
const BLOCK_RE = /# >>> codewolf:managed post-commit[^\n]*\n[\s\S]*?# <<< codewolf:managed post-commit <<<\n?/;
const CREATED = '#!/bin/sh\n';
const SH_SHEBANG = /^#!\s*\S*\b(sh|bash|dash|zsh|ksh)\b|^#!\s*\S*env\s+(sh|bash|dash|zsh|ksh)\b/;

/** Single-quote for POSIX sh: nothing inside is expanded. Forward slashes so Git for Windows' sh reads Windows paths. */
const shq = (s: string): string => `'${s.replace(/\\/g, '/').replace(/'/g, `'\\''`)}'`;

export function hookBlock(node: string, cli: string, out: string): string {
  // backgrounded, all output to the state file, stdin closed, always exit-neutral: the commit never waits or fails
  return `${BEGIN}\n( ${shq(node)} ${shq(cli)} review --committed --format plain --fail-on none > ${shq(out)} 2>&1 < /dev/null & ) > /dev/null 2>&1\n${END}\n`;
}

function hookFile(root: string): string {
  return path.join(path.resolve(root, git(['rev-parse', '--git-path', 'hooks'], root).trim()), 'post-commit');
}

export function cmdHook(sub: string | undefined, cwd: string): number {
  const root = repoRoot(cwd);
  if (!root) throw new Error('not inside a git repository');
  const file = hookFile(root);
  const cur = existsSync(file) ? readFileSync(file, 'utf8') : null;
  const ours = cur !== null && BLOCK_RE.test(cur);
  switch (sub) {
    case 'install': {
      const dir = stateDir(root);
      if (!dir) throw new Error('cannot find the git dir for hook state');
      mkdirSync(dir, { recursive: true }); // the hook's redirect needs the state dir to exist
      const block = hookBlock(process.execPath, path.resolve(process.argv[1] ?? ''), path.join(dir, 'last-hook-review.txt'));
      let next: string;
      if (cur === null) next = `${CREATED}${block}`;
      else if (ours) next = cur.replace(BLOCK_RE, () => block);
      else {
        const first = cur.split('\n', 1)[0]!.replace(/\r$/, '');
        if (first.startsWith('#!') && !SH_SHEBANG.test(first)) throw new Error(`${file} is not a shell script (${first}); add CodeWolf to it by hand`);
        // chain: keep the existing hook and put our block right after its shebang line (its own line ending kept),
        // so an `exit` in it cannot skip ours
        const nl = cur.indexOf('\n');
        next = !first.startsWith('#!') ? `${block}${cur}` : nl < 0 ? `${cur}\n${block}` : `${cur.slice(0, nl + 1)}${block}${cur.slice(nl + 1)}`;
      }
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, next);
      try { chmodSync(file, 0o755); } catch { /* Windows */ }
      process.stdout.write(`${ours ? 'updated' : cur === null ? 'installed' : 'chained into existing'} post-commit hook: ${file}\nreviews land in ${path.join(dir, 'last-hook-review.txt')}\n`);
      return 0;
    }
    case 'uninstall': {
      if (!ours) { process.stdout.write('codewolf: no CodeWolf block in the post-commit hook; nothing to remove\n'); return 0; }
      const rest = cur!.replace(BLOCK_RE, '');
      if (rest === CREATED || rest === '') unlinkSync(file); // only the file install created is left
      else writeFileSync(file, rest);
      process.stdout.write(`removed the CodeWolf block from ${file}\n`);
      return 0;
    }
    case 'status': {
      const state = stateDir(root);
      const last = state ? path.join(state, 'last-hook-review.txt') : null;
      process.stdout.write(`post-commit hook: ${ours ? 'installed' : cur === null ? 'not installed' : 'not installed (another hook exists; install will chain it)'}  ${file}\n`);
      if (last && existsSync(last)) process.stdout.write(`last hook review: ${last} (${statSync(last).mtime.toISOString()})\n`);
      return 0;
    }
    default:
      throw new Error('usage: codewolf hook install | uninstall | status');
  }
}
