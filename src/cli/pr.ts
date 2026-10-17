// `codewolf pr <number|url>`: read CodeWolf's own inline comments on a GitHub PR and print them as fix prompts. Read-only.
import { spawnSync } from 'node:child_process';
import { GitHub } from '../action/github.ts';
import { isBotAuthored } from '../action/render.ts';
import type { CommentLike } from '../action/render.ts';
import { resolveSpawn } from '../providers/claude-code.ts';
import { git } from './git.ts';

const NAME = /^(?!\.+$)[\w.-]+$/;
const FP_RE = /<!-- codewolf:fp:([^\s>]+) -->/;

interface PrComment extends CommentLike { path?: string; line?: number | null; original_line?: number | null; html_url?: string }

export interface PrItem { file: string; line: number | null; severity: string; category: string; title: string; prompt: string; suggestion?: string; fingerprint: string; url?: string }

/** `owner/name` and number from a PR URL, or a number plus --repo / the origin remote. */
export function parsePrRef(ref: string, repo: string | undefined, cwd: string): { owner: string; name: string; number: number } {
  const url = ref.match(/^https?:\/\/[^/]+\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  let full = repo, num = ref;
  if (url) { full = `${url[1]}/${url[2]}`; num = url[3]!; }
  if (!/^\d+$/.test(num)) throw new Error('usage: codewolf pr <number|url> [--repo owner/name] [--json]');
  if (!full) {
    let remote = '';
    try { remote = git(['remote', 'get-url', 'origin'], cwd).trim(); } catch { /* handled below */ }
    const m = remote.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    if (!m) throw new Error('cannot tell the repository; pass --repo owner/name or a PR URL');
    full = `${m[1]}/${m[2]}`;
  }
  const [owner = '', name = ''] = full.split('/');
  if (!NAME.test(owner) || !NAME.test(name) || full.split('/').length !== 2) throw new Error(`invalid repository "${full}" (expected owner/name)`);
  return { owner, name, number: Number(num) };
}

/** Our inline comments only: bot-authored and carrying a fingerprint marker, like the Action trusts them. */
export function toItems(comments: PrComment[]): PrItem[] {
  const out: PrItem[] = [];
  for (const c of comments) {
    const body = c.body ?? '';
    const fp = body.match(FP_RE)?.[1];
    if (!fp || !isBotAuthored(c)) continue;
    const [category = '', severity = ''] = (body.match(/^_([^_\n]+)_/)?.[1] ?? '').split(' · ');
    const title = body.match(/\*\*([^\n]+?)\*\*/)?.[1] ?? '';
    const prompt = body.match(/Prompt for your coding agent<\/summary>\s*(`{3,})text\n([\s\S]*?)\n\1/)?.[2]?.trim();
    const suggestion = body.match(/(`{3,})suggestion\n([\s\S]*?)\n\1/)?.[2];
    const line = c.line ?? c.original_line ?? null;
    const item: PrItem = { file: c.path ?? '', line, severity, category, title, fingerprint: fp, prompt: prompt || `In ${c.path}:${line ?? '?'}, fix: ${title}` };
    if (suggestion !== undefined) item.suggestion = suggestion;
    if (c.html_url) item.url = c.html_url;
    out.push(item);
  }
  return out;
}

async function fetchComments(owner: string, name: string, n: number, env: NodeJS.ProcessEnv): Promise<PrComment[]> {
  const token = env.GITHUB_TOKEN || env.GH_TOKEN;
  // shortcut: the API host comes from GITHUB_API_URL, not the PR URL's host; read GHE hosts from the URL if asked for
  if (token) return new GitHub(env.GITHUB_API_URL || 'https://api.github.com', token).paginate<PrComment>(`/repos/${owner}/${name}/pulls/${n}/comments`);
  let spec;
  try { spec = resolveSpawn('gh', ['api', `repos/${owner}/${name}/pulls/${n}/comments?per_page=100`, '--paginate', '--jq', '.[]']); } catch {
    throw new Error('set GITHUB_TOKEN or GH_TOKEN, or install and log in to the gh CLI');
  }
  const r = spawnSync(spec.file, spec.args, { encoding: 'utf8', windowsHide: true, windowsVerbatimArguments: spec.verbatim, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`gh api failed: ${(r.stderr || r.error?.message || '').trim().split('\n')[0]}`);
  return r.stdout.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as PrComment);
}

export async function cmdPr(ref: string | undefined, opts: { repo?: string | undefined; json?: boolean | undefined }, cwd: string, env: NodeJS.ProcessEnv = process.env): Promise<number> {
  const { owner, name, number } = parsePrRef(ref ?? '', opts.repo, cwd);
  const items = toItems(await fetchComments(owner, name, number, env));
  if (opts.json) { process.stdout.write(JSON.stringify(items, null, 2) + '\n'); return 0; }
  if (!items.length) { process.stdout.write(`codewolf: no CodeWolf review comments on ${owner}/${name}#${number}\n`); return 0; }
  const head = `Fix these CodeWolf review comments from pull request ${owner}/${name}#${number}. Check each one in the code first; skip and explain any that are wrong.`;
  const blocks = items.map((it, i) => `${i + 1}. [${[it.severity, it.category].filter(Boolean).join(' ')}] ${it.file}:${it.line ?? '?'} ${it.title}\n${it.prompt}`);
  process.stdout.write(`${head}\n\n${blocks.join('\n\n')}\n`);
  return 0;
}
