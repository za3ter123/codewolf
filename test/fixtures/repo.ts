// Temp git repos, seeded findings stores and fake agent binaries for the agent-integration commands.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { writeStore } from '../../src/core/store.ts';
import type { StoredFinding } from '../../src/core/store.ts';
import { tmpDir } from './helpers.ts';

// The temp dir can sit inside a git repo (a home directory under version control); never let a test find that repo.
process.env.GIT_CEILING_DIRECTORIES = tmpdir();

export function git(dir: string, ...args: string[]): string {
  const r = spawnSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...args], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

/** A repo with one commit containing app.py (lines: def a, return 1, blank, def b, return 2). */
export function tempRepo(): string {
  const dir = tmpDir('cwrepo-');
  git(dir, 'init', '-q', '-b', 'main');
  writeFileSync(path.join(dir, 'app.py'), 'def a():\n    return 1\n\ndef b():\n    return 2\n');
  git(dir, 'add', 'app.py');
  git(dir, 'commit', '-q', '-m', 'init');
  return dir;
}

export function finding(over: Partial<StoredFinding> = {}): StoredFinding {
  return {
    id: 'aaaa1111', status: 'open', snippet: '    return 1', file: 'app.py', line: 2, severity: 'major', category: 'bug',
    title: 'Returns the wrong value', body: 'a() should return 0.', suggestion: '    return 0', source: 'llm', fingerprint: 'aaaa1111bbbb2222', ...over,
  };
}

export function seed(dir: string, findings: StoredFinding[]): void {
  writeStore(dir, { version: 1, head: null, reviewedAt: new Date().toISOString(), findings });
}

/**
 * A directory holding a fake CLI named `name` that records its argv and stdin as JSON in $FAKE_OUT and exits $FAKE_EXIT.
 * Windows gets a .cmd shim (the path real npm-installed agents take), POSIX a sh script.
 */
export function fakeBin(name: string, dir = tmpDir('cwbin-')): string {
  writeFileSync(path.join(dir, `${name}.mjs`), [
    "import { writeFileSync } from 'node:fs';",
    "let input = ''; process.stdin.setEncoding('utf8').on('data', (d) => (input += d)).on('end', () => {",
    "  writeFileSync(process.env.FAKE_OUT, JSON.stringify({ args: process.argv.slice(2), input }));",
    "  process.stdout.write(process.env.FAKE_STDOUT ?? '');",
    "  process.exit(Number(process.env.FAKE_EXIT ?? 0));",
    '});',
  ].join('\n'));
  if (process.platform === 'win32') writeFileSync(path.join(dir, `${name}.cmd`), `@"${process.execPath}" "%~dp0${name}.mjs" %*\r\n`);
  else {
    writeFileSync(path.join(dir, name), `#!/bin/sh\nexec "${process.execPath}" "$(dirname "$0")/${name}.mjs" "$@"\n`);
    chmodSync(path.join(dir, name), 0o755);
  }
  return dir;
}

/** Env overrides that hide the agent the test suite itself may be running under. */
export function noAgent(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(process.env)) if (/^(CLAUDECODE|CLAUDE_CODE_ENTRYPOINT|CODEX_SANDBOX|CODEX_HOME|CURSOR_AGENT|GEMINI_CLI|OPENCODE|AIDER_.*)$/.test(k)) out[k] = '';
  return out;
}

/** PATH with `dir` first. */
export function pathWith(dir: string): Record<string, string> {
  const key = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
  return { [key]: dir + path.delimiter + (process.env[key] ?? '') };
}
