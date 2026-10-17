import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { DEFAULT_BASE_URL as PUBLIK_BASE, MODELS as PUBLIK_MODELS, readCredential } from '../providers/publik.ts';
import type { PublikCredential } from '../providers/publik.ts';
import { registerSecret } from '../shared/mask.ts';
import { PROVIDER_NAMES, SEVERITIES } from '../shared/types.ts';
import type { ConfigOverrides, PathInstruction, Profile, ProviderConfig, ProviderName, ResolvedConfig, Severity } from '../shared/types.ts';
import { readGuidelines, readLearnings } from './learnings.ts';

export class ConfigError extends Error {
  override name = 'ConfigError';
}

export const CONFIG_FILENAMES = ['.codewolf.yaml', '.codewolf.yml'];

export const DEFAULT_EXCLUDES: readonly string[] = [
  '**/package-lock.json', '**/npm-shrinkwrap.json', '**/yarn.lock', '**/pnpm-lock.yaml', '**/bun.lockb', '**/bun.lock',
  '**/*.lock', '**/go.sum', '**/composer.lock', '**/Gemfile.lock', '**/Pipfile.lock', '**/poetry.lock', '**/Cargo.lock',
  'dist/**', '**/node_modules/**', '**/*.min.js', '**/*.min.css', '**/*.map', '**/*.snap',
  '**/*.{png,jpg,jpeg,gif,bmp,ico,webp,avif,tiff,psd}', '**/*.{pdf,zip,gz,tgz,bz2,xz,7z,rar,jar,war,whl}',
  '**/*.{exe,dll,so,dylib,a,o,obj,lib,class,pyc,wasm,bin,dat}', '**/*.{woff,woff2,ttf,otf,eot}',
  '**/*.{mp3,mp4,mov,avi,mkv,wav,flac,ogg,webm}', '**/*.{sqlite,db}',
];

const DEFAULTS: Record<ProviderName, { baseUrl: string; model: string; timeoutMs: number }> = {
  anthropic: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-5-5', timeoutMs: 180_000 },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-5-mini', timeoutMs: 180_000 },
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com', model: 'gemini-2.5-flash', timeoutMs: 180_000 },
  ollama: { baseUrl: 'http://127.0.0.1:11434', model: 'qwen2.5-coder:7b', timeoutMs: 900_000 },
  'claude-code': { baseUrl: '', model: '', timeoutMs: 900_000 },
  publik: { baseUrl: PUBLIK_BASE, model: PUBLIK_MODELS.balanced, timeoutMs: 180_000 },
};
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_MAX_TOKENS = 8192;

type Env = Record<string, string | undefined>;

/** Split a comma/newline separated list, trimming and dropping empties. */
export function splitList(v: string): string[] {
  return v.split(/[,\n\r]+/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Expand key entries: `env:NAME` reads that env var (itself a comma/newline list). With `allowEnv` false (an untrusted
 * repository config) env references are dropped with a warning, so a repo cannot read arbitrary environment variables.
 */
export function expandKeys(entries: unknown, env: Env, where: string, allowEnv = true, warn: (m: string) => void = () => {}): string[] {
  if (entries === undefined || entries === null) return [];
  const list = typeof entries === 'string' ? splitList(entries) : Array.isArray(entries) ? entries : null;
  if (!list) throw new ConfigError(`${where}: keys must be a list or a comma separated string`);
  const out: string[] = [];
  for (const e of list) {
    if (typeof e !== 'string') throw new ConfigError(`${where}: every key must be a string`);
    const t = e.trim();
    if (t.startsWith('env:')) {
      if (allowEnv) out.push(...splitList(env[t.slice(4).trim()] ?? ''));
      else warn(`${where}: ignoring ${t} from the repository config; env references only work in a file passed with --config`);
    } else if (t) out.push(...splitList(t));
  }
  return [...new Set(out)];
}

function envKeys(env: Env, ...names: string[]): string[] {
  const out: string[] = [];
  for (const n of names) out.push(...splitList(env[n] ?? ''));
  return [...new Set(out)];
}

function isOpenAIHost(baseUrl: string): boolean {
  try { return new URL(baseUrl).hostname === 'api.openai.com'; } catch { return false; }
}

/** Keys from the environment for a provider. OpenAI env keys only go to api.openai.com, never to a third-party base URL. */
export function defaultKeysFor(name: ProviderName, baseUrl: string, env: Env): string[] {
  switch (name) {
    case 'anthropic': return envKeys(env, 'ANTHROPIC_API_KEYS', 'ANTHROPIC_API_KEY', 'CODEWOLF_API_KEYS');
    case 'gemini': return envKeys(env, 'GEMINI_API_KEYS', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'CODEWOLF_API_KEYS');
    case 'openai':
      if (baseUrl.includes('openrouter.ai')) return envKeys(env, 'OPENROUTER_API_KEYS', 'OPENROUTER_API_KEY', 'CODEWOLF_API_KEYS');
      if (isOpenAIHost(baseUrl)) return envKeys(env, 'OPENAI_API_KEYS', 'OPENAI_API_KEY', 'CODEWOLF_API_KEYS');
      return envKeys(env, 'CODEWOLF_API_KEYS');
    default: return [];
  }
}

const OFFICIAL_HOSTS: Record<ProviderName, string[]> = {
  anthropic: ['api.anthropic.com'],
  gemini: ['generativelanguage.googleapis.com'],
  openai: ['api.openai.com', 'openrouter.ai'],
  ollama: [],
  'claude-code': [],
  publik: ['publikhq.com'],
};

/** True when baseUrl is the provider's own https endpoint, where env keys may always go. */
export function isOfficialHost(name: ProviderName, baseUrl: string): boolean {
  try {
    const u = new URL(baseUrl);
    return u.protocol === 'https:' && OFFICIAL_HOSTS[name].includes(u.hostname);
  } catch { return false; }
}

function normName(raw: unknown, where: string): { name: ProviderName; baseUrl?: string } {
  if (typeof raw !== 'string' || !raw.trim()) throw new ConfigError(`${where}: provider name is required`);
  const n = raw.trim().toLowerCase();
  if (n === 'openrouter') return { name: 'openai', baseUrl: OPENROUTER_BASE };
  if (n === 'claude' || n === 'claudecode' || n === 'claude_code') return { name: 'claude-code' };
  if (n === 'openai-compatible' || n === 'openai_compatible') return { name: 'openai' };
  if (!(PROVIDER_NAMES as readonly string[]).includes(n)) {
    throw new ConfigError(`${where}: unknown provider "${raw}" (expected one of ${PROVIDER_NAMES.join(', ')}, openrouter)`);
  }
  return { name: n as ProviderName };
}

function str(v: unknown, where: string): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string' && typeof v !== 'number') throw new ConfigError(`${where} must be a string`);
  return String(v).trim();
}

function posInt(v: unknown, where: string): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new ConfigError(`${where} must be a positive number`);
  return Math.floor(n);
}

export function ollamaBase(env: Env): string | undefined {
  const h = env.OLLAMA_HOST?.trim();
  if (!h) return undefined;
  const withProto = /^https?:\/\//.test(h) ? h : `http://${h}`;
  return withProto.replace('://0.0.0.0', '://127.0.0.1');
}

/** publik API from PUBLIK_API_KEY / PUBLIK_API_BASE_URL, else this app's credential file. Null when neither is set. */
function publikFrom(env: Env, credential: PublikCredential | null): { baseUrl: string; key: string } | null {
  const key = env.PUBLIK_API_KEY?.trim();
  if (key) return { baseUrl: (env.PUBLIK_API_BASE_URL?.trim() || PUBLIK_BASE).replace(/\/+$/, ''), key };
  // the file is untrusted input: no string pk_ key means no credential, and its base URL counts only on https publikhq.com
  const c = credential as { key?: unknown; base_url?: unknown } | null;
  if (typeof c?.key !== 'string' || !c.key.startsWith('pk_')) return null;
  const base = typeof c.base_url === 'string' && isOfficialHost('publik', c.base_url) ? c.base_url : PUBLIK_BASE;
  return { baseUrl: base.replace(/\/+$/, ''), key: c.key };
}

interface RawProvider { name: unknown; model?: unknown; baseUrl?: unknown; base_url?: unknown; baseURL?: unknown; keys?: unknown; timeout?: unknown; maxTokens?: unknown; max_tokens?: unknown; command?: unknown }

interface BuildContext {
  env: Env;
  /** The config file was chosen by the user (--config), not discovered in the repository. */
  trusted: boolean;
  warn: (m: string) => void;
  /** Base URL from --base-url or CODEWOLF_BASE_URL (user-chosen). */
  baseOverride?: string | undefined;
  keyOverride?: string[] | undefined;
  claudeBin?: string | undefined;
  publik: { baseUrl: string; key: string } | null;
}

function buildProvider(raw: RawProvider, ctx: BuildContext, where: string): ProviderConfig {
  const { env, warn } = ctx;
  const { name, baseUrl: aliasBase } = normName(raw.name, where);
  const d = DEFAULTS[name];
  const fileBase = str(raw.baseUrl ?? raw.base_url ?? raw.baseURL, `${where}.baseUrl`);
  const envBase = name === 'ollama' ? ollamaBase(env) : name === 'publik' ? ctx.publik?.baseUrl : undefined;
  const baseUrl = (ctx.baseOverride ?? fileBase ?? aliasBase ?? envBase ?? d.baseUrl).replace(/\/+$/, '');
  let model = str(raw.model, `${where}.model`);
  if (!model) model = name === 'openai' && baseUrl === OPENROUTER_BASE ? 'qwen/qwen3-coder' : d.model;
  if (name === 'publik' && !(Object.values(PUBLIK_MODELS) as string[]).includes(model)) {
    throw new ConfigError(`${where}.model: publik takes ${Object.values(PUBLIK_MODELS).join(', ')}, never a vendor model name`);
  }
  // Keys the user holds (env vars, --keys) only go to a base URL the user chose or to the provider's official host.
  // An auto-discovered repo config pointing elsewhere gets no keys: otherwise opening a hostile repo leaks them.
  const baseTrusted = ctx.trusted || ctx.baseOverride !== undefined || fileBase === undefined || isOfficialHost(name, baseUrl);
  const withhold = (what: string) => warn(`${where}: not sending ${what} to ${baseUrl}, a base URL set by the repository config. Pass --base-url or --config to allow it.`);
  const fileKeys = raw.keys !== undefined ? expandKeys(raw.keys, env, `${where}.keys`, ctx.trusted, warn) : [];
  let keys: string[];
  if (ctx.keyOverride?.length) {
    keys = baseTrusted ? ctx.keyOverride : fileKeys;
    if (!baseTrusted) withhold('--keys');
  } else if (fileKeys.length) {
    keys = fileKeys; // literal keys written in the file came from whoever wrote the file
  } else {
    // the publik key only ever goes to the publik base URL (publikhq.com, or PUBLIK_API_BASE_URL with PUBLIK_API_KEY)
    const pub = name === 'publik' ? ctx.publik : null;
    if (pub && baseUrl !== pub.baseUrl) warn(`${where}: not sending the publik key to ${baseUrl}; it only goes to ${pub.baseUrl}`);
    const fromEnv = name === 'publik' ? (pub && baseUrl === pub.baseUrl ? [pub.key] : []) : defaultKeysFor(name, baseUrl, env);
    keys = baseTrusted ? fromEnv : [];
    if (!baseTrusted && fromEnv.length) withhold('API keys from the environment');
  }
  const timeoutSec = posInt(raw.timeout, `${where}.timeout`);
  const p: ProviderConfig = {
    name, model, baseUrl, keys,
    timeoutMs: timeoutSec ? timeoutSec * 1000 : d.timeoutMs,
    maxTokens: posInt(raw.maxTokens ?? raw.max_tokens, `${where}.maxTokens`) ?? DEFAULT_MAX_TOKENS,
  };
  if (raw.command !== undefined && raw.command !== null && raw.command !== '') {
    warn(`${where}: ignoring "command" from the config file; set CODEWOLF_CLAUDE_BIN or pass --claude-bin instead`);
  }
  if (name === 'claude-code') {
    const command = ctx.claudeBin?.trim() || env.CODEWOLF_CLAUDE_BIN?.trim();
    if (command) p.command = command;
  }
  return p;
}

/**
 * Chain used when nothing is configured: every provider that has keys in the environment, then local Ollama.
 * `publik` is true only when the user set nothing at all; then publik API goes ahead of the default Ollama.
 */
function autoChain(env: Env, publik: boolean): RawProvider[] {
  const chain: RawProvider[] = [];
  if (envKeys(env, 'ANTHROPIC_API_KEYS', 'ANTHROPIC_API_KEY').length) chain.push({ name: 'anthropic' });
  if (envKeys(env, 'OPENAI_API_KEYS', 'OPENAI_API_KEY').length) chain.push({ name: 'openai' });
  if (envKeys(env, 'OPENROUTER_API_KEYS', 'OPENROUTER_API_KEY').length) chain.push({ name: 'openrouter' });
  if (envKeys(env, 'GEMINI_API_KEYS', 'GEMINI_API_KEY', 'GOOGLE_API_KEY').length) chain.push({ name: 'gemini' });
  if (publik && !chain.length) return [{ name: 'publik' }, { name: 'ollama' }];
  chain.push({ name: 'ollama' });
  return chain;
}

function parseSeverity(v: unknown, where: string): Severity | 'none' | undefined {
  const s = str(v, where)?.toLowerCase();
  if (!s) return undefined;
  if (s === 'none' || s === 'off' || s === 'never') return 'none';
  if (s === 'high') return 'major';
  if (s === 'low') return 'minor';
  if (!(SEVERITIES as readonly string[]).includes(s)) throw new ConfigError(`${where} must be one of ${SEVERITIES.join(', ')}, none`);
  return s as Severity;
}

function parseProfile(v: unknown, where: string): Profile | undefined {
  const s = str(v, where)?.toLowerCase();
  if (!s) return undefined;
  if (s !== 'quiet' && s !== 'chill' && s !== 'assertive') throw new ConfigError(`${where} must be quiet, chill or assertive`);
  return s;
}

function asObject(v: unknown, where: string): Record<string, unknown> {
  if (v === undefined || v === null) return {};
  if (typeof v !== 'object' || Array.isArray(v)) throw new ConfigError(`${where} must be a mapping`);
  return v as Record<string, unknown>;
}

function stringList(v: unknown, where: string): string[] {
  if (v === undefined || v === null) return [];
  if (typeof v === 'string') return [v];
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) throw new ConfigError(`${where} must be a list of strings`);
  return v as string[];
}

export interface ResolveOptions {
  env?: Env;
  root?: string;
  configPath?: string;
  /** Learnings to use instead of reading `<root>/.codewolf/learnings.md`. */
  learnings?: string[];
  /**
   * The config was chosen by the user (CLI --config), so env: references and keys for its base URLs are allowed.
   * Default false: treat config as repository content that may be hostile.
   */
  trusted?: boolean;
  /** Receives security warnings (withheld keys, ignored commands). Default: stderr. */
  warn?: (message: string) => void;
  /** This app's publik API credential. Default: read from disk, unless `env` is passed (tests stay off the real file). */
  publikCredential?: PublikCredential | null;
}

const stderrWarn = (m: string) => { process.stderr.write(`codewolf: warning: ${m}
`); };

function bool(v: unknown, where: string, dflt: boolean): boolean {
  if (v === undefined || v === null) return dflt;
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 'false') return v === 'true';
  throw new ConfigError(`${where} must be true or false`);
}

/** Merge a parsed config object, overrides and env into a ResolvedConfig. Throws ConfigError on invalid input. */
export function resolveConfig(raw: unknown, overrides: ConfigOverrides = {}, opts: ResolveOptions = {}): ResolvedConfig {
  const env = opts.env ?? process.env;
  const cfg = asObject(raw, 'config');
  const review = asObject(cfg.review, 'review');

  const rawProviders = cfg.providers === undefined || cfg.providers === null ? [] : cfg.providers;
  if (!Array.isArray(rawProviders)) throw new ConfigError('providers must be a list');
  const chainRaw: RawProvider[] = rawProviders.map((p, i) => {
    if (typeof p === 'string') return { name: p };
    return asObject(p, `providers[${i}]`) as unknown as RawProvider;
  });

  const keyOverride = overrides.keys !== undefined ? expandKeys(overrides.keys, env, '--keys') : undefined;
  const warn = opts.warn ?? stderrWarn;
  const baseOverride = overrides.baseUrl || env.CODEWOLF_BASE_URL?.trim() || undefined;
  const publik = publikFrom(env, opts.publikCredential !== undefined ? opts.publikCredential : opts.env ? null : readCredential());
  // no providers list, --provider, --model, --keys, base URL override, OLLAMA_HOST or CODEWOLF_API_KEYS (provider env keys: autoChain)
  const untouched = !overrides.provider && !chainRaw.length && !overrides.model && !baseOverride && !keyOverride?.length
    && !ollamaBase(env) && !envKeys(env, 'CODEWOLF_API_KEYS').length;
  let chain: RawProvider[];
  if (overrides.provider) {
    const want = normName(overrides.provider, '--provider');
    const match = chainRaw.find((p) => { try { return normName(p.name, '').name === want.name; } catch { return false; } });
    chain = [{ ...(match ?? {}), name: match ? match.name : overrides.provider }]; // keep an alias like openrouter from the config
    if (want.baseUrl && !overrides.baseUrl && !match) chain[0]!.baseUrl = want.baseUrl;
  } else {
    chain = chainRaw.length ? chainRaw : autoChain(env, untouched && publik !== null);
  }
  if (overrides.model) chain[0] = { ...chain[0]!, model: overrides.model };
  const providers = chain.map((p, i) => buildProvider(p, {
    env, warn, trusted: opts.trusted === true,
    baseOverride: i === 0 ? baseOverride : undefined,
    keyOverride: i === 0 ? keyOverride : undefined,
    claudeBin: overrides.claudeBin,
    publik,
  }, i === 0 && overrides.provider ? '--provider' : `providers[${i}]`));
  for (const p of providers) for (const k of p.keys) registerSecret(k);

  const pathInstructions: PathInstruction[] = [];
  const pi = review.pathInstructions ?? review.path_instructions ?? cfg.pathInstructions;
  if (pi !== undefined && pi !== null) {
    if (!Array.isArray(pi)) throw new ConfigError('review.pathInstructions must be a list');
    pi.forEach((e, i) => {
      const o = asObject(e, `review.pathInstructions[${i}]`);
      const p = str(o.path, `review.pathInstructions[${i}].path`);
      const ins = str(o.instructions, `review.pathInstructions[${i}].instructions`);
      if (!p || !ins) throw new ConfigError(`review.pathInstructions[${i}] needs path and instructions`);
      pathInstructions.push({ path: p, instructions: ins });
    });
  }

  const toolsRaw = cfg.tools;
  const toolsDefault = toolsRaw === false ? false : true;
  const tools = typeof toolsRaw === 'object' && toolsRaw !== null ? asObject(toolsRaw, 'tools') : {};
  const guidelinesOn = bool(review.guidelines, 'review.guidelines', true);
  const root = path.resolve(opts.root ?? (opts.configPath ? path.dirname(opts.configPath) : process.cwd()));
  const resolved: ResolvedConfig = {
    profile: parseProfile(overrides.profile, '--profile') ?? parseProfile(cfg.profile, 'profile') ?? 'chill',
    language: str(overrides.language, '--language') ?? str(cfg.language, 'language') ?? 'en',
    providers,
    review: {
      exclude: [...DEFAULT_EXCLUDES, ...stringList(review.exclude ?? cfg.exclude, 'review.exclude')],
      pathInstructions,
      failOn: parseSeverity(overrides.failOn, '--fail-on') ?? parseSeverity(review.failOn ?? review.fail_on ?? cfg.failOn, 'review.failOn') ?? 'none',
      concurrency: posInt(review.concurrency, 'review.concurrency') ?? 4,
      maxChunkTokens: posInt(review.maxChunkTokens ?? review.max_chunk_tokens, 'review.maxChunkTokens') ?? 12_000,
      guidelines: guidelinesOn,
    },
    tools: {
      ruff: bool(tools.ruff, 'tools.ruff', toolsDefault),
      eslint: bool(tools.eslint, 'tools.eslint', toolsDefault),
      semgrep: bool(tools.semgrep, 'tools.semgrep', toolsDefault),
      gitleaks: bool(tools.gitleaks, 'tools.gitleaks', toolsDefault),
    },
    learnings: opts.learnings ?? readLearnings(root),
    guidelines: guidelinesOn ? readGuidelines(root) : '',
    root,
  };
  if (opts.configPath) resolved.configPath = opts.configPath;
  if (untouched && !publik && providers.length === 1) resolved.nothingConfigured = true; // just the default Ollama
  return resolved;
}

/** Find `.codewolf.yaml` starting at `cwd` and walking up to the filesystem root. */
export function findConfigFile(cwd: string): string | undefined {
  let dir = path.resolve(cwd);
  for (;;) {
    for (const name of CONFIG_FILENAMES) {
      const p = path.join(dir, name);
      if (existsSync(p)) return p;
    }
    const up = path.dirname(dir);
    if (up === dir) return undefined;
    dir = up;
  }
}

export function readConfigFile(file: string): unknown {
  let text: string;
  try { text = readFileSync(file, 'utf8'); } catch (e) { throw new ConfigError(`cannot read config ${file}: ${(e as Error).message}`); }
  try { return parseYaml(text.replace(/^\uFEFF/, '')) ?? {}; } catch (e) { throw new ConfigError(`invalid YAML in ${file}: ${(e as Error).message}`); }
}

export interface LoadOptions {
  cwd?: string;
  /** Explicit config path (--config). Must exist. */
  configPath?: string;
  overrides?: ConfigOverrides;
  env?: Env;
  /** Repo root for learnings; defaults to the config file's directory, else cwd. */
  root?: string;
  /** Set true only when the user chose configPath themselves (CLI --config). Default false. */
  trusted?: boolean;
  warn?: (message: string) => void;
}

/** Discover, read and resolve config. */
export function loadConfig(opts: LoadOptions = {}): ResolvedConfig {
  const cwd = opts.cwd ?? process.cwd();
  let file: string | undefined;
  if (opts.configPath) {
    file = path.resolve(cwd, opts.configPath);
    if (!existsSync(file)) throw new ConfigError(`config file not found: ${file}`);
  } else {
    file = findConfigFile(cwd);
  }
  const raw = file ? readConfigFile(file) : {};
  const ro: ResolveOptions = { root: opts.root ?? (file && !opts.configPath ? path.dirname(file) : cwd) };
  if (opts.env) ro.env = opts.env;
  if (opts.trusted) ro.trusted = true;
  if (opts.warn) ro.warn = opts.warn;
  if (file) ro.configPath = file;
  return resolveConfig(raw, opts.overrides ?? {}, ro);
}
