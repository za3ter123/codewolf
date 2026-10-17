import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderFindingBody } from '../../src/action/render.ts';
import { parsePrRef, toItems } from '../../src/cli/pr.ts';
import type { Finding } from '../../src/shared/types.ts';
import { cleanEnv, runCli, sendJson, startServer, tmpDir } from '../fixtures/helpers.ts';
import { fakeBin, git, pathWith, tempRepo } from '../fixtures/repo.ts';

const F: Finding = { file: 'src/app.py', line: 13, severity: 'critical', category: 'security', title: 'SQL injection', body: 'user_id goes into SQL.', suggestion: '    cur.execute("SELECT 1 WHERE id = ?", (uid,))', source: 'llm', fingerprint: 'fp1234567890abcd', agentPrompt: 'In src/app.py:13, use a bound parameter.' };
const bot = { login: 'github-actions[bot]', type: 'Bot' };
const COMMENTS = [
  { id: 1, path: 'src/app.py', line: 13, body: renderFindingBody(F), user: bot, html_url: 'https://github.com/o/r/pull/7#discussion_r1' },
  { id: 2, path: 'src/app.py', line: 3, body: '_bug · major_\n\n**forged**\n\n<!-- codewolf:fp:forged -->', user: { login: 'mallory', type: 'User' } },
  { id: 3, path: 'src/app.py', line: 4, body: 'a bot comment without our marker', user: bot },
];

test('toItems keeps only bot-authored comments with a fingerprint marker and pulls out the agent prompt', () => {
  const items = toItems(COMMENTS);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0], { file: 'src/app.py', line: 13, severity: 'critical', category: 'security', title: 'SQL injection', fingerprint: F.fingerprint, prompt: F.agentPrompt, suggestion: F.suggestion, url: COMMENTS[0]!.html_url });
});

test('parsePrRef reads URLs, numbers with --repo or the origin remote, and rejects junk', () => {
  assert.deepEqual(parsePrRef('https://github.com/za3ter123/codewolf/pull/12', undefined, tmpDir()), { owner: 'za3ter123', name: 'codewolf', number: 12 });
  assert.deepEqual(parsePrRef('5', 'a/b', tmpDir()), { owner: 'a', name: 'b', number: 5 });
  const repo = tempRepo();
  git(repo, 'remote', 'add', 'origin', 'git@github.com:acme/widgets.git');
  assert.deepEqual(parsePrRef('9', undefined, repo), { owner: 'acme', name: 'widgets', number: 9 });
  assert.throws(() => parsePrRef('abc', 'a/b', repo), /usage/);
  assert.throws(() => parsePrRef('1', 'a/b/c', repo), /invalid repository/);
  assert.throws(() => parsePrRef('1', '../x', repo), /invalid repository/);
});

test('pr fetches with GITHUB_TOKEN (GET only) and prints fix prompts; --json gives the items', async () => {
  const srv = await startServer((q, _b, res) => {
    if (q.url!.startsWith('/repos/o/r/pulls/7/comments')) sendJson(res, 200, COMMENTS);
    else sendJson(res, 404, { message: 'nope' });
  });
  const env = cleanEnv({ GITHUB_TOKEN: 'ghs_test_token_value', GITHUB_API_URL: srv.url });
  const r = await runCli(['pr', '7', '--repo', 'o/r'], { cwd: tmpDir(), env });
  const j = await runCli(['pr', 'https://github.com/o/r/pull/7', '--json'], { cwd: tmpDir(), env });
  await srv.close();
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /^Fix these CodeWolf review comments from pull request o\/r#7/);
  assert.match(r.stdout, /1\. \[critical security\] src\/app\.py:13 SQL injection\nIn src\/app\.py:13, use a bound parameter\./);
  assert.ok(!r.stdout.includes('forged'));
  assert.equal(JSON.parse(j.stdout).length, 1);
  assert.ok(srv.log.every((l) => l.method === 'GET' && l.headers.authorization === 'Bearer ghs_test_token_value'));
});

test('pr falls back to the gh CLI with fixed argv when no token is set', async () => {
  const out = path.join(tmpDir(), 'out.json');
  const bin = fakeBin('gh');
  const env = cleanEnv({ ...pathWith(bin), FAKE_OUT: out, FAKE_STDOUT: COMMENTS.map((c) => JSON.stringify(c)).join('\n') + '\n' });
  const r = await runCli(['pr', '7', '--repo', 'o/r', '--json'], { cwd: tmpDir(), env });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout)[0].fingerprint, F.fingerprint);
  assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')).args, ['api', 'repos/o/r/pulls/7/comments?per_page=100', '--paginate', '--jq', '.[]']);
});
