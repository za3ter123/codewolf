// `codewolf fix`: one fix prompt from stored open findings, handed to a coding agent on stdin (never argv).
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { agentPromptFor } from '../action/render.ts';
import { relocate } from '../core/store.ts';
import type { StoredFinding } from '../core/store.ts';
import { resolveSpawn, whichSync } from '../providers/claude-code.ts';
import { detectAgent } from './agent.ts';
import { byIds, openStore, repoFile } from './apply.ts';

// Fixed argv per agent; the prompt only ever goes on stdin.
export const FIX_TARGETS: Record<string, { bin: string; args: string[] }> = {
  claude: { bin: 'claude', args: ['-p'] },
  codex: { bin: 'codex', args: ['exec', '-'] },
  opencode: { bin: 'opencode', args: ['run'] },
  gemini: { bin: 'gemini', args: ['-p'] },
};

function clipboardCommands(): [string, string[]][] {
  if (process.platform === 'win32') return [['clip', []]];
  if (process.platform === 'darwin') return [['pbcopy', []]];
  return [['wl-copy', []], ['xclip', ['-selection', 'clipboard']]];
}

const HEADER = `Fix these code review findings from CodeWolf in this repository.
For each one: open the file, check that the problem is real, and make the smallest change that fixes it.
If a finding is wrong, leave that code alone and say why. Do not change unrelated code.
When done, list each id with fixed or skipped and one line of why.`;

export function buildFixPrompt(root: string, findings: StoredFinding[]): string {
  const items = findings.map((f, i) => {
    let line: number | null = f.line;
    try { line = relocate(f, readFileSync(repoFile(root, f.file), 'utf8')); } catch { /* file gone or unsafe: keep the stored line */ }
    const moved = line === null ? ' (the code at this line has changed since the review)' : '';
    const at = line ?? f.line;
    const shifted = { ...f, line: at, ...(f.endLine ? { endLine: f.endLine + at - f.line } : {}) };
    return `${i + 1}. [${f.id}] ${f.file}:${at}${moved}\n${agentPromptFor(shifted)}`;
  });
  return `${HEADER}\n\n${items.join('\n\n')}\n`;
}

/** Runs a binary with fixed argv and the text on stdin. Resolves the exit code; rejects when it cannot start. */
function pipeTo(bin: string, args: string[], text: string, showOutput: boolean): Promise<number> {
  const spec = resolveSpawn(bin, args);
  const env = { ...process.env };
  delete env.CLAUDECODE; // let `claude -p` start from inside a Claude Code session
  return new Promise((resolve, reject) => {
    const child = spawn(spec.file, spec.args, { env, windowsHide: true, windowsVerbatimArguments: spec.verbatim, stdio: ['pipe', showOutput ? 'inherit' : 'ignore', 'inherit'] });
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
    child.stdin.on('error', () => { /* child exited early; close reports it */ });
    child.stdin.end(text);
  });
}

async function deliver(target: string, prompt: string, claudeBin?: string): Promise<string | null> {
  if (target === 'clipboard') {
    for (const [bin, args] of clipboardCommands()) {
      if (!whichSync(bin)) continue;
      try { if ((await pipeTo(bin, args, prompt, false)) === 0) { process.stderr.write(`codewolf: fix prompt copied to the clipboard (${bin})\n`); return null; } } catch { /* try the next one */ }
    }
    return 'no clipboard tool worked';
  }
  const t = FIX_TARGETS[target]!;
  const bin = target === 'claude' ? claudeBin ?? process.env.CODEWOLF_CLAUDE_BIN ?? t.bin : t.bin;
  if (!/\.(c|m)?js$/i.test(bin) && !whichSync(bin)) return `${bin} not found on PATH`;
  try {
    const code = await pipeTo(bin, t.args, prompt, true);
    return code === 0 ? null : `${target} exited ${code}`;
  } catch (e) { return (e as Error).message; }
}

export interface FixOptions { all?: boolean | undefined; nits?: boolean | undefined; to?: string | undefined; 'claude-bin'?: string | undefined }

export async function cmdFix(ids: string[], opts: FixOptions, cwd: string): Promise<number> {
  if (ids.length && (opts.all || opts.nits)) throw new Error('give finding ids or --all / --nits, not both');
  const targets = ['print', 'clipboard', ...Object.keys(FIX_TARGETS)];
  if (opts.to && !targets.includes(opts.to)) throw new Error(`unknown --to ${opts.to} (one of: ${targets.join(', ')})`);
  const { root, store } = openStore(cwd);
  const open = store.findings.filter((f) => f.status === 'open');
  const picked = ids.length
    ? byIds(store, ids).map((f) => { if (f.status !== 'open') throw new Error(`finding ${f.id} is ${f.status}`); return f; })
    : open.filter((f) => (opts.nits ? f.severity === 'nit' : f.severity !== 'nit'));
  if (!picked.length) { process.stdout.write('codewolf: no open findings to fix\n'); return 0; }
  const prompt = buildFixPrompt(root, picked);
  // outside a terminal or inside an agent the caller is the agent, so it gets the text; otherwise the first agent CLI found
  const target = opts.to ?? (!process.stdout.isTTY || detectAgent(process.env) ? 'print' : Object.keys(FIX_TARGETS).find((t) => whichSync(FIX_TARGETS[t]!.bin)) ?? 'print');
  if (target !== 'print') {
    const err = await deliver(target, prompt, opts['claude-bin']);
    if (!err) return 0;
    process.stderr.write(`codewolf: fix target ${target} failed (${err}); printing the prompt instead\n`);
  }
  process.stdout.write(prompt);
  return 0;
}
