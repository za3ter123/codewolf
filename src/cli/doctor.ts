// `codewolf doctor`: one OK/WARN/FAIL line per check. Keys are only ever shown masked.
import { spawnSync } from 'node:child_process';
import { unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { findConfigFile, isOfficialHost, loadConfig, ollamaBase } from '../core/config.ts';
import { stateDir } from '../core/store.ts';
import { whichSync } from '../providers/claude-code.ts';
import { maskKey, redact } from '../shared/mask.ts';
import type { ConfigOverrides, ResolvedConfig } from '../shared/types.ts';
import { repoRoot } from './git.ts';

const OLLAMA_DEFAULT = 'http://127.0.0.1:11434';
const OLLAMA_TIMEOUT_MS = 1000;
const MIN_NODE = 20;

type Level = 'OK' | 'WARN' | 'FAIL';

export async function cmdDoctor(opts: { config?: string | undefined; overrides: ConfigOverrides }, cwd: string): Promise<number> {
  const lines: [Level, string][] = [];
  const add = (l: Level, msg: string) => lines.push([l, msg]);

  const major = Number(process.versions.node.split('.')[0]);
  add(major >= MIN_NODE ? 'OK' : 'FAIL', `node ${process.versions.node}${major >= MIN_NODE ? '' : ` (needs ${MIN_NODE} or newer)`}`);

  const gv = spawnSync('git', ['--version'], { encoding: 'utf8', windowsHide: true });
  add(gv.status === 0 ? 'OK' : 'FAIL', gv.status === 0 ? gv.stdout.trim() : 'git not found on PATH');
  const root = gv.status === 0 ? repoRoot(cwd) : undefined;
  add(root ? 'OK' : 'WARN', root ? `git repository ${root}` : 'not inside a git repository (review --diff still works; local state is off)');

  const file = opts.config ? path.resolve(cwd, opts.config) : findConfigFile(cwd);
  let config: ResolvedConfig | undefined;
  try {
    const lo: Parameters<typeof loadConfig>[0] = { cwd, overrides: opts.overrides, root: root ?? cwd, warn: () => {} };
    if (opts.config) { lo.configPath = opts.config; lo.trusted = true; }
    config = loadConfig(lo);
    if (!file) add('OK', 'config: none found, using defaults and environment');
    else if (opts.config) add('OK', `config ${file} (trusted: passed with --config)`);
    else add('OK', `config ${file} (untrusted repo file: no env: refs, no commands, keys only to official hosts)`);
  } catch (e) {
    add('FAIL', `config: ${redact((e as Error).message)}`);
  }

  for (const [i, p] of (config?.providers ?? []).entries()) {
    const keys = p.keys.length ? `${p.keys.length} key(s): ${p.keys.map(maskKey).join(', ')}` : 'no key';
    const needsKey = p.name !== 'ollama' && p.name !== 'claude-code' && isOfficialHost(p.name, p.baseUrl);
    add(needsKey && !p.keys.length ? 'WARN' : 'OK', `provider ${i + 1} ${p.name} model=${p.model || '(cli default)'}${p.baseUrl ? ` baseUrl=${p.baseUrl}` : ''} ${keys}`);
  }

  const ollama = (config?.providers.find((p) => p.name === 'ollama')?.baseUrl || ollamaBase(process.env) || OLLAMA_DEFAULT).replace(/\/+$/, '');
  try {
    const res = await fetch(`${ollama}/api/tags`, { signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS) });
    await res.body?.cancel();
    add(res.ok ? 'OK' : 'WARN', `ollama at ${ollama} ${res.ok ? 'reachable' : `answered ${res.status}`}`);
  } catch {
    add('WARN', `ollama not reachable at ${ollama}`);
  }

  const claude = opts.overrides.claudeBin ?? process.env.CODEWOLF_CLAUDE_BIN ?? 'claude';
  const found = whichSync(claude);
  add(found ? 'OK' : 'WARN', found ? `claude CLI ${found}` : `claude CLI "${claude}" not found (the claude-code provider and fix --to claude need it)`);

  for (const tool of ['ruff', 'eslint', 'semgrep', 'gitleaks'] as const) {
    if (config && !config.tools[tool]) { add('OK', `${tool} disabled in config`); continue; }
    const at = whichSync(tool);
    add(at ? 'OK' : 'WARN', at ? `${tool} ${at}` : `${tool} not found (optional linter, skipped in reviews)`);
  }

  if (!root) add('WARN', 'state dir: unavailable outside a git repository');
  else {
    try {
      const dir = stateDir(root);
      if (!dir) throw new Error('git did not report a git dir');
      const probe = path.join(dir, `.doctor-${process.pid}`);
      writeFileSync(probe, 'ok');
      unlinkSync(probe);
      add('OK', `state dir ${dir} writable`);
    } catch (e) {
      add('FAIL', `state dir not writable: ${(e as Error).message}`);
    }
  }

  process.stdout.write(lines.map(([l, m]) => `${l.padEnd(4)} ${redact(m)}`).join('\n') + '\n');
  return lines.some(([l]) => l === 'FAIL') ? 1 : 0;
}
