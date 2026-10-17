// Output formats for `codewolf review`: pretty (TTY), plain (agents), markdown, json, ndjson (--agent).
import type { Finding, ReviewResult } from '../shared/types.ts';

export type Format = 'pretty' | 'plain' | 'markdown' | 'json';

function loc(f: Finding): string {
  return `${f.file}:${f.line}${f.endLine ? `-${f.endLine}` : ''}`;
}

function counts(r: ReviewResult): string {
  const parts = Object.entries(r.stats.bySeverity).filter(([, n]) => n > 0).map(([s, n]) => `${n} ${s}`);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

function via(r: ReviewResult): string {
  return r.provider.model ? `${r.provider.name}/${r.provider.model}` : r.provider.name;
}

/** Compact agent format: one block per finding, `file:line severity category title`, body, suggestion. */
export function formatPlain(r: ReviewResult): string {
  const blocks = r.findings.map((f) => {
    const lines = [`${loc(f)} ${f.severity} ${f.category} ${f.title}`, f.body];
    if (f.suggestion !== undefined) lines.push('suggestion:', f.suggestion);
    if (f.rewrite) lines.push(`rewrite (${f.rewrite.language}): ${f.rewrite.reason}`);
    return lines.join('\n');
  });
  const tail = r.findings.length
    ? `codewolf: ${r.findings.length} finding(s)${counts(r)} in ${r.stats.files} file(s) via ${via(r)}`
    : `codewolf: no findings in ${r.stats.files} file(s) via ${via(r)}`;
  return [...blocks, tail].join('\n\n') + '\n';
}

const mdCell = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

function fence(code: string, lang = ''): string {
  const ticks = code.includes('```') ? '````' : '```';
  return `${ticks}${lang}\n${code}\n${ticks}`;
}

export function formatMarkdown(r: ReviewResult): string {
  const out: string[] = ['# CodeWolf review', '', r.summary, ''];
  out.push(`Review effort: ${r.effort.score}/5, about ${r.effort.minutes} min. Model: ${via(r)}.`, '');
  if (r.walkthrough.length) {
    out.push('## Walkthrough', '', '| File | Change |', '| --- | --- |');
    for (const w of r.walkthrough) out.push(`| \`${mdCell(w.file)}\` | ${mdCell(w.change)} |`);
    out.push('');
  }
  if (r.diagram) out.push('## Flow', '', fence(r.diagram, 'mermaid'), '');
  out.push(`## Findings: ${r.findings.length}${counts(r)}`, '');
  for (const f of r.findings) {
    out.push(`### ${f.severity} / ${f.category}: ${f.title}`, '', `\`${loc(f)}\`${f.source !== 'llm' ? ` (${f.source})` : ''}`, '', f.body, '');
    if (f.suggestion !== undefined) out.push('Suggested replacement:', '', fence(f.suggestion), '');
    if (f.rewrite) out.push(`Rewrite in ${f.rewrite.language}: ${f.rewrite.reason}`, '', fence(f.rewrite.code, f.rewrite.language.toLowerCase()), '');
  }
  if (r.warnings?.length) out.push('## Warnings', '', ...r.warnings.map((w) => `- ${w}`), '');
  return out.join('\n');
}

const C = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', gray: '\x1b[90m', green: '\x1b[32m' };
const SEV_COLOR: Record<string, string> = { critical: C.red, major: C.yellow, minor: C.cyan, nit: C.gray };

export function formatPretty(r: ReviewResult, color: boolean): string {
  const c = (code: string, s: string) => (color ? `${code}${s}${C.reset}` : s);
  const out: string[] = [c(C.bold, 'CodeWolf review'), r.summary, ''];
  for (const w of r.walkthrough) out.push(`  ${c(C.dim, w.file)}  ${w.change}`);
  if (r.walkthrough.length) out.push('');
  for (const f of r.findings) {
    out.push(`${c(SEV_COLOR[f.severity] ?? '', f.severity.toUpperCase().padEnd(8))} ${c(C.bold, f.title)}`);
    out.push(`         ${c(C.dim, `${loc(f)} ${f.category}${f.source !== 'llm' ? ` ${f.source}` : ''}`)}`);
    for (const l of f.body.split('\n')) out.push(`         ${l}`);
    if (f.suggestion !== undefined) for (const l of f.suggestion.split('\n')) out.push(`         ${c(C.green, `+ ${l}`)}`);
    if (f.rewrite) out.push(`         ${c(C.dim, `rewrite in ${f.rewrite.language}: ${f.rewrite.reason}`)}`);
    out.push('');
  }
  out.push(r.findings.length ? `${r.findings.length} finding(s)${counts(r)}` : c(C.green, 'No findings.'));
  out.push(c(C.dim, `${r.stats.files} file(s), effort ${r.effort.score}/5 (~${r.effort.minutes} min), ${via(r)}`));
  return out.join('\n') + '\n';
}

/** --agent: one JSON finding per line, then a summary line. */
export function formatNdjson(r: ReviewResult): string {
  const lines = r.findings.map((f) => JSON.stringify({ type: 'finding', ...f }));
  lines.push(JSON.stringify({ type: 'summary', summary: r.summary, stats: r.stats, effort: r.effort, provider: r.provider, walkthrough: r.walkthrough, ...(r.warnings?.length ? { warnings: r.warnings } : {}) }));
  return lines.join('\n') + '\n';
}

export function formatResult(r: ReviewResult, format: Format, color: boolean): string {
  switch (format) {
    case 'json': return JSON.stringify(r, null, 2) + '\n';
    case 'markdown': return formatMarkdown(r);
    case 'pretty': return formatPretty(r, color);
    default: return formatPlain(r);
  }
}
