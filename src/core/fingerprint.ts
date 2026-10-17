import { createHash } from 'node:crypto';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Stable id for a finding: file + normalized title + normalized text of the line it points at. Survives line shifts. */
export function fingerprint(file: string, title: string, lineText: string): string {
  const text = lineText.replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(`${file}\n${norm(title)}\n${text}`).digest('hex').slice(0, 16);
}
