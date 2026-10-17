// `codewolf install`: drop CodeWolf's command/skill text into coding agents. Prints a plan; writes only with --yes.
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { detectAgent } from './agent.ts';
import { repoRoot } from './git.ts';

export const MANAGED = 'codewolf:managed';
const MD_MARK = `<!-- ${MANAGED}: written by codewolf install. Delete this line to keep your own edits safe from reinstalls. -->`;

const DESCRIPTION = 'Review local changes with the CodeWolf AI code reviewer, fix critical and major findings, and report what is left.';

const STEPS = `# CodeWolf review loop

CodeWolf reviews a git diff and reports findings with a severity, a category and often a ready replacement.

1. Run \`codewolf review --format plain\` plus any flags the user gave (\`--staged\`, \`--base main\`, \`--committed\`).
   When \`codewolf\` is not installed use \`npx -y github:za3ter123/codewolf\` in its place.
   Exit 0 or 1 means the review ran. Exit 2 means CodeWolf failed: show its stderr and stop.
2. No provider configured (no API key, no Ollama, no claude CLI)? You are the reviewer instead:
   run \`codewolf packet\` (same scope flags), follow its \`instructions\` on its \`chunks\`, write your answer
   as JSON matching its \`schema\` to a temporary file outside the repository, then run
   \`codewolf ingest <that file>\` with the same scope flags. It checks, filters and stores your findings.
3. Each finding block starts with \`file:line\`, the severity and the title, then the explanation,
   then an optional \`suggestion:\` holding replacement text for that line range.
4. Fix every \`critical\` and \`major\` finding after confirming it in the code. Useful helpers:
   \`codewolf findings\` lists stored findings with ids, \`codewolf apply <id>\` writes a finding's suggestion,
   \`codewolf dismiss <id> --reason "<why>"\` silences a false positive in future reviews.
5. Review again. Stop when no critical or major finding is left, or after 3 rounds.
6. Report: each fix as \`file:line\` and one sentence, the findings you dismissed and why, and the minor
   and nit findings you left, one line each.

Findings come from a model and can be wrong, so verify before editing. Never put API keys in a command line.
`;

const skill = (): string => `---
name: codewolf
description: ${DESCRIPTION} Use before a commit or pull request, after a large edit, or when asked for a review or security check.
---

${MD_MARK}

${STEPS}`;

export interface AgentTarget {
  /** Agent config dir for --user; null when the agent only reads project files. */
  user: (env: NodeJS.ProcessEnv) => string | null;
  /** Config dir name inside the repo for --project. */
  project: string;
  files: [string, () => string][];
}

export const INSTALL_AGENTS: Record<string, AgentTarget> = {
  claude: {
    project: '.claude',
    user: (env) => env.CLAUDE_CONFIG_DIR || path.join(homedir(), '.claude'),
    files: [
      ['commands/codewolf.md', () => `---\ndescription: ${DESCRIPTION}\nargument-hint: "[codewolf review flags, e.g. --staged or --base main]"\nallowed-tools: Bash(codewolf:*), Bash(npx:*), Bash(git status:*), Bash(git diff:*), Read, Edit, Write, Grep, Glob\n---\n\n${MD_MARK}\n\nExtra flags from the user (may be empty): \`$ARGUMENTS\`\n\n${STEPS}`],
      ['skills/codewolf/SKILL.md', skill],
    ],
  },
  codex: { project: '.codex', user: (env) => env.CODEX_HOME || path.join(homedir(), '.codex'), files: [['skills/codewolf/SKILL.md', skill]] },
  cursor: {
    project: '.cursor',
    user: () => null, // Cursor keeps user rules in its settings UI, not in files
    files: [['rules/codewolf.mdc', () => `---\ndescription: ${DESCRIPTION}\nglobs:\nalwaysApply: false\n---\n\n${MD_MARK}\n\n${STEPS}`]],
  },
  gemini: {
    project: '.gemini',
    user: () => path.join(homedir(), '.gemini'),
    files: [['commands/codewolf.toml', () => `# ${MANAGED}: written by codewolf install. Delete this line to keep your own edits safe from reinstalls.\ndescription = "${DESCRIPTION}"\nprompt = """\nExtra flags from the user (may be empty): {{args}}\n\n${STEPS}"""\n`]],
  },
  opencode: {
    project: '.opencode',
    user: (env) => path.join(env.XDG_CONFIG_HOME || path.join(homedir(), '.config'), 'opencode'),
    files: [['command/codewolf.md', () => `---\ndescription: ${DESCRIPTION}\n---\n\n${MD_MARK}\n\nExtra flags from the user (may be empty): $ARGUMENTS\n\n${STEPS}`]],
  },
  agents: { project: '.agents', user: () => path.join(homedir(), '.agents'), files: [['skills/codewolf/SKILL.md', skill]] },
};

/** Real path of p, resolving symlinks in the part that exists and appending the part that does not. */
function nearestReal(p: string): string {
  let dir = path.resolve(p);
  const rest: string[] = [];
  while (!existsSync(dir)) {
    const up = path.dirname(dir);
    if (up === dir) break;
    rest.unshift(path.basename(dir));
    dir = up;
  }
  return path.join(realpathSync(dir), ...rest);
}

export function inside(boundary: string, target: string): boolean {
  const r = path.relative(nearestReal(boundary), nearestReal(target));
  return !!r && r !== '..' && !r.startsWith('..' + path.sep) && !path.isAbsolute(r);
}

type Action = 'create' | 'overwrite' | 'unchanged' | 'skip (not ours, use --force)' | 'refused (outside the allowed dir)';
interface Step { file: string; content: string; action: Action }

export interface InstallOptions { all?: boolean | undefined; project?: boolean | undefined; user?: boolean | undefined; yes?: boolean | undefined; force?: boolean | undefined }

export function cmdInstall(names: string[], opts: InstallOptions, cwd: string, env: NodeJS.ProcessEnv = process.env): number {
  if (opts.project && opts.user) throw new Error('choose --project or --user, not both');
  const known = Object.keys(INSTALL_AGENTS);
  let agents = opts.all ? known : names;
  if (!agents.length) {
    const here = detectAgent(env);
    if (here && known.includes(here)) agents = [here];
    else throw new Error(`usage: codewolf install <agent...> | --all  [--project | --user] [--yes]   agents: ${known.join(', ')}`);
  }
  for (const a of agents) if (!known.includes(a)) throw new Error(`unknown agent "${a}" (one of: ${known.join(', ')})`);
  const scope = opts.user ? 'user' : 'project';
  const root = scope === 'project' ? repoRoot(cwd) : undefined;
  if (scope === 'project' && !root) throw new Error('project install needs a git repository (or use --user)');

  const steps: Step[] = [];
  for (const a of agents) {
    const t = INSTALL_AGENTS[a]!;
    const base = scope === 'user' ? t.user(env) : path.join(root!, t.project);
    if (!base) { process.stderr.write(`codewolf: ${a} has no user-level file to install; use --project\n`); continue; }
    const boundary = scope === 'user' ? base : root!; // project scope: never leave the repo, even through a symlinked config dir
    for (const [rel, make] of t.files) {
      const file = path.join(base, rel);
      const content = make();
      let action: Action;
      if (!inside(boundary, file)) action = 'refused (outside the allowed dir)';
      else if (!existsSync(file)) action = 'create';
      else {
        const cur = readFileSync(file, 'utf8');
        action = cur === content ? 'unchanged' : cur.includes(MANAGED) || opts.force ? 'overwrite' : 'skip (not ours, use --force)';
      }
      steps.push({ file, content, action });
    }
  }
  for (const s of steps) process.stdout.write(`${s.action.padEnd(10)} ${s.file}\n`);
  if (!opts.yes) { process.stdout.write('codewolf: plan only, nothing written. Re-run with --yes to install.\n'); return 0; }
  for (const s of steps) {
    if (s.action !== 'create' && s.action !== 'overwrite') continue;
    mkdirSync(path.dirname(s.file), { recursive: true });
    writeFileSync(s.file, s.content);
  }
  const blocked = steps.filter((s) => s.action.startsWith('skip') || s.action.startsWith('refused')).length;
  process.stdout.write(`codewolf: installed ${steps.filter((s) => s.action === 'create' || s.action === 'overwrite').length} file(s)${blocked ? `, ${blocked} left alone` : ''}\n`);
  return blocked ? 2 : 0;
}
