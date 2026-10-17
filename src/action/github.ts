// Minimal GitHub REST client on global fetch. The token only ever goes into the Authorization header.

const PER_PAGE = 100;
const MAX_PAGES = 30;
const TIMEOUT_MS = 30_000;
const RETRIES = 2;

export class GitHubError extends Error {
  readonly status: number;
  readonly method: string;
  readonly path: string;
  constructor(method: string, path: string, status: number, detail: string) {
    super(`GitHub API ${method} ${path} failed with ${status}: ${detail}${hint(status, method)}`);
    this.name = 'GitHubError';
    this.status = status;
    this.method = method;
    this.path = path;
  }
}

function hint(status: number, method: string): string {
  if (status === 401) return ' (the github-token input is missing or invalid)';
  if (status === 403 && method !== 'GET') return ' (the token cannot write here: grant "pull-requests: write" in the workflow permissions; pull requests from forks get a read-only token)';
  if (status === 404) return ' (check the repository, the pull request number, and that the token can read this repository)';
  return '';
}

export class GitHub {
  readonly baseUrl: string;
  readonly #token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.#token = token;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.#send(method, path, body);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  /** GETs every page of a list endpoint. Stops on a short page, so it works with or without Link headers. */
  async paginate<T>(path: string): Promise<T[]> {
    const out: T[] = [];
    const sep = path.includes('?') ? '&' : '?';
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await this.#send('GET', `${path}${sep}per_page=${PER_PAGE}&page=${page}`);
      const items = (await res.json()) as T[];
      if (!Array.isArray(items)) throw new GitHubError('GET', path, res.status, 'expected a JSON array');
      out.push(...items);
      if (items.length < PER_PAGE) break;
    }
    return out;
  }

  async #send(method: string, path: string, body?: unknown): Promise<Response> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      let res: Response;
      try {
        res = await fetch(this.baseUrl + path, {
          method,
          headers: {
            authorization: `Bearer ${this.#token}`,
            accept: 'application/vnd.github+json',
            'x-github-api-version': '2022-11-28',
            'user-agent': 'codewolf-action',
            ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (err) {
        lastErr = err;
        if (attempt < RETRIES) { await sleep(1000 * (attempt + 1)); continue; }
        throw new Error(`GitHub API ${method} ${path} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (res.ok) return res;
      // Retry server errors and secondary rate limits on reads only, so a POST is never duplicated.
      const retryable = res.status >= 500 || res.status === 429 || (res.status === 403 && res.headers.get('retry-after'));
      if (retryable && method === 'GET' && attempt < RETRIES) {
        const wait = Math.min(Number(res.headers.get('retry-after')) || attempt + 1, 30);
        await res.body?.cancel();
        await sleep(wait * 1000);
        continue;
      }
      throw new GitHubError(method, path, res.status, await errorDetail(res));
    }
    throw lastErr instanceof Error ? lastErr : new Error(`GitHub API ${method} ${path} failed`);
  }
}

async function errorDetail(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const j = JSON.parse(text) as { message?: string; errors?: unknown[] };
    const extra = Array.isArray(j.errors) && j.errors.length ? ' ' + JSON.stringify(j.errors).slice(0, 500) : '';
    return (j.message ?? res.statusText) + extra;
  } catch {
    return text.slice(0, 300) || res.statusText;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
