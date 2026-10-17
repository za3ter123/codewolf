// Tolerant JSON extraction for model output: fences, prose around the object, trailing commas, comments,
// raw newlines inside strings, Python literals, smart quotes and truncated output.

/** Character-level cleanup outside/inside strings. Returns text that JSON.parse is far more likely to accept. */
export function sanitizeJson(src: string): string {
  let out = '';
  let inStr = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (inStr) {
      if (c === '\\') { out += c + (src[i + 1] ?? ''); i++; continue; }
      if (c === '"') { inStr = false; out += c; continue; }
      if (c === '\n') { out += '\\n'; continue; }
      if (c === '\r') continue;
      if (c === '\t') { out += '\\t'; continue; }
      out += c;
      continue;
    }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && src[i + 1] === '*') { const end = src.indexOf('*/', i + 2); i = end === -1 ? src.length : end + 1; continue; }
    if (c === ',') {
      let j = i + 1;
      while (j < src.length && /\s/.test(src[j]!)) j++;
      if (src[j] === '}' || src[j] === ']') continue; // trailing comma
    }
    const word = src.slice(i).match(/^(True|False|None|undefined)\b/);
    if (word && !/[\w$]/.test(src[i - 1] ?? '')) {
      out += word[1] === 'True' ? 'true' : word[1] === 'False' ? 'false' : 'null';
      i += word[1]!.length - 1;
      continue;
    }
    out += c;
  }
  return out;
}

/** Index of the bracket closing the one at `start`, or -1 if the text ends first. String-aware. */
function matchBracket(s: string, start: number): number {
  const stack: string[] = [];
  let inStr = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i]!;
    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']');
    else if (c === '}' || c === ']') {
      if (stack.pop() !== c) return -1;
      if (!stack.length) return i;
    }
  }
  return -1;
}

/** Close a truncated JSON document: finish an open string, drop a dangling key or comma, close open brackets. */
export function closeTruncated(s: string): string {
  const stack: string[] = [];
  let inStr = false;
  let lastSafe = 0; // position after the last complete value at any depth
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') { inStr = false; lastSafe = i + 1; }
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']');
    else if (c === '}' || c === ']') { stack.pop(); lastSafe = i + 1; }
    else if (/[\d\w]/.test(c)) lastSafe = i + 1;
  }
  let body = inStr ? s + '"' : s.slice(0, Math.max(lastSafe, 1));
  // drop a dangling key (`, "ke` / `{"ke`) or trailing comma left by the cut
  body = body.replace(/,\s*$/, '').replace(/,\s*"[^"]*"\s*:?\s*$/, '').replace(/\{\s*"[^"]*"\s*:?\s*$/, '{').replace(/:\s*$/, ': null');
  // recompute what is still open after trimming
  const open: string[] = [];
  let str = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i]!;
    if (str) { if (c === '\\') i++; else if (c === '"') str = false; continue; }
    if (c === '"') str = true;
    else if (c === '{' || c === '[') open.push(c === '{' ? '}' : ']');
    else if (c === '}' || c === ']') open.pop();
  }
  return body + open.reverse().join('');
}

const MAX_STARTS = 40;

function tryParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return undefined; }
}

function candidates(text: string): string[] {
  const out: string[] = [];
  const fence = /```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)```/g;
  for (const m of text.matchAll(fence)) if (/[{[]/.test(m[1]!)) out.push(m[1]!.trim());
  const unterminated = text.match(/```[a-zA-Z0-9_-]*\s*\n([\s\S]*)$/);
  if (unterminated && !unterminated[1]!.includes('```')) out.push(unterminated[1]!.trim());
  out.push(text);
  return out;
}

/**
 * Pull the first JSON object (or array) out of model output. Returns undefined when nothing parseable is found.
 * A top-level array is returned as-is; callers decide what it means.
 */
export function extractJson(raw: string): unknown {
  const text = raw.replace(/^\uFEFF/, '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/[“”]/g, '"').trim();
  for (const cand of candidates(text)) {
    const direct = tryParse(cand);
    if (direct !== undefined && typeof direct === 'object' && direct !== null) return direct;
    const clean = sanitizeJson(sanitizeJson(cand)); // second pass drops commas that were followed by a comment
    let tries = 0;
    for (let start = clean.search(/[{[]/); start !== -1 && tries < MAX_STARTS; start = nextStart(clean, start), tries++) {
      const end = matchBracket(clean, start);
      const slice = end === -1 ? clean.slice(start) : clean.slice(start, end + 1);
      const v = tryParse(slice) ?? (end === -1 ? tryParse(closeTruncated(slice)) : undefined);
      if (v !== undefined && typeof v === 'object' && v !== null) return v;
    }
  }
  return undefined;
}

function nextStart(s: string, from: number): number {
  const i = s.slice(from + 1).search(/[{[]/);
  return i === -1 ? -1 : from + 1 + i;
}
