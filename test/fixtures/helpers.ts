// Shared test helpers: local fake HTTP servers, sample diffs, runtime-built secret-shaped strings.
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ProviderConfig, ResolvedConfig } from '../../src/shared/types.ts';
import { DEFAULT_EXCLUDES } from '../../src/core/config.ts';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CLI_SRC = path.join(ROOT, 'src', 'cli.ts');

// Secret-shaped strings are assembled at runtime so the repository never contains one.
export const fakeAws = () => 'AKIA' + 'Z7XB2M4KD9PL3QTW';
export const fakeGithub = () => 'gh' + 'p_' + 'aB3dE5fG7hJ9kL1mN3pQ5rS7tU9vW1xY3z5A';
export const fakeOpenAI = () => 'sk-' + 'proj-' + 'Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78';
export const fakeAnthropic = () => 'sk-' + 'ant-' + 'api03-' + 'Zx9Yw8Vu7Ts6Rq5Po4Nm3Lk2';
export const pemHeader = () => '-----BEGIN ' + 'RSA PRIVATE' + ' KEY-----';

export const FIXTURE_DIFF = [
  'diff --git a/src/app.py b/src/app.py',
  'index 1111111..2222222 100644',
  '--- a/src/app.py',
  '+++ b/src/app.py',
  '@@ -10,4 +10,7 @@ import sqlite3',
  ' ',
  ' def get_user(db, user_id):',
  '-    return db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()',
  '+    cur = db.cursor()',
  '+    cur.execute(f"SELECT * FROM users WHERE id = {user_id}")',
  '+    return cur.fetchone()',
  `+AWS_ACCESS_KEY_ID = "${fakeAws()}"`,
  ' ',
  '',
].join('\n');

export const CANNED = {
  summary: 'Switches get_user to a raw cursor query.',
  walkthrough: [{ file: 'src/app.py', change: 'Rewrites get_user with an f-string query.' }],
  findings: [
    { file: 'src/app.py', line: 13, severity: 'critical', category: 'security', title: 'SQL injection via f-string query', body: 'user_id is interpolated into SQL.', suggestion: '    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))', effort: 'quick' },
    { file: 'src/app.py', line: 999, severity: 'major', category: 'bug', title: 'HALLUCINATED_LINE', body: 'x' },
    { file: 'src/ghost.py', line: 3, severity: 'major', category: 'bug', title: 'HALLUCINATED_FILE', body: 'x' },
  ],
};
export const CANNED_TEXT = 'Here is my review:\n```json\n' + JSON.stringify(CANNED, null, 2) + '\n```\nDone.';

export interface Logged { method: string; url: string; headers: http.IncomingHttpHeaders; body: string }
export interface FakeServer { port: number; url: string; log: Logged[]; close: () => Promise<void> }

export function startServer(handler: (req: http.IncomingMessage, body: string, res: http.ServerResponse) => void | Promise<void>): Promise<FakeServer> {
  const log: Logged[] = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c: Buffer) => (body += c));
    req.on('end', async () => {
      log.push({ method: req.method ?? '', url: req.url ?? '', headers: req.headers, body });
      await handler(req, body, res);
    });
  });
  server.unref(); // a failed assertion before close() must not keep the test process alive
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    const port = (server.address() as { port: number }).port;
    resolve({ port, url: `http://127.0.0.1:${port}`, log, close: () => new Promise<void>((r) => { server.closeAllConnections(); server.close(() => r()); }) });
  }));
}

export function sendJson(res: http.ServerResponse, status: number, obj: unknown, headers: Record<string, string> = {}): void {
  res.writeHead(status, { 'content-type': 'application/json', ...headers });
  res.end(JSON.stringify(obj));
}

export const openaiReply = (content: string) => ({ choices: [{ index: 0, message: { role: 'assistant', content } }] });

export function provider(over: Partial<ProviderConfig> = {}): ProviderConfig {
  return { name: 'openai', model: 'fake', baseUrl: 'http://127.0.0.1:1/v1', keys: [], timeoutMs: 5000, maxTokens: 1000, ...over };
}

export function config(over: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    profile: 'assertive', language: 'en', providers: [provider()],
    review: { exclude: [...DEFAULT_EXCLUDES], pathInstructions: [], failOn: 'none', concurrency: 4, maxChunkTokens: 12000, guidelines: false },
    tools: { ruff: false, eslint: false, semgrep: false, gitleaks: false },
    learnings: [], guidelines: '', root: ROOT,
    ...over,
  };
}

export function tmpDir(prefix = 'cwtest-'): string {
  // Long path form: Windows runners hand out 8.3 temp paths (RUNNER~1) while git reports the long one.
  return realpathSync.native(mkdtempSync(path.join(tmpdir(), prefix)));
}

export function tmpFile(name: string, content: string): string {
  const p = path.join(tmpDir(), name);
  writeFileSync(p, content);
  return p;
}

/** Env with every key-like variable blanked so tests never reach a real provider. */
export function cleanEnv(extra: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = /API_KEY|_KEYS$|GITHUB_TOKEN|GH_TOKEN|OLLAMA_HOST/i.test(k) ? '' : v;
  return { ...env, NO_COLOR: '1', ...extra };
}

export function runCli(args: string[], opts: { cwd?: string; env?: Record<string, string>; input?: string } = {}): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI_SRC, ...args], { cwd: opts.cwd ?? ROOT, env: opts.env ?? cleanEnv(), windowsHide: true });
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8').on('data', (d: string) => (stdout += d));
    child.stderr.setEncoding('utf8').on('data', (d: string) => (stderr += d));
    child.stdin.end(opts.input ?? '');
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}
