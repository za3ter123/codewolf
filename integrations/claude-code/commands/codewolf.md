---
description: Review uncommitted changes with CodeWolf, fix critical and major findings, re-run up to 3 rounds, then report. Works with no API key (you do the reviewing).
argument-hint: "[extra codewolf scope flags, e.g. --base main or --staged]"
allowed-tools: Bash(codewolf:*), Bash(npx:*), Bash(git status:*), Bash(git diff:*), Read, Edit, Write, Grep, Glob
---

# CodeWolf review loop

Run the CodeWolf reviewer on the current changes, fix what it finds, and repeat.

Extra flags from the user (may be empty): `$ARGUMENTS`

## 1. Pick the runner and the mode

Check once which runner is available and reuse it for every round:

- If `codewolf --version` succeeds, the runner is `codewolf`.
- Otherwise the runner is `npx -y github:za3ter123/codewolf`.

If there are no changes (`git status --porcelain` is empty and no `--base` flag was given), say so and stop.

Then pick the mode once:

1. Run `<runner> providers`. If any provider line shows `key(s)` (not `no key`), or `$ARGUMENTS` names a `--provider`, use **provider mode**.
2. Otherwise run `<runner> providers --check --provider ollama`. If it exits 0, a local model is running: use **provider mode** and add `--provider ollama` to every review command.
3. Otherwise use **host-agent mode**: no key and no local model, so you are the reviewer. This works on a Claude subscription with zero keys.

## 2. Review round (at most 3 rounds)

### Provider mode

Run `<runner> review --format plain $ARGUMENTS`. Exit code 0 or 1 means the review ran; exit code 2 means CodeWolf itself failed. On exit 2, show its stderr to the user (it names each provider and why it failed) and stop. Never print API keys.

### Host-agent mode

1. Run `<runner> packet $ARGUMENTS`. It prints one JSON object: `instructions` (the reviewer brief), `chunks` (each has `files` and a numbered `diff`), `builtin` (what the secret scanner and linters already found), `learnings`, `guidelines` and `schema` (the shape of the answer).
2. Review every chunk yourself, following `instructions`, `learnings` and `guidelines`. Use the new-file line numbers printed in each `diff`; never invent lines. Do not repeat what `builtin` already lists. If `chunks` is empty, every file is unchanged since the last review: skip to step 3 with `{"findings": []}`.
3. Pass one JSON answer for all chunks, shaped like `schema`, to ingest on stdin with the same flags:

   ```bash
   <runner> ingest - --format plain $ARGUMENTS <<'CODEWOLF_EOF'
   {"summary": "...", "walkthrough": [{"file": "...", "change": "..."}], "findings": [{"file": "...", "line": 12, "severity": "major", "category": "bug", "title": "...", "body": "..."}]}
   CODEWOLF_EOF
   ```

   Exit codes match `review`. On exit 2 (for example, the answer was not valid JSON), fix the answer and run ingest again once.

### Both modes

1. Read the `plain` output. Each finding is one block whose first line is `file:line severity kind category title`, followed by the body and an optional suggestion. Blocks after the `outside the diff` line point at unchanged lines of changed files; treat them as hints, not must-fix.
2. Fix every finding with severity `critical` or `major`:
   - Open the file at that line and confirm the problem is real before changing anything.
   - When a suggestion is given, prefer it, but adapt it if it would not compile or does not match the surrounding code.
   - If you judge a finding to be a false positive, leave the code alone and note why. Tell the user they can silence it for good with `codewolf dismiss <id> --reason "..."` (ids come from `codewolf findings`).
3. Do not change code for `minor` or `nit` findings. List them in the report instead.
4. If no critical or major findings remain, stop looping. Otherwise start the next round. Later rounds only re-review files that changed; open findings on untouched files are carried over.

## 3. Report

Finish with a short report:

- The mode used, rounds run and the final count by severity.
- Each fix: `file:line` and one sentence on what changed.
- Findings you left alone (false positives, or still open after 3 rounds) and why.
- The minor and nit findings, one line each.
