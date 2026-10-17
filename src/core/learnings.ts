import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function learningsPath(root: string): string {
  return path.join(root, '.codewolf', 'learnings.md');
}

/** Plain lines from `.codewolf/learnings.md`; bullets stripped, headings, comments and blanks skipped. */
export function readLearnings(root: string): string[] {
  const file = learningsPath(root);
  if (!existsSync(file)) return [];
  let text: string;
  try { text = readFileSync(file, 'utf8'); } catch { return []; }
  return text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^(?:[-*+]|\d+[.)])\s+/, '').trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('<!--'));
}

/** Append one learning as a bullet. Newlines inside the text are flattened so one learning stays one line. */
export function appendLearning(root: string, text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) throw new Error('learning text is empty');
  const file = learningsPath(root);
  mkdirSync(path.dirname(file), { recursive: true });
  let prefix = '';
  if (!existsSync(file)) prefix = '# CodeWolf learnings\n\n<!-- Reviewer preferences for this repo, one per line. CodeWolf adds them to every review prompt. -->\n\n';
  else {
    const cur = readFileSync(file, 'utf8');
    if (cur.length && !cur.endsWith('\n')) prefix = '\n';
  }
  appendFileSync(file, `${prefix}- ${clean}\n`);
  return file;
}

export const GUIDELINE_FILES = ['CLAUDE.md', 'AGENTS.md', '.cursorrules', '.github/copilot-instructions.md'];
export const GUIDELINES_CAP = 4000;

/** Concatenate repo agent-guideline files into one excerpt capped at ~4k chars. */
export function readGuidelines(root: string, cap = GUIDELINES_CAP): string {
  const parts: string[] = [];
  let used = 0;
  for (const name of GUIDELINE_FILES) {
    const file = path.join(root, name);
    if (!existsSync(file)) continue;
    let text: string;
    try { text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(); } catch { continue; }
    if (!text) continue;
    const room = cap - used - name.length - 8;
    if (room <= 200) break;
    const body = text.length > room ? text.slice(0, room).replace(/\n[^\n]*$/, '') + '\n[...truncated]' : text;
    parts.push(`From ${name}:\n${body}`);
    used += body.length + name.length + 8;
  }
  return parts.join('\n\n');
}
