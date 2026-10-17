// Runs the local Claude Code CLI (`claude -p --output-format json`) so a Claude subscription works without an API key.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { ProviderConfig } from '../shared/types.ts';
import { ProviderError } from './http.ts';

const SAFE_ARG = /^[\w.:@/\-[\]]+$/;

/** Find an executable on PATH. On Windows this honours PATHEXT so `claude` resolves to claude.exe or claude.cmd. */
export function whichSync(cmd: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const isWin = process.platform === 'win32';
  const exts = isWin ? (env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM').split(';').filter(Boolean) : [''];
  const hasExt = isWin && /\.[a-z0-9]+$/i.test(cmd);
  const candidates = hasExt ? [cmd] : exts.map((e) => cmd + e.toLowerCase());
  if (cmd.includes('/') || cmd.includes('\\')) return candidates.concat(cmd).find((c) => existsSync(c));
  for (const dir of (env.PATH ?? env.Path ?? '').split(path.delimiter).filter(Boolean)) {
    for (const c of candidates) {
      const full = path.join(dir, c);
      if (existsSync(full)) return full;
    }
  }
  return undefined;
}

/** Command + args to spawn. .js files run under this Node; Windows .cmd/.bat shims go through cmd.exe (Node refuses to spawn them directly). */
export function resolveSpawn(command: string, args: string[]): { file: string; args: string[]; verbatim: boolean } {
  if (/\.(c|m)?js$/i.test(command)) return { file: process.execPath, args: [command, ...args], verbatim: false };
  const found = whichSync(command);
  if (!found) throw new ProviderError(`claude-code: "${command}" not found on PATH (install Claude Code or set provider command)`, 'unavailable');
  if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(found)) {
    // Quote every argument: inside quotes cmd.exe treats & | < > ^ literally, so file names cannot inject commands.
    const quoted = args.map((a) => `"${a.replace(/"/g, '""')}"`).join(' ');
    return { file: process.env.ComSpec ?? 'cmd.exe', args: ['/d', '/s', '/c', `""${found}" ${quoted}"`], verbatim: true };
  }
  return { file: found, args, verbatim: false };
}

interface ClaudeJson { type?: string; result?: string; is_error?: boolean; subtype?: string }

/** Pull the result text out of `--output-format json` output (a single object, or an array of events). */
export function parseClaudeOutput(stdout: string): string {
  const t = stdout.trim();
  let data: unknown;
  try { data = JSON.parse(t); } catch {
    const last = t.split(/\r?\n/).filter(Boolean).pop() ?? '';
    try { data = JSON.parse(last); } catch { throw new ProviderError(`claude-code printed non-JSON output: ${t.slice(0, 160)}`, 'server'); }
  }
  const obj = (Array.isArray(data) ? [...data].reverse().find((x: ClaudeJson) => x && x.type === 'result') : data) as ClaudeJson | undefined;
  if (!obj || typeof obj.result !== 'string') throw new ProviderError('claude-code output has no result field', 'server');
  if (obj.is_error) {
    const kind = /rate|limit|quota|usage/i.test(obj.result) ? 'rate' : /log ?in|auth|credential/i.test(obj.result) ? 'auth' : 'server';
    throw new ProviderError(`claude-code error: ${obj.result.slice(0, 200)}`, kind);
  }
  return obj.result;
}

export function runClaudeCode(p: ProviderConfig, req: { system: string; prompt: string; signal?: AbortSignal | undefined }): Promise<string> {
  // no user MCP servers, hooks or settings: faster startup (~3s instead of ~20s) and nothing can act on the repo
  const args = ['-p', '--output-format', 'json', '--no-session-persistence', '--strict-mcp-config', '--setting-sources', ''];
  if (p.model) {
    if (!SAFE_ARG.test(p.model)) throw new ProviderError(`claude-code: invalid model name "${p.model}"`, 'client');
    args.push('--model', p.model);
  }
  args.push('--tools', ''); // review only: no file, shell or web tools
  const spec = resolveSpawn(p.command ?? 'claude', args);
  const env = { ...process.env };
  delete env.CLAUDECODE; // allow running from inside a Claude Code session
  const input = `<reviewer_instructions>\n${req.system}\n</reviewer_instructions>\n\n${req.prompt}`;
  return new Promise((resolve, reject) => {
    const child = spawn(spec.file, spec.args, { env, windowsHide: true, windowsVerbatimArguments: spec.verbatim, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '', done = false;
    const finish = (fn: () => void) => { if (done) return; done = true; clearTimeout(timer); req.signal?.removeEventListener('abort', onAbort); fn(); };
    const timer = setTimeout(() => { child.kill(); finish(() => reject(new ProviderError(`claude-code timed out after ${Math.round(p.timeoutMs / 1000)}s`, 'timeout'))); }, p.timeoutMs);
    const onAbort = () => { child.kill(); finish(() => reject(req.signal!.reason ?? new Error('aborted'))); };
    req.signal?.addEventListener('abort', onAbort, { once: true });
    child.stdout.setEncoding('utf8').on('data', (d: string) => (out += d));
    child.stderr.setEncoding('utf8').on('data', (d: string) => (err += d));
    child.on('error', (e: NodeJS.ErrnoException) => finish(() => reject(new ProviderError(`claude-code failed to start: ${e.message}`, e.code === 'ENOENT' ? 'unavailable' : 'server'))));
    child.on('close', (code) => finish(() => {
      if (code !== 0 && !out.trim()) { reject(new ProviderError(`claude-code exited ${code}: ${err.trim().slice(0, 200)}`, 'server')); return; }
      try { resolve(parseClaudeOutput(out)); } catch (e) { reject(e); }
    }));
    child.stdin.on('error', () => { /* child exited early; close handler reports it */ });
    child.stdin.end(input);
  });
}
