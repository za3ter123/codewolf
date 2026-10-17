// codewolf CLI. stdout carries only results; every log line goes to stderr, redacted.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { collectDiff, repoRoot } from './cli/git.ts';
import type { DiffScope } from './cli/git.ts';
import { formatNdjson, formatResult } from './cli/format.ts';
import type { Format } from './cli/format.ts';
import { INIT_TEMPLATE } from './cli/template.ts';
import { loadConfig } from './core/config.ts';
import { parseDiff } from './core/diff.ts';
import { review } from './core/engine.ts';
import { appendLearning, learningsPath, readLearnings } from './core/learnings.ts';
import { createChain } from './providers/chain.ts';
import { errorMessage, stderrLogger } from './shared/log.ts';
import { maskKey, redact } from './shared/mask.ts';
import { SEVERITIES } from './shared/types.ts';
import type { ConfigOverrides, ResolvedConfig } from './shared/types.ts';
import { VERSION } from './shared/version.ts';

const HELP = `codewolf ${VERSION}: AI code review with your own keys, many keys, or a local model.

Usage:
  codewolf review [scope] [options]   Review changes (default: working tree vs HEAD, untracked files included)
  codewolf init [--force]             Write a commented .codewolf.yaml in the current directory
  codewolf learn "<text>"             Teach a reviewer preference (.codewolf/learnings.md)
  codewolf learnings                  List learned preferences
  codewolf providers [--check]        Show the provider chain and key counts; --check pings every key
  codewolf --version | --help

Scope (pick one):
  --uncommitted        Working tree vs HEAD, staged + unstaged + untracked (default)
  --staged             Staged changes only
  --committed          HEAD vs merge-base with the default branch
  --base <ref>         Merge-base(ref, HEAD) to working tree
  --diff <file|->      Review a patch file, or stdin with -

Options:
  --format <f>         pretty | plain | markdown | json   (default: pretty on a TTY, plain otherwise)
  --agent              NDJSON for coding agents: one finding per line, then a summary line;
                       exit 1 if any critical or major finding remains
  --provider <name>    anthropic | openai | gemini | ollama | claude-code | openrouter
  --model <id>         Model id
  --base-url <url>     Provider base URL (OpenAI-compatible servers, proxies, remote Ollama)
  --keys <a,b,c>       API keys for the provider (round-robin; env:NAME reads an env var)
  --profile <p>        quiet | chill | assertive
  --config <path>      Config file (default: nearest .codewolf.yaml upward from cwd)
  --fail-on <sev>      Exit 1 if any finding is at or above: critical | major | minor | nit | none
  --claude-bin <path>  Claude Code binary for the claude-code provider (or CODEWOLF_CLAUDE_BIN)
  --no-tools           Do not run local linters (ruff, eslint, semgrep, gitleaks)
  --verbose            Debug logs on stderr

Exit codes: 0 ok, 1 --fail-on threshold hit (or --agent found critical/major), 2 error.
Keys from env: ANTHROPIC_API_KEY(S), OPENAI_API_KEY(S), GEMINI_API_KEY(S), OPENROUTER_API_KEY(S), CODEWOLF_API_KEYS.
Safety: a .codewolf.yaml found in the repository cannot read env vars (env:NAME), run commands, or receive your
keys at a non-official base URL. Pass the file with --config, or use --base-url / CODEWOLF_BASE_URL, to allow keys.
`;

const OPTIONS = {
  format: { type: 'string' }, agent: { type: 'boolean' },
  provider: { type: 'string' }, model: { type: 'string' }, 'base-url': { type: 'string' }, keys: { type: 'string' },
  profile: { type: 'string' }, config: { type: 'string' }, 'fail-on': { type: 'string' },
  base: { type: 'string' }, staged: { type: 'boolean' }, diff: { type: 'string' },
  uncommitted: { type: 'boolean' }, committed: { type: 'boolean' },
  'claude-bin': { type: 'string' },
  check: { type: 'boolean' }, force: { type: 'boolean' }, 'no-tools': { type: 'boolean' }, verbose: { type: 'boolean' },
  version: { type: 'boolean', short: 'v' }, help: { type: 'boolean', short: 'h' },
} as const;

type Values = ReturnType<typeof parseArgs<{ options: typeof OPTIONS; allowPositionals: true }>>['values'];

class UsageError extends Error {}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  return Buffer.concat(chunks).toString('utf8');
}

function overridesFrom(v: Values): ConfigOverrides {
  const o: ConfigOverrides = {};
  if (v.provider) o.provider = v.provider;
  if (v.model) o.model = v.model;
  if (v['base-url']) o.baseUrl = v['base-url'];
  if (v.keys) o.keys = v.keys;
  if (v.profile) o.profile = v.profile;
  if (v['fail-on']) o.failOn = v['fail-on'];
  if (v['claude-bin']) o.claudeBin = v['claude-bin'];
  return o;
}

function configFor(v: Values, cwd: string): ResolvedConfig {
  const opts: Parameters<typeof loadConfig>[0] = { cwd, overrides: overridesFrom(v), root: repoRoot(cwd) ?? cwd };
  if (v.config) { opts.configPath = v.config; opts.trusted = true; } // the user picked this file; a discovered repo file stays untrusted
  return loadConfig(opts);
}

function scopeFrom(v: Values): DiffScope | { kind: 'file'; path: string } {
  const picked = [v.diff !== undefined && 'diff', v.staged && 'staged', v.base !== undefined && 'base', v.committed && 'committed', v.uncommitted && 'uncommitted'].filter(Boolean);
  if (picked.length > 1) throw new UsageError(`choose one scope, got --${picked.join(' --')}`);
  if (v.diff !== undefined) return { kind: 'file', path: v.diff };
  if (v.staged) return { kind: 'staged' };
  if (v.base !== undefined) return { kind: 'base', ref: v.base };
  if (v.committed) return { kind: 'committed' };
  return { kind: 'uncommitted' };
}

async function cmdReview(v: Values, cwd: string): Promise<number> {
  const log = stderrLogger(v.verbose ? 'debug' : 'info');
  let format: Format = process.stdout.isTTY ? 'pretty' : 'plain';
  if (v.format) {
    if (!['pretty', 'plain', 'markdown', 'json'].includes(v.format)) throw new UsageError(`unknown --format ${v.format}`);
    format = v.format as Format;
  }
  const config = configFor(v, cwd);
  const scope = scopeFrom(v);
  let patch: string;
  if (scope.kind === 'file') {
    if (scope.path === '-') patch = await readStdin();
    else {
      const p = path.resolve(cwd, scope.path);
      if (!existsSync(p)) throw new UsageError(`diff file not found: ${scope.path}`);
      patch = readFileSync(p, 'utf8');
    }
  } else {
    patch = collectDiff(scope, cwd);
  }
  const files = parseDiff(patch);
  if (!files.length) log('info', 'no changes to review');
  else log('debug', `reviewing ${files.length} file(s) with ${config.providers.map((p) => p.name).join(' -> ')}`);

  const ac = new AbortController();
  const onSig = () => ac.abort(new Error('interrupted'));
  process.once('SIGINT', onSig);
  let result;
  try {
    result = await review(files, config, { signal: ac.signal, log, linters: !v['no-tools'] });
  } finally {
    process.off('SIGINT', onSig);
  }

  const rank = (s: string) => SEVERITIES.indexOf(s as (typeof SEVERITIES)[number]);
  if (v.agent) {
    process.stdout.write(formatNdjson(result));
    return result.findings.some((f) => rank(f.severity) <= rank('major')) ? 1 : 0;
  }
  const color = format === 'pretty' && process.stdout.isTTY === true && !process.env.NO_COLOR;
  process.stdout.write(formatResult(result, format, color));
  const failOn = config.review.failOn;
  if (failOn !== 'none' && result.findings.some((f) => rank(f.severity) <= rank(failOn))) return 1;
  return 0;
}

function cmdInit(v: Values, cwd: string): number {
  const file = path.join(cwd, '.codewolf.yaml');
  if (existsSync(file) && !v.force) throw new UsageError(`${file} already exists (use --force to overwrite)`);
  writeFileSync(file, INIT_TEMPLATE);
  process.stdout.write(`wrote ${file}\n`);
  return 0;
}

function cmdLearn(text: string, cwd: string): number {
  if (!text.trim()) throw new UsageError('usage: codewolf learn "<preference>"');
  const file = appendLearning(repoRoot(cwd) ?? cwd, text);
  process.stdout.write(`learned. saved to ${file}\n`);
  return 0;
}

function cmdLearnings(cwd: string): number {
  const root = repoRoot(cwd) ?? cwd;
  const items = readLearnings(root);
  if (!items.length) { process.stdout.write(`no learnings yet. add one with: codewolf learn "<preference>"  (${learningsPath(root)})\n`); return 0; }
  process.stdout.write(items.map((l, i) => `${i + 1}. ${l}`).join('\n') + '\n');
  return 0;
}

const CHECK_TIMEOUT_MS = 120_000;

async function cmdProviders(v: Values, cwd: string): Promise<number> {
  const config = configFor(v, cwd);
  const out: string[] = [];
  let ok = 0, failed = 0;
  for (const [i, p] of config.providers.entries()) {
    const keyInfo = p.keys.length ? `${p.keys.length} key(s): ${p.keys.map(maskKey).join(', ')}` : 'no key';
    out.push(`${i + 1}. ${p.name}  model=${p.model || '(cli default)'}${p.baseUrl ? `  baseUrl=${p.baseUrl}` : ''}  ${keyInfo}`);
    if (!v.check) continue;
    process.stdout.write(out.splice(0).join('\n') + '\n');
    for (const key of p.keys.length ? p.keys : [null]) {
      const single = { ...p, keys: key ? [key] : [], timeoutMs: Math.min(p.timeoutMs, CHECK_TIMEOUT_MS) };
      const started = Date.now();
      try {
        await createChain([single], { retryDelayMs: 0 }).complete({ system: 'You are a health check. Reply with the single word ok.', prompt: 'ping', maxTokens: 16 });
        ok++;
        out.push(`   ok    ${key ? maskKey(key) : 'no key'}  ${((Date.now() - started) / 1000).toFixed(1)}s`);
      } catch (e) {
        failed++;
        out.push(`   FAIL  ${key ? maskKey(key) : 'no key'}  ${redact(errorMessage(e)).replace(/^all providers failed\. /, '')}`);
      }
      process.stdout.write(out.splice(0).join('\n') + '\n');
    }
  }
  if (out.length) process.stdout.write(out.join('\n') + '\n');
  if (v.check) process.stdout.write(`${ok} ok, ${failed} failed\n`);
  return v.check && ok === 0 ? 2 : 0;
}

export async function main(argv: string[], cwd = process.cwd()): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
  } catch (e) {
    process.stderr.write(`codewolf: ${errorMessage(e)}\nRun codewolf --help for usage.\n`);
    return 2;
  }
  const { values: v, positionals } = parsed;
  if (v.version) { process.stdout.write(`codewolf ${VERSION}\n`); return 0; }
  const [cmd, ...rest] = positionals;
  if (v.help || !cmd || cmd === 'help') { process.stdout.write(HELP); return 0; }
  try {
    switch (cmd) {
      case 'review': return await cmdReview(v, cwd);
      case 'init': return cmdInit(v, cwd);
      case 'learn': return cmdLearn(rest.join(' '), cwd);
      case 'learnings': return cmdLearnings(cwd);
      case 'providers': return await cmdProviders(v, cwd);
      case 'version': process.stdout.write(`codewolf ${VERSION}\n`); return 0;
      default: throw new UsageError(`unknown command "${cmd}". Run codewolf --help for usage.`);
    }
  } catch (e) {
    process.stderr.write(`codewolf: error: ${redact(errorMessage(e))}\n`);
    return 2;
  }
}

process.exitCode = await main(process.argv.slice(2));
