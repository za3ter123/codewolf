// Minimal glob matcher: `**`, `*`, `?`, `[...]`, `{a,b}`. A pattern with no `/` matches the basename at any depth,
// like .gitignore. Paths are compared with forward slashes.

const cache = new Map<string, RegExp>();

export function globToRegExp(pattern: string): RegExp {
  const hit = cache.get(pattern);
  if (hit) return hit;
  let p = pattern.replace(/\\/g, '/').trim();
  if (p.startsWith('./')) p = p.slice(2);
  if (!p.includes('/')) p = '**/' + p;
  else if (p.startsWith('/')) p = p.slice(1);
  if (p.endsWith('/')) p += '**';
  let re = '';
  let braces = 0;
  for (let i = 0; i < p.length; i++) {
    const c = p[i]!;
    if (c === '*') {
      if (p[i + 1] === '*') {
        const atStart = i === 0 || p[i - 1] === '/';
        const atEnd = i + 2 === p.length || p[i + 2] === '/';
        if (atStart && atEnd) {
          // `**/` = zero or more directories; trailing `**` = everything below
          if (i + 2 === p.length) re += '.*';
          else { re += '(?:.*/)?'; i++; }
          i++;
          continue;
        }
        re += '[^/]*';
        i++;
        continue;
      }
      re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if (c === '[') {
      const close = p.indexOf(']', i + 1);
      if (close === -1) { re += '\\['; continue; }
      let cls = p.slice(i + 1, close).replace(/\\/g, '\\\\');
      if (cls.startsWith('!')) cls = '^' + cls.slice(1);
      re += `[${cls}]`;
      i = close;
    } else if (c === '{') { braces++; re += '(?:'; }
    else if (c === '}' && braces > 0) { braces--; re += ')'; }
    else if (c === ',' && braces > 0) re += '|';
    else re += c.replace(/[.+^$()|\\]/g, '\\$&');
  }
  const out = new RegExp(`^${re}$`);
  cache.set(pattern, out);
  return out;
}

export function matchGlob(path: string, pattern: string): boolean {
  return globToRegExp(pattern).test(path.replace(/\\/g, '/').replace(/^\.\//, ''));
}

/** Last matching pattern wins; `!pattern` re-includes. Returns true when the path is excluded. */
export function isExcluded(path: string, patterns: readonly string[]): boolean {
  let excluded = false;
  for (const raw of patterns) {
    const neg = raw.startsWith('!');
    const pat = neg ? raw.slice(1) : raw;
    if (pat && matchGlob(path, pat)) excluded = !neg;
  }
  return excluded;
}
