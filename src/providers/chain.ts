// Key pool per provider + provider chain fallthrough (SPEC.md "Providers and key pool").
import { maskKey, redact } from '../shared/mask.ts';
import type { ProviderConfig, ResolvedConfig } from '../shared/types.ts';
import { ADAPTERS } from './adapters.ts';
import type { Adapter } from './adapters.ts';
import { ProviderError } from './http.ts';

export interface ChatRequest { system: string; prompt: string; json?: boolean; maxTokens?: number; signal?: AbortSignal }
export interface ChatResponse { text: string; provider: { name: string; model: string } }
export interface Chain { complete(req: ChatRequest): Promise<ChatResponse>; readonly providers: ProviderConfig[] }
export type ChainLog = (level: 'debug' | 'info' | 'warn' | 'error', msg: string) => void;
export interface ChainOptions {
  log?: ChainLog;
  /** Pause before retrying the same key after a 5xx/network error, multiplied by the attempt number. Default 250. */
  retryDelayMs?: number;
  /** Swap adapters (tests). */
  adapters?: Partial<Record<ProviderConfig['name'], Adapter>>;
  now?: () => number;
}

export class ChainExhaustedError extends Error {
  override name = 'ChainExhaustedError';
}

export const DEFAULT_COOLDOWN_SEC = 60;
export const MAX_RETRIES_PER_KEY = 2;

interface KeyState { key: string | null; cooldownUntil: number; disabled: boolean; reason: string }

export class KeyPool {
  readonly keys: KeyState[];
  private cursor = 0;
  constructor(keys: string[]) {
    this.keys = (keys.length ? keys : [null]).map((key) => ({ key, cooldownUntil: 0, disabled: false, reason: '' }));
  }

  /** Next healthy key in round-robin order, skipping `exclude`. */
  next(now: number, exclude: (k: KeyState) => boolean = () => false): KeyState | undefined {
    for (let i = 0; i < this.keys.length; i++) {
      const k = this.keys[(this.cursor + i) % this.keys.length]!;
      if (k.disabled || k.cooldownUntil > now || exclude(k)) continue;
      this.cursor = (this.cursor + i + 1) % this.keys.length;
      return k;
    }
    return undefined;
  }

  describe(now: number): string {
    return this.keys.map((k) => {
      const who = k.key ? `key ${maskKey(k.key)}` : 'no key';
      if (k.disabled) return `${who}: disabled (${k.reason})`;
      if (k.cooldownUntil > now) return `${who}: cooling ${Math.ceil((k.cooldownUntil - now) / 1000)}s (${k.reason})`;
      return `${who}: ${k.reason || 'unused'}`;
    }).join('; ');
  }
}

const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (ms <= 0) { resolve(); return; }
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); reject(signal.reason); }, { once: true });
});

export function createChain(providers: ProviderConfig[], opts: ChainOptions = {}): Chain {
  const log: ChainLog = opts.log ?? (() => {});
  const now = opts.now ?? Date.now;
  const retryDelay = opts.retryDelayMs ?? 250;
  const pools = providers.map((p) => new KeyPool(p.keys));
  const adapterFor = (p: ProviderConfig): Adapter => opts.adapters?.[p.name] ?? ADAPTERS[p.name];

  async function viaProvider(p: ProviderConfig, pool: KeyPool, req: ChatRequest): Promise<string> {
    const attempts = new Map<KeyState, number>();
    const adapter = adapterFor(p);
    for (;;) {
      req.signal?.throwIfAborted();
      const k = pool.next(now(), (s) => (attempts.get(s) ?? 0) > MAX_RETRIES_PER_KEY);
      if (!k) throw new ProviderError(pool.describe(now()) || 'no usable keys', 'client');
      const who = k.key ? maskKey(k.key) : 'no key';
      const tries = attempts.get(k) ?? 0;
      if (tries > 0) await sleep(retryDelay * tries, req.signal);
      try {
        const text = await adapter(p, k.key, { system: req.system, prompt: req.prompt, json: req.json ?? false, maxTokens: req.maxTokens ?? p.maxTokens, signal: req.signal });
        k.reason = 'ok';
        return text;
      } catch (e) {
        if (req.signal?.aborted) throw e;
        const err = e instanceof ProviderError ? e : new ProviderError(e instanceof Error ? e.message : String(e), 'server');
        k.reason = err.message;
        switch (err.kind) {
          case 'rate': {
            const sec = err.retryAfterSec ?? DEFAULT_COOLDOWN_SEC;
            k.cooldownUntil = now() + sec * 1000;
            k.reason = `rate limited: ${err.message}`;
            log('warn', `${p.name} ${who}: rate limited, cooling ${sec}s`);
            break;
          }
          case 'auth':
            k.disabled = true;
            log('warn', `${p.name} ${who}: rejected (${err.message}), disabled for this run`);
            break;
          case 'server':
            attempts.set(k, tries + 1);
            log('warn', `${p.name} ${who}: ${err.message}${tries + 1 > MAX_RETRIES_PER_KEY ? '' : ', retrying'}`);
            break;
          case 'timeout':
            attempts.set(k, MAX_RETRIES_PER_KEY + 1);
            log('warn', `${p.name} ${who}: ${err.message}`);
            break;
          default:
            throw err; // client / unavailable: no key will fix this, fall through to the next provider
        }
      }
    }
  }

  return {
    providers,
    async complete(req) {
      if (!providers.length) throw new ChainExhaustedError('no providers configured');
      const reasons: string[] = [];
      for (let i = 0; i < providers.length; i++) {
        const p = providers[i]!;
        try {
          const text = await viaProvider(p, pools[i]!, req);
          return { text, provider: { name: p.name, model: p.model } };
        } catch (e) {
          if (req.signal?.aborted) throw e;
          const why = redact(e instanceof Error ? e.message : String(e));
          reasons.push(`${p.name}${p.model ? ` (${p.model})` : ''}: ${why}`);
          if (i + 1 < providers.length) log('warn', `${p.name} unavailable, falling back to ${providers[i + 1]!.name}`);
        }
      }
      throw new ChainExhaustedError(`all providers failed. ${reasons.join(' | ')}`);
    },
  };
}

/** One-shot chat through the configured chain. Use createChain to keep key cooldowns across several calls. */
export function completeChat(config: ResolvedConfig, req: ChatRequest, opts: ChainOptions = {}): Promise<ChatResponse> {
  return createChain(config.providers, opts).complete(req);
}
