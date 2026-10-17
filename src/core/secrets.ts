// Deterministic hardcoded-secret scanner over added lines. No LLM involved.
import { maskKey } from '../shared/mask.ts';
import type { DiffFile, Finding } from '../shared/types.ts';
import { fingerprint } from './fingerprint.ts';

interface Rule { kind: string; re: RegExp; generic?: boolean }

// Patterns are written so their own source text never matches them (keeps repo secret scans clean).
const RULES: Rule[] = [
  { kind: 'AWS access key id', re: /\b((?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16})\b/ },
  { kind: 'private key block', re: /(-----BEGIN [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----)/ },
  { kind: 'GitHub token', re: /\b(gh[pousr]_[A-Za-z0-9]{36,255})\b/ },
  { kind: 'GitHub fine-grained token', re: /\b(github_pat_[A-Za-z0-9_]{60,255})\b/ },
  { kind: 'Slack token', re: /\b(xox[abposr]-[A-Za-z0-9-]{10,})/ },
  { kind: 'Slack webhook URL', re: /(https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]{20,})/ },
  { kind: 'Anthropic API key', re: /\b(sk-ant-[A-Za-z0-9_-]{20,})/ },
  { kind: 'OpenAI API key', re: /\b(sk-(?!ant-)(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,})/ },
  { kind: 'Google API key', re: /\b(AIza[0-9A-Za-z_-]{35})/ },
  { kind: 'Stripe live secret key', re: /\b((?:sk|rk)_live_[0-9a-zA-Z]{20,})/ },
  {
    kind: 'credential',
    generic: true,
    re: /(?:api[_-]?key|apikey|secret[_-]?key|client[_-]?secret|secret|auth[_-]?token|access[_-]?token|token|passwd|password|access[_-]?key)["']?\s*(?::=|=>|[:=])\s*["'`]([^"'`\s]{16,})["'`]/i,
  },
];

const PLACEHOLDER = /^(?:x{3,}|\*{3,}|<[^>]*>|\$\{|\{\{|your[_-]|change[_-]?me|example|dummy|sample|fake|placeholder|redacted|test|todo)|xxxx|process\.env|os\.environ|getenv/i;
const MIN_ENTROPY = 3.5;

/** Shannon entropy in bits per character. */
export function entropy(s: string): number {
  const freq = new Map<string, number>();
  for (const c of s) freq.set(c, (freq.get(c) ?? 0) + 1);
  let h = 0;
  for (const n of freq.values()) { const p = n / s.length; h -= p * Math.log2(p); }
  return h;
}

/** First secret on a line, or undefined. */
export function detectSecret(line: string): { kind: string; value: string } | undefined {
  for (const r of RULES) {
    const m = line.match(r.re);
    if (!m) continue;
    const value = m[1]!;
    if (r.generic && (PLACEHOLDER.test(value) || entropy(value) < MIN_ENTROPY)) continue;
    return { kind: r.kind, value };
  }
  return undefined;
}

export function scanSecrets(files: DiffFile[]): Finding[] {
  const out: Finding[] = [];
  for (const f of files) {
    if (f.binary) continue;
    for (const h of f.hunks) {
      for (const l of h.lines) {
        if (l.type !== 'add' || l.newLine === undefined) continue;
        const hit = detectSecret(l.text);
        if (!hit) continue;
        const title = `Hardcoded ${hit.kind}`;
        out.push({
          file: f.path,
          line: l.newLine,
          severity: 'critical',
          category: 'security',
          title,
          body: `This line adds what looks like a ${hit.kind} (${hit.kind === 'private key block' ? 'PEM header' : maskKey(hit.value)}). Anyone who can read the repository or its history can use it. Remove it, rotate the credential now (it stays in git history), and load it from an environment variable or a secret manager.`,
          source: 'builtin',
          effort: 'quick',
          fingerprint: fingerprint(f.path, title, l.text),
        });
      }
    }
  }
  return out;
}
