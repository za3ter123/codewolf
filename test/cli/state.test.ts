import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { prepareReview } from '../../src/cli/state.ts';
import { parseDiff } from '../../src/core/diff.ts';
import { FIXTURE_DIFF, cleanEnv, config, openaiReply, runCli, sendJson, startServer, tmpDir } from '../fixtures/helpers.ts';

function repo(): { dir: string; g: (...a: string[]) => string } {
  const dir = tmpDir('cwstate-');
  const g = (...args: string[]) => {
    const r = spawnSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...args], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout;
  };
  g('init', '-q', '-b', 'main');
  writeFileSync(path.join(dir, 'app.py'), 'def a():\n    return 1\n');
  g('add', 'app.py');
  g('commit', '-q', '-m', 'init');
  writeFileSync(path.join(dir, 'app.py'), 'def a(x):\n    q = f"SELECT {x}"\n    return q\n');
  return { dir, g };
}

const ANSWER = JSON.stringify({
  summary: 'Builds a query from input.',
  walkthrough: [{ file: 'app.py', change: 'Adds a query.' }],
  findings: [
    { file: 'app.py', line: 2, severity: 'critical', category: 'security', title: 'SQL built from input', body: 'x goes into SQL.', cwe: 'CWE-89' },
    { file: 'app.py', line: 50, severity: 'major', category: 'bug', title: 'Off the hunks', body: 'b' },
    { file: 'ghost.py', line: 1, severity: 'major', category: 'bug', title: 'GHOST', body: 'b' },
  ],
});

test('host-agent mode: packet, then ingest validates the answer, prints it, and stores findings in the git dir', async () => {
  const { dir, g } = repo();
  const env = cleanEnv();
  const p = await runCli(['packet', '--no-tools'], { cwd: dir, env });
  assert.equal(p.code, 0, p.stderr);
  const packet = JSON.parse(p.stdout);
  assert.deepEqual(packet.chunks.map((c: { files: string[] }) => c.files), [['app.py']]);
  assert.match(packet.chunks[0].diff, /   2 \+     q = f"SELECT/);

  const r = await runCli(['ingest', '-', '--format', 'plain', '--fail-on', 'critical', '--no-tools'], { cwd: dir, env, input: ANSWER });
  assert.equal(r.code, 1, r.stderr);
  assert.match(r.stdout, /^app\.py:2 critical issue security SQL built from input$/m);
  assert.match(r.stdout, /outside the diff \(1[^\n]*\n\napp\.py:50 major issue bug Off the hunks/);
  assert.doesNotMatch(r.stdout, /GHOST/);
  assert.match(r.stdout, /via host-agent/);
  assert.ok(existsSync(path.join(dir, '.git', 'codewolf', 'findings.json')));
  assert.equal(g('status', '--porcelain').trim(), 'M app.py', 'no state in the work tree');

  const j = await runCli(['ingest', '-', '--format', 'json', '--no-tools'], { cwd: dir, env, input: ANSWER });
  assert.equal(j.code, 0, j.stderr);
  const res = JSON.parse(j.stdout);
  assert.equal(res.findings[0].cwe, 'CWE-89');
  assert.equal(res.outsideDiff.length, 1);
  assert.equal((await runCli(['ingest', '-', '--no-tools'], { cwd: dir, env, input: 'nothing useful' })).code, 2);
  assert.equal((await runCli(['ingest', '--no-tools'], { cwd: dir, env })).code, 2);
});

test('findings lists and relocates stored findings; dismiss suppresses them (and --learn saves the reason); --clear empties', async () => {
  const { dir } = repo();
  const env = cleanEnv();
  assert.equal((await runCli(['ingest', '-', '--no-tools'], { cwd: dir, env, input: ANSWER })).code, 0);
  const f1 = await runCli(['findings'], { cwd: dir, env });
  assert.equal(f1.code, 0, f1.stderr);
  const row = f1.stdout.match(/^([0-9a-f]{8}) app\.py:2 critical issue SQL built from input$/m);
  assert.ok(row, f1.stdout);
  assert.match(f1.stdout, /^[0-9a-f]{8} app\.py:50 major issue Off the hunks$/m);

  writeFileSync(path.join(dir, 'app.py'), '# header\ndef a(x):\n    q = f"SELECT {x}"\n    return q\n');
  assert.match((await runCli(['findings'], { cwd: dir, env })).stdout, new RegExp(`^${row[1]} app\\.py:3 critical`, 'm'), 'relocated after an edit');

  const d = await runCli(['dismiss', row[1]!, '--reason', 'x is an int validated upstream', '--learn'], { cwd: dir, env });
  assert.equal(d.code, 0, d.stderr);
  assert.match(readFileSync(path.join(dir, '.codewolf', 'learnings.md'), 'utf8'), /- x is an int validated upstream/);
  assert.doesNotMatch((await runCli(['findings'], { cwd: dir, env })).stdout, /SQL built/);
  assert.match((await runCli(['findings', '--all'], { cwd: dir, env })).stdout, new RegExp(`^${row[1]} app\\.py:3 critical issue dismissed SQL built from input$`, 'm'));

  const moved = ANSWER.replace('"line":2', '"line":3'); // same finding, same code, now one line lower
  const again = await runCli(['ingest', '-', '--format', 'plain', '--fail-on', 'critical', '--no-tools'], { cwd: dir, env, input: moved });
  assert.equal(again.code, 0, 'the dismissed finding no longer counts');
  assert.doesNotMatch(again.stdout, /SQL built/);

  assert.equal((await runCli(['dismiss', 'deadbeef'], { cwd: dir, env })).code, 2);
  assert.equal((await runCli(['dismiss', row[1]!, '--learn'], { cwd: dir, env })).code, 2, '--learn needs a reason');
  const js = JSON.parse((await runCli(['findings', '--all', '--json'], { cwd: dir, env })).stdout);
  assert.ok(js.some((f: { status: string }) => f.status === 'dismissed'));
  assert.equal((await runCli(['findings', '--clear'], { cwd: dir, env })).code, 0);
  assert.equal((await runCli(['findings', '--all'], { cwd: dir, env })).stdout.trim(), 'no stored findings. run codewolf review first');
  assert.ok(!existsSync(path.join(dir, '.git', 'codewolf', 'checkpoint.json')));

  const lone = tmpDir();
  const out = await runCli(['findings'], { cwd: lone, env: cleanEnv({ GIT_CEILING_DIRECTORIES: path.dirname(lone) }) });
  assert.equal(out.code, 2);
  assert.match(out.stderr, /not inside a git repository/);
});

test('incremental reviews skip unchanged files but keep their open findings; --fresh and --staged do not skip', async () => {
  const { dir, g } = repo();
  writeFileSync(path.join(dir, 'b.py'), 'y = 1\n');
  const srv = await startServer((_q, _b, res) => sendJson(res, 200, openaiReply('{"summary":"s","findings":[{"file":"app.py","line":2,"severity":"critical","category":"security","title":"SQL built from input","body":"b"}]}')));
  const args = ['review', '--provider', 'openai', '--base-url', `${srv.url}/v1`, '--keys', 'test-key-1', '--model', 'fake', '--no-tools', '--format', 'json', '--fail-on', 'critical'];
  const env = cleanEnv();
  const prompt = (i: number) => JSON.parse(srv.log[i]!.body).messages[1].content as string;

  const r1 = await runCli(args, { cwd: dir, env });
  assert.equal(r1.code, 1, r1.stderr);
  assert.equal(srv.log.length, 1);
  assert.ok(existsSync(path.join(dir, '.git', 'codewolf', 'checkpoint.json')));

  const r2 = await runCli(args, { cwd: dir, env });
  assert.equal(srv.log.length, 1, 'nothing changed: no model call');
  assert.match(r2.stderr, /skipped 2 file\(s\) unchanged since the last review, 1 open finding\(s\) on them carried over/);
  assert.equal(r2.code, 1, 'a carried critical still fails the run');
  assert.equal(JSON.parse(r2.stdout).findings[0].title, 'SQL built from input');

  writeFileSync(path.join(dir, 'b.py'), 'y = 2\n');
  const r3 = await runCli(args, { cwd: dir, env });
  assert.equal(r3.code, 1, r3.stderr);
  assert.equal(srv.log.length, 2);
  assert.match(prompt(1), /=== b\.py/);
  assert.doesNotMatch(prompt(1), /=== app\.py/);

  await runCli([...args, '--fresh'], { cwd: dir, env });
  assert.equal(srv.log.length, 3);
  assert.match(prompt(2), /=== app\.py/);

  g('add', 'app.py');
  await runCli([...args, '--staged'], { cwd: dir, env });
  await runCli([...args, '--staged'], { cwd: dir, env });
  await srv.close();
  assert.equal(srv.log.length, 5, '--staged never uses the checkpoint');
});

test('a diff over maxChunkTokens * concurrency * 4 tokens still runs but prints narrower-scope advice', () => {
  const logs: string[] = [];
  const cfg = config({ review: { ...config().review, maxChunkTokens: 10, concurrency: 1 } });
  const prep = prepareReview({ kind: 'file', path: 'x.patch' }, parseDiff(FIXTURE_DIFF), cfg, tmpDir(), { log: (_l, m) => logs.push(m) });
  assert.equal(prep.files.length, 1);
  assert.equal(prep.root, null, '--diff never touches the store');
  assert.ok(logs.some((m) => /this change is large .*--staged.*path-limited.*splitting the commit/.test(m)), logs.join('\n'));
  const quiet: string[] = [];
  prepareReview({ kind: 'file', path: 'x.patch' }, parseDiff(FIXTURE_DIFF), config(), tmpDir(), { log: (_l, m) => quiet.push(m) });
  assert.equal(quiet.length, 0);
});
