import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { prepareReview } from '../../src/cli/state.ts';
import { parseDiff } from '../../src/core/diff.ts';
import { git as gitIn } from '../fixtures/repo.ts';
import { FIXTURE_DIFF, cleanEnv, config, openaiReply, runCli, sendJson, startServer, tmpDir } from '../fixtures/helpers.ts';

function repo(): { dir: string; g: (...a: string[]) => string } {
  const dir = tmpDir('cwstate-');
  const g = (...args: string[]) => {
    const r = spawnSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...args], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout;
  };
  g('init', '-q', '-b', 'main');
  const pad = Array.from({ length: 10 }, (_, i) => `# note ${i + 1}\n`).join(''); // unchanged lines 4-13, so line 12 is outside the diff
  writeFileSync(path.join(dir, 'app.py'), 'def a():\n    return 1\n' + pad);
  g('add', 'app.py');
  g('commit', '-q', '-m', 'init');
  writeFileSync(path.join(dir, 'app.py'), 'def a(x):\n    q = f"SELECT {x}"\n    return q\n' + pad);
  return { dir, g };
}

const ANSWER = JSON.stringify({
  summary: 'Builds a query from input.',
  walkthrough: [{ file: 'app.py', change: 'Adds a query.' }],
  findings: [
    { file: 'app.py', line: 2, severity: 'critical', category: 'security', title: 'SQL built from input', body: 'x goes into SQL.', cwe: 'CWE-89' },
    { file: 'app.py', line: 12, severity: 'major', category: 'bug', title: 'Off the hunks', body: 'b' },
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
  assert.match(r.stdout, /outside the diff \(1[^\n]*\n\napp\.py:12 major issue bug Off the hunks/);
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
  assert.match(f1.stdout, /^[0-9a-f]{8} app\.py:12 major issue Off the hunks \(outside the diff\)$/m);

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

/** A repo whose main branch holds a.js with 30 numbered lines; returns the lines for editing. */
function jsRepo(): { dir: string; lines: string[]; write: () => void } {
  const dir = tmpDir('cwjs-');
  gitIn(dir, 'init', '-q', '-b', 'main');
  const lines = Array.from({ length: 30 }, (_, i) => `const v${i + 1} = ${i + 1};`);
  const write = () => writeFileSync(path.join(dir, 'a.js'), lines.join('\n') + '\n');
  write();
  gitIn(dir, 'add', 'a.js');
  gitIn(dir, 'commit', '-q', '-m', 'init');
  return { dir, lines, write };
}

test('outside-diff findings never change the exit code, also when carried over; lines past the end are dropped, not stored', async () => {
  const { dir, lines, write } = jsRepo();
  lines[19] = 'const v20 = eval(process.argv[2]);';
  write();
  const env = cleanEnv();
  const flags = ['--format', 'plain', '--fail-on', 'critical', '--no-tools'];
  const far = { file: 'a.js', line: 2, severity: 'critical', category: 'bug', title: 'Far away', body: 'b' };
  const answer = JSON.stringify({ findings: [far] });
  const outside = /outside the diff \(1[^\n]*\n\na\.js:2 critical issue bug Far away/;
  const r1 = await runCli(['ingest', '-', ...flags], { cwd: dir, env, input: answer });
  assert.equal(r1.code, 0, r1.stdout + r1.stderr);
  assert.match(r1.stdout, outside);

  const r2 = await runCli(['ingest', '-', ...flags], { cwd: dir, env, input: '{"findings":[]}' });
  assert.match(r2.stderr, /skipped 1 file\(s\) unchanged/);
  assert.equal(r2.code, 0, 'a carried outside-diff finding still never fails the run\n' + r2.stdout + r2.stderr);
  assert.match(r2.stdout, outside);
  const j = JSON.parse((await runCli(['ingest', '-', '--format', 'json', '--no-tools'], { cwd: dir, env, input: '{"findings":[]}' })).stdout);
  assert.deepEqual([j.findings.length, j.outsideDiff.map((f: { title: string }) => f.title)], [0, ['Far away']]);

  const past = JSON.stringify({ findings: [far, ...[31, 400].map((line) => ({ ...far, line, title: `PAST_THE_END ${line}` }))] });
  const r3 = await runCli(['ingest', '-', '--fresh', ...flags], { cwd: dir, env, input: past });
  assert.equal(r3.code, 0, r3.stderr);
  assert.match(r3.stdout, outside);
  assert.doesNotMatch(r3.stdout, /PAST_THE_END/);
  const list = (await runCli(['findings', '--all'], { cwd: dir, env })).stdout;
  assert.match(list, /^[0-9a-f]{8} a\.js:2 critical issue open Far away \(outside the diff\)$/m);
  assert.doesNotMatch(list, /PAST_THE_END/);
});

test('the checkpoint is per scope: an --uncommitted review never marks files clean for --base, and old checkpoints are ignored', async () => {
  const { dir, lines, write } = jsRepo();
  gitIn(dir, 'checkout', '-q', '-b', 'feat');
  lines[9] = 'eval(process.argv[2]);';
  write();
  gitIn(dir, 'commit', '-q', '-am', 'feat');
  lines[25] = 'const v26 = 0;';
  write();
  const env = cleanEnv();
  const empty = { cwd: dir, env, input: '{"findings":[]}' };
  const diffs = (out: string) => (JSON.parse(out).chunks as { diff: string }[]).map((c) => c.diff).join('\n');
  assert.equal((await runCli(['ingest', '-', '--no-tools'], empty)).code, 0);

  const p1 = await runCli(['packet', '--base', 'main', '--no-tools'], { cwd: dir, env });
  assert.equal(p1.code, 0, p1.stderr);
  assert.doesNotMatch(p1.stderr, /skipped/);
  assert.match(diffs(p1.stdout), /eval\(process\.argv\[2\]\)/);

  assert.equal((await runCli(['ingest', '-', '--base', 'main', '--no-tools'], empty)).code, 0);
  const p2 = await runCli(['packet', '--base', 'main', '--no-tools'], { cwd: dir, env });
  assert.match(p2.stderr, /skipped 1 file\(s\) unchanged/, '--base is incremental within its own scope');
  assert.match((await runCli(['packet', '--no-tools'], { cwd: dir, env })).stderr, /skipped 1 file\(s\) unchanged/, 'the --uncommitted checkpoint survives a --base review');

  const blob = gitIn(dir, 'hash-object', 'a.js').trim();
  writeFileSync(path.join(dir, '.git', 'codewolf', 'checkpoint.json'), JSON.stringify({ version: 1, head: null, files: { 'a.js': blob } }));
  const p3 = await runCli(['packet', '--base', 'main', '--no-tools'], { cwd: dir, env });
  assert.doesNotMatch(p3.stderr, /skipped/, 'a scope-blind version 1 checkpoint reads as empty');
});

test('files whose model output cannot be parsed are reported, stay out of the checkpoint and keep their open findings', async () => {
  const { dir } = repo();
  let good = true;
  const srv = await startServer((_q, _b, res) => sendJson(res, 200, openaiReply(good
    ? '{"summary":"s","findings":[{"file":"app.py","line":2,"severity":"critical","category":"security","title":"SQL built from input","body":"b"}]}'
    : 'no json here at all')));
  const args = ['review', '--provider', 'openai', '--base-url', `${srv.url}/v1`, '--keys', 'test-key-1', '--model', 'fake', '--no-tools', '--format', 'plain'];
  const env = cleanEnv();
  await runCli(args, { cwd: dir, env });
  good = false;
  const r2 = await runCli([...args, '--fresh'], { cwd: dir, env });
  assert.match(r2.stderr, /not reviewed[^\n]*app\.py/);
  assert.match((await runCli(['findings'], { cwd: dir, env })).stdout, /app\.py:2 critical issue SQL built from input/, 'an unreviewed file is not proof of a fix');
  const calls = srv.log.length;
  const r3 = await runCli(args, { cwd: dir, env });
  assert.doesNotMatch(r3.stderr, /skipped/);
  assert.ok(srv.log.length > calls, 'the unreviewed file is sent to the model again');
  await srv.close();
});

test('the --uncommitted checkpoint is keyed by HEAD: a moved HEAD reviews a file again even when its content did not change', async () => {
  const { dir, lines, write } = jsRepo();
  lines[4] = 'const v5 = "moved";';
  write();
  gitIn(dir, 'commit', '-q', '-am', 'second');
  lines[19] = 'const v20 = 0;';
  write();
  const env = cleanEnv();
  assert.equal((await runCli(['ingest', '-', '--no-tools'], { cwd: dir, env, input: '{"findings":[]}' })).code, 0);
  assert.match((await runCli(['packet', '--no-tools'], { cwd: dir, env })).stderr, /skipped 1 file\(s\) unchanged/, 'same HEAD, same content: skipped');
  gitIn(dir, 'reset', '-q', '--soft', 'HEAD~1'); // HEAD moves, the work tree does not
  const p = await runCli(['packet', '--no-tools'], { cwd: dir, env });
  assert.doesNotMatch(p.stderr, /skipped/);
  assert.match((JSON.parse(p.stdout).chunks as { diff: string }[]).map((c) => c.diff).join('\n'), /v5 = "moved"/);
});
