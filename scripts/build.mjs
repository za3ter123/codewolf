// Bundles the CLI and the GitHub Action into self-contained ESM files in dist/ (the Action runs dist/ with no node_modules).
import { build } from 'esbuild';
import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shim = "import { createRequire as __cwCreateRequire } from 'node:module'; const require = __cwCreateRequire(import.meta.url);";
const entries = [
  { in: 'src/cli.ts', out: 'dist/cli.js', banner: '#!/usr/bin/env node\n' + shim },
  { in: 'src/action/index.ts', out: 'dist/action.js', banner: shim },
];
mkdirSync(path.join(root, 'dist'), { recursive: true });
for (const e of entries) {
  const src = path.join(root, e.in);
  if (!existsSync(src)) { console.warn(`build: skipping ${e.in} (not present yet)`); continue; }
  await build({
    entryPoints: [src],
    outfile: path.join(root, e.out),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    banner: { js: e.banner },
    legalComments: 'none',
    logLevel: 'warning',
  });
  if (e.out.endsWith('cli.js')) { try { chmodSync(path.join(root, e.out), 0o755); } catch { /* Windows */ } }
  console.log(`build: ${e.out}`);
}
