---
name: codewolf
description: Run the CodeWolf AI code reviewer on local changes and read its plain output. Use before committing, before opening a pull request, after a large edit, or when the user asks for a code review, a security check or a second opinion on a diff.
---

# CodeWolf

CodeWolf is an open-source AI code reviewer. It reviews a git diff and reports findings with a severity, a category and often a ready-to-apply suggestion. It works with API keys (Anthropic, OpenAI-compatible, Gemini), a local Ollama model, or the local `claude` CLI.

## When to run it

- Before a commit or a pull request, on the uncommitted work.
- After a large refactor or a change that touches auth, input handling, SQL, file paths, secrets or concurrency.
- When the user asks for a review. For a full fix loop, use the `/codewolf:codewolf` command instead.

Skip it for changes that only touch docs or lockfiles.

## How to run it

Use the installed binary when present, otherwise npx:

```bash
codewolf review --format plain
npx -y github:za3ter123/codewolf review --format plain
```

Useful flags:

- `--base main` reviews everything since the merge base with `main`.
- `--staged` reviews only staged changes.
- `--diff file.patch` reviews a patch file (`-` reads stdin).
- `--fail-on critical` exits 1 when a finding at or above that severity exists.
- `--provider ollama --model qwen2.5-coder:7b` runs fully local.
- `--provider claude-code` uses the Claude subscription through the `claude` CLI.

Exit codes: 0 review done, 1 the `--fail-on` threshold was hit, 2 CodeWolf failed (bad config, every provider exhausted). Logs go to stderr.

## Reading plain output

One block per finding:

```text
src/app.py:13 critical security SQL injection via f-string query
user_id is interpolated into SQL.
suggestion:
    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
```

- First line: `file:line severity category title`. Severity is one of `critical`, `major`, `minor`, `nit`. Category is one of `bug`, `security`, `performance`, `maintainability`, `style`, `test`.
- Then the explanation.
- Then an optional suggestion: replacement text for that line (or line range).
- The last line is a tally such as `codewolf: 2 finding(s) (1 critical, 1 nit) in 3 file(s) via anthropic/claude-sonnet-5-5`, or `codewolf: no findings ...`.

Treat `critical` and `major` as must-fix after confirming them in the code. Treat `minor` and `nit` as optional. Findings come from a model and can be wrong, so verify before editing.

Never paste API keys into commands. CodeWolf reads them from environment variables such as `ANTHROPIC_API_KEYS` or `OPENAI_API_KEY`.
