#!/usr/bin/env node
// Optional Claude Code Stop hook: blocks stopping while CodeWolf reports critical findings
// on uncommitted changes. Off by default; see hook-example/README.md to enable it.
import { spawnSync } from 'node:child_process';

let input = {};
try {
  const raw = await new Promise((resolve) => {
    let b = '';
    process.stdin.on('data', (c) => (b += c));
    process.stdin.on('end', () => resolve(b));
  });
  input = raw.trim() ? JSON.parse(raw) : {};
} catch {
  input = {};
}

// Claude is already continuing because of this hook once; let it stop to avoid a loop.
if (input.stop_hook_active) process.exit(0);

const cwd = input.cwd || process.cwd();
const status = spawnSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8', windowsHide: true });
if (status.status !== 0 || !status.stdout.trim()) process.exit(0);

const args = ['review', '--format', 'plain', '--fail-on', 'critical'];
const hasBinary = spawnSync('codewolf', ['--version'], { cwd, shell: true, windowsHide: true }).status === 0;
const [cmd, cmdArgs] = hasBinary ? ['codewolf', args] : ['npx', ['-y', 'github:za3ter123/codewolf', ...args]];
const run = spawnSync(cmd, cmdArgs, { cwd, shell: true, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });

if (run.status === 1) {
  const findings = run.stdout.trim().split('\n').slice(0, 60).join('\n');
  process.stderr.write(`CodeWolf found critical issues in the uncommitted changes. Fix them (or explain why they are false positives) before stopping:\n\n${findings}\n`);
  process.exit(2);
}
if (run.status !== 0) {
  // CodeWolf could not run (no provider, network). Never trap the session because of that.
  process.stderr.write(`CodeWolf stop hook skipped: review exited with ${run.status}.\n`);
}
process.exit(0);
