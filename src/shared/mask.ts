// Secret masking. Every log line and every error message passes through redact().

const known = new Set<string>();

/** Mask a key as `sk-...abcd`. Short values reveal nothing. */
export function maskKey(key: string): string {
  if (!key) return '(none)';
  if (key.length <= 8) return '***';
  const dash = key.indexOf('-');
  const prefix = dash > 0 && dash <= 6 ? key.slice(0, dash + 1) : key.slice(0, Math.min(3, key.length - 8));
  return `${prefix}...${key.slice(-4)}`;
}

/** Remember a secret so redact() strips it from any later text. */
export function registerSecret(value: string | undefined | null): void {
  if (value && value.length >= 4) known.add(value);
}

/** Replace every registered secret in text with its masked form. Longest first so overlapping keys mask cleanly. */
export function redact(text: string): string {
  let out = text;
  for (const s of [...known].sort((a, b) => b.length - a.length)) {
    if (out.includes(s)) out = out.split(s).join(maskKey(s));
  }
  return out;
}
