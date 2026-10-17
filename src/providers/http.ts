import { redact } from '../shared/mask.ts';

/**
 * rate: 429, cool the key. auth: 401/403, disable the key. server: 5xx / network, retry.
 * timeout: request took too long, move on without retrying the same key. client: other 4xx or a bad response,
 * the provider cannot serve this request with any key. unavailable: the provider is not installed or reachable at all.
 */
export type FailureKind = 'rate' | 'auth' | 'server' | 'timeout' | 'client' | 'unavailable';

export class ProviderError extends Error {
  override name = 'ProviderError';
  readonly kind: FailureKind;
  readonly status: number | undefined;
  readonly retryAfterSec: number | undefined;
  /** Raw error response body, for providers that put structured detail in it (publik's 402 top_up_url). */
  readonly body: string | undefined;
  constructor(message: string, kind: FailureKind, status?: number, retryAfterSec?: number, body?: string) {
    super(redact(message));
    this.kind = kind;
    this.status = status;
    this.retryAfterSec = retryAfterSec;
    this.body = body;
  }
}

const MAX_RETRY_AFTER_SEC = 3600;

/** `Retry-After` as seconds (delta or HTTP date). Undefined when absent or unparseable. */
export function parseRetryAfter(v: string | null | undefined, now = Date.now()): number | undefined {
  if (!v) return undefined;
  const t = v.trim();
  if (/^\d+(\.\d+)?$/.test(t)) return Math.min(Math.ceil(Number(t)), MAX_RETRY_AFTER_SEC);
  const d = Date.parse(t);
  if (Number.isNaN(d)) return undefined;
  return Math.min(Math.max(0, Math.ceil((d - now) / 1000)), MAX_RETRY_AFTER_SEC);
}

export function classifyStatus(status: number): FailureKind {
  if (status === 429) return 'rate';
  if (status === 401 || status === 403) return 'auth';
  if (status === 408 || status === 409 || status >= 500) return 'server';
  return 'client';
}

function errorText(body: string): string {
  try {
    const j = JSON.parse(body) as { error?: { message?: string } | string; message?: string };
    const m = typeof j.error === 'string' ? j.error : j.error?.message ?? j.message;
    if (m) return String(m).slice(0, 300);
  } catch { /* not JSON */ }
  return body.replace(/\s+/g, ' ').trim().slice(0, 300);
}

export interface PostOptions { timeoutMs: number; signal?: AbortSignal | undefined }

/** POST JSON and return the parsed JSON body. Throws ProviderError with a failure kind; never includes secrets. */
export async function postJson(url: string, headers: Record<string, string>, body: unknown, opts: PostOptions): Promise<unknown> {
  const timeout = AbortSignal.timeout(opts.timeoutMs);
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal });
  } catch (e) {
    if (opts.signal?.aborted) throw e;
    if (timeout.aborted) throw new ProviderError(`timed out after ${Math.round(opts.timeoutMs / 1000)}s`, 'timeout');
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const code = err.cause?.code ?? '';
    const detail = err.cause?.message ?? err.message;
    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EAI_AGAIN') throw new ProviderError(`cannot reach ${new URL(url).host}: ${detail}`, 'unavailable');
    throw new ProviderError(`network error: ${detail}`, 'server');
  }
  let text: string;
  try { text = await res.text(); } catch (e) {
    if (opts.signal?.aborted) throw e;
    if (timeout.aborted) throw new ProviderError(`timed out after ${Math.round(opts.timeoutMs / 1000)}s`, 'timeout');
    throw new ProviderError(`network error reading response: ${(e as Error).message}`, 'server');
  }
  if (!res.ok) {
    const kind = classifyStatus(res.status);
    throw new ProviderError(`HTTP ${res.status}: ${errorText(text) || res.statusText}`, kind, res.status, parseRetryAfter(res.headers.get('retry-after')), text);
  }
  try { return JSON.parse(text); } catch { throw new ProviderError(`response is not JSON: ${text.slice(0, 120)}`, 'server', res.status); }
}
