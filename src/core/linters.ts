// Linter fusion: run ruff / eslint / semgrep / gitleaks when they are on PATH, keep only results on added lines.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveSpawn, whichSync } from '../providers/claude-code.ts';
import type { Category, DiffFile, Finding, ResolvedConfig, Severity } from '../shared/types.ts';
import { newLineText } from './diff.ts';
import { fingerprint } from './fingerprint.ts';

export type ToolName = 'ruff' | 'eslint' | 'semgrep' | 'gitleaks';

/** A raw tool result before the changed-line filter. `file` is relative to the repo root or absolute. */
export interface ToolHit { file: string; line: number; code: string; message: string; severity: Severity; category: Category }

const TOOL_TIMEOUT_MS = 120_000;
const MAX_FILES = 200;

export function parseRuff(stdout: string): ToolHit[] {
  const arr = JSON.parse(stdout || '[]') as { filename: string; location?: { row?: number }; code?: string | null; message: string }[];
  return arr.filter((r) => r.location?.row).map((r) => {
    const code = r.code ?? 'ruff';
    const security = /^S\d/.test(code);
    return { file: r.filename, line: r.location!.row!, code, message: r.message, severity: security ? 'major' : 'minor', category: security ? 'security' : /^(E|W|I|N|D|Q|COM)\d*/.test(code) ? 'style' : 'bug' };
  });
}

export function parseEslint(stdout: string): ToolHit[] {
  const arr = JSON.parse(stdout || '[]') as { filePath: string; messages: { line?: number; ruleId?: string | null; message: string; severity: number }[] }[];
  return arr.flatMap((f) => f.messages.filter((m) => m.line && m.ruleId).map((m) => ({
    file: f.filePath, line: m.line!, code: m.ruleId!, message: m.message,
    severity: (m.severity === 2 ? 'minor' : 'nit') as Severity,
    category: (/security|no-eval|no-implied-eval/i.test(m.ruleId!) ? 'security' : 'bug') as Category,
  })));
}

export function parseSemgrep(stdout: string): ToolHit[] {
  const data = JSON.parse(stdout || '{}') as { results?: { path: string; start: { line: number }; check_id: string; extra?: { message?: string; severity?: string } }[] };
  return (data.results ?? []).map((r) => {
    const sev = (r.extra?.severity ?? '').toUpperCase();
    return {
      file: r.path, line: r.start.line, code: r.check_id, message: r.extra?.message ?? r.check_id,
      severity: sev === 'ERROR' ? 'major' : sev === 'WARNING' ? 'minor' : 'nit',
      category: /secur|inject|xss|sqli|crypto|secret/i.test(r.check_id) ? 'security' : 'bug',
    };
  });
}

export function parseGitleaks(stdout: string): ToolHit[] {
  const arr = JSON.parse(stdout || '[]') as { File: string; StartLine: number; RuleID: string; Description?: string }[];
  return arr.map((r) => ({ file: r.File, line: r.StartLine, code: r.RuleID, message: r.Description || `secret matched rule ${r.RuleID}`, severity: 'critical', category: 'security' }));
}

/** Keep hits that land on added lines of changed files and turn them into findings with source `tool:<name>`. */
export function toolFindings(tool: ToolName, hits: ToolHit[], files: DiffFile[], root: string): Finding[] {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const out: Finding[] = [];
  for (const h of hits) {
    const rel = (path.isAbsolute(h.file) ? path.relative(root, h.file) : h.file).replace(/\\/g, '/').replace(/^\.\//, '');
    const f = byPath.get(rel);
    if (!f) continue;
    const added = f.hunks.some((hk) => hk.lines.some((l) => l.type === 'add' && l.newLine === h.line));
    if (!added) continue;
    const title = `${h.code}: ${h.message}`.replace(/\s+/g, ' ').slice(0, 160);
    out.push({
      file: f.path, line: h.line, severity: h.severity, category: h.category, title,
      body: `${tool} reports ${h.code} on this changed line: ${h.message}`,
      source: `tool:${tool}`, effort: 'quick',
      fingerprint: fingerprint(f.path, title, newLineText(f, h.line) ?? ''),
    });
  }
  return out;
}

function exec(cmd: string, args: string[], cwd: string): Promise<{ code: number | null; stdout: string }> {
  return new Promise((resolve) => {
    let spec: ReturnType<typeof resolveSpawn>;
    try { spec = resolveSpawn(cmd, args); } catch { resolve({ code: null, stdout: '' }); return; }
    const child = spawn(spec.file, spec.args, { cwd, windowsHide: true, windowsVerbatimArguments: spec.verbatim, stdio: ['ignore', 'pipe', 'ignore'] });
    let stdout = '';
    const t = setTimeout(() => child.kill(), TOOL_TIMEOUT_MS);
    child.stdout.setEncoding('utf8').on('data', (d: string) => (stdout += d));
    child.on('error', () => { clearTimeout(t); resolve({ code: null, stdout: '' }); });
    child.on('close', (code) => { clearTimeout(t); resolve({ code, stdout }); });
  });
}

const PY = /\.pyi?$/i;
const JS = /\.(m|c)?(j|t)sx?$/i;

/** Run every enabled tool found on PATH. Absent tools and tool crashes are skipped silently. */
export async function runLinters(files: DiffFile[], config: ResolvedConfig, log: (msg: string) => void = () => {}): Promise<Finding[]> {
  const root = config.root;
  const present = files.filter((f) => f.status !== 'deleted' && !f.binary && existsSync(path.join(root, f.path))).slice(0, MAX_FILES);
  if (!present.length) return [];
  // `./` prefix: a file named like a flag (--config=...) must never be parsed as an option
  const rel = (re: RegExp) => present.filter((f) => re.test(f.path)).map((f) => `./${f.path}`);
  const jobs: Promise<Finding[]>[] = [];
  const job = (tool: ToolName, run: () => Promise<ToolHit[]>) => {
    if (!config.tools[tool] || !whichSync(tool)) return;
    jobs.push(run().then((hits) => toolFindings(tool, hits, present, root)).catch((e: unknown) => { log(`${tool} output ignored: ${(e as Error).message}`); return []; }));
  };
  const py = rel(PY), js = rel(JS);
  if (py.length) job('ruff', async () => parseRuff((await exec('ruff', ['check', '--output-format=json', '--exit-zero', '--no-cache', ...py], root)).stdout));
  if (js.length) job('eslint', async () => {
    const r = await exec('eslint', ['--format', 'json', '--no-error-on-unmatched-pattern', ...js], root);
    return r.stdout.trim().startsWith('[') ? parseEslint(r.stdout) : []; // no eslint config: tool prints an error, skip
  });
  const semgrepCfg = ['.semgrep.yml', '.semgrep.yaml', '.semgrep'].find((c) => existsSync(path.join(root, c)));
  if (semgrepCfg) job('semgrep', async () => parseSemgrep((await exec('semgrep', ['scan', '--json', '--quiet', '--metrics=off', '--config', semgrepCfg, ...present.map((f) => `./${f.path}`)], root)).stdout));
  job('gitleaks', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'cw-gitleaks-'));
    try {
      const hits: ToolHit[] = [];
      for (const f of present) {
        const report = path.join(dir, 'r.json');
        await exec('gitleaks', ['detect', '--no-git', '--no-banner', '--exit-code', '0', '--report-format', 'json', '--report-path', report, '--source', `./${f.path}`], root);
        if (existsSync(report)) hits.push(...parseGitleaks(readFileSync(report, 'utf8')).map((h) => ({ ...h, file: f.path })));
        rmSync(report, { force: true });
      }
      return hits;
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  return (await Promise.all(jobs)).flat();
}
