---
description: Review uncommitted changes with CodeWolf, fix critical and major findings, re-run up to 3 rounds, then report.
argument-hint: "[extra codewolf review flags, e.g. --base main or --staged]"
allowed-tools: Bash(codewolf:*), Bash(npx:*), Bash(git status:*), Bash(git diff:*), Read, Edit, Write, Grep, Glob
---

# CodeWolf review loop

Run the CodeWolf reviewer on the current changes, fix what it finds, and repeat.

Extra flags from the user (may be empty): `$ARGUMENTS`

## 1. Pick the command

Check once which runner is available and reuse it for every round:

- If `codewolf --version` succeeds, use `codewolf review --format plain $ARGUMENTS`.
- Otherwise use `npx -y github:za3ter123/codewolf review --format plain $ARGUMENTS`.

If there are no changes (`git status --porcelain` is empty and no `--base` flag was given), say so and stop.

## 2. Review round (at most 3 rounds)

1. Run the review command. Exit code 0 or 1 means the review ran; exit code 2 means CodeWolf itself failed. On exit 2, show its stderr to the user (it names each provider and why it failed) and stop. Never print API keys.
2. Read the `plain` output. Each finding is one block whose first line is `file:line severity category title`, followed by the body and an optional suggestion.
3. Fix every finding with severity `critical` or `major`:
   - Open the file at that line and confirm the problem is real before changing anything.
   - When a suggestion is given, prefer it, but adapt it if it would not compile or does not match the surrounding code.
   - If you judge a finding to be a false positive, leave the code alone and note why.
4. Do not change code for `minor` or `nit` findings. List them in the report instead.
5. If no critical or major findings remain, stop looping. Otherwise start the next round.

## 3. Report

Finish with a short report:

- Rounds run and the final count by severity.
- Each fix: `file:line` and one sentence on what changed.
- Findings you left alone (false positives, or still open after 3 rounds) and why.
- The minor and nit findings, one line each.
