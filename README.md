<p align="center">
  <img src="assets/logo.svg" width="112" height="112" alt="CodeWolf logo: a geometric wolf head">
</p>

<h1 align="center">CodeWolf</h1>

<p align="center"><strong>It eats rabbits.</strong></p>

<p align="center">
Open-source AI code review for pull requests and local changes.<br>
Bring one API key, many keys at once, a local model, or your Claude subscription.
</p>

---

CodeWolf reviews a diff and gives you a summary, a per-file walkthrough, and line-by-line findings with ready-to-apply fix suggestions. It runs in three places:

- **CLI**: `codewolf review` on your working tree, a branch, or a patch file. Built for humans and for coding agents.
- **GitHub Action**: posts a summary comment and inline review comments on every pull request, reviews only new commits on each push, and answers `@codewolf` questions.
- **Claude Code plugin**: a `/codewolf:codewolf` command that reviews, fixes critical and major findings, and re-runs until clean.

It is MIT licensed, has one runtime dependency (`yaml`), and talks to model providers over plain HTTP.

## Quickstart

You need Node.js 20 or newer. CodeWolf is installed straight from GitHub:

```bash
npm install -g github:za3ter123/codewolf   # or prefix any command with: npx -y github:za3ter123/codewolf
```

### Inside your coding agent (no key at all)

CodeWolf is meant to live inside the agent you already use: Claude Code, Codex, Cursor, Gemini CLI, opencode, or any agent that can run a shell command. Install its command or skill into the agent once:

```bash
codewolf install claude            # prints the plan: which files it would create
codewolf install claude --yes      # writes .claude/commands/codewolf.md and .claude/skills/codewolf/SKILL.md
codewolf install --all --user --yes   # every supported agent, in your user config instead of the repo
```

Then ask the agent to run `/codewolf` (or just "review my changes with codewolf"). When no API key, Ollama model or `claude` CLI is configured, the agent itself does the reviewing: `codewolf packet` hands it the diff and the review instructions, and `codewolf ingest` checks its answer with the same filters a normal review uses. Your agent subscription is the model, so nothing else is needed.

After a review, `codewolf fix` turns the open findings into one prompt for your agent, and `codewolf apply <id>` writes a single suggestion straight into the file.

### One API key

```bash
export ANTHROPIC_API_KEY=...        # your key
codewolf review                     # reviews staged, unstaged and untracked changes against HEAD
```

### Many keys

Put several keys in one variable, separated by commas or newlines. CodeWolf rotates between them and skips keys that are rate limited.

```bash
export ANTHROPIC_API_KEYS=key-one,key-two,key-three
codewolf review --base main
```

### A local model with Ollama (no key)

```bash
ollama pull qwen2.5-coder:7b
codewolf review --provider ollama --model qwen2.5-coder:7b
```

### Your Claude subscription (no API key)

The `claude-code` provider runs the local `claude -p` CLI, so a logged-in Claude Code install is enough.

```bash
codewolf review --provider claude-code
```

If `claude` is not on your `PATH`, point CodeWolf at it with `--claude-bin <path>` or the `CODEWOLF_CLAUDE_BIN` environment variable, for example `CODEWOLF_CLAUDE_BIN=/opt/claude/bin/claude`. The binary cannot be set from `.codewolf.yaml`, so a repository's config can never make CodeWolf run a program of its choosing.

### Any OpenAI-compatible API

OpenRouter, Groq, Together, LM Studio and vLLM all work through the `openai` provider:

```bash
export OPENROUTER_API_KEYS=...
codewolf review --provider openai --base-url https://openrouter.ai/api/v1 --model qwen/qwen3-coder
```

## CLI reference

```text
codewolf review [scope] [options]
Scope (pick one):
  --uncommitted                 Working tree vs HEAD: staged + unstaged + untracked (default)
  --staged                      Staged changes only
  --committed                   HEAD vs the merge base with the default branch
  --base <ref>                  Merge base of ref and HEAD to the working tree
  --diff <file|->               A patch file, or stdin with -
Options:
  --format pretty|plain|markdown|json
                                pretty on a terminal, plain otherwise; json prints one ReviewResult object
  --agent                       NDJSON for coding agents; exit 1 if a critical or major finding remains
  --provider <name>             anthropic | openai | gemini | ollama | claude-code | openrouter
  --model <id>  --base-url <url>  --keys <a,b,c>
  --profile quiet|chill|assertive
  --config <path>               Config file (default: nearest .codewolf.yaml upward from the current directory)
  --fail-on <severity>          Exit 1 if a finding at or above critical|major|minor|nit exists
  --claude-bin <path>           Claude Code binary for the claude-code provider (or CODEWOLF_CLAUDE_BIN)
  --no-tools                    Do not run local linters (ruff, eslint, semgrep, gitleaks)
  --verbose                     Debug logs on stderr
codewolf init                   Write a commented .codewolf.yaml
codewolf learn "<text>"         Add a reviewer preference to .codewolf/learnings.md
codewolf learnings              List the learnings
codewolf providers [--check]    Show the provider chain with masked key counts; --check pings each key
codewolf fix [<id...> | --all | --nits] [--to print|claude|codex|opencode|gemini|clipboard]
codewolf apply <id...> [--dry-run]
codewolf install [<agent...> | --all] [--project | --user] [--yes] [--force]
codewolf hook install|uninstall|status
codewolf doctor
codewolf pr <number|url> [--repo owner/name] [--json]
codewolf --version
```

When `--format` is not given and CodeWolf sees it is running inside a coding agent (Claude Code, Codex, Cursor, Gemini CLI, opencode or aider, detected from their environment variables), it prints `plain` text and never ANSI colors.

Exit codes: `0` review done, `1` the `--fail-on` threshold was hit, `2` error. Logs always go to stderr, so `--format json` output can be piped.

The `plain` format is what coding agents read. One block per finding:

```text
src/app.py:13 critical security SQL injection via f-string query
user_id is interpolated into SQL.
suggestion:
    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
```

## Agent commands

Reviews are remembered in the git directory (`.git/codewolf/`, never your work tree), so the commands below work on the findings of the last review. `codewolf findings` lists them with their ids.

`codewolf fix` builds one prompt from the open findings (each one's agent instruction, location and suggestion) and hands it to an agent. With no ids it takes every open finding except nits; `--nits` takes only the nits. The prompt always goes to the agent on stdin, and each agent is started with a fixed command line: `claude -p`, `codex exec -`, `opencode run`, `gemini -p`. `--to clipboard` copies it (clip.exe, pbcopy, wl-copy or xclip). When stdout is not a terminal, or CodeWolf is already running inside an agent, the default is `--to print`, which writes the prompt to stdout for the calling agent. If a target fails, the prompt is printed instead.

```bash
codewolf fix                  # print or hand off the prompt for all open non-nit findings
codewolf fix 3fa2c19d --to claude
```

`codewolf apply <id...>` writes a finding's suggestion over its lines. It first finds where those lines moved to since the review. It refuses with exit 2 and leaves the file alone when the finding has no suggestion, when the original line can no longer be found, or when the path would leave the repository (absolute paths, `..`, symlinks pointing outside). `--dry-run` shows the change without writing. Applied findings are marked fixed.

`codewolf install` puts CodeWolf's command or skill into an agent: `claude` (`.claude/commands/codewolf.md` and `.claude/skills/codewolf/SKILL.md`), `codex` (`.codex/skills/codewolf/SKILL.md`), `cursor` (`.cursor/rules/codewolf.mdc`), `gemini` (`.gemini/commands/codewolf.toml`), `opencode` (`.opencode/command/codewolf.md`) and `agents` (`.agents/skills/codewolf/SKILL.md`). `--project` (the default) writes inside the repository, `--user` writes into the agent's own config directory (`~/.claude`, `~/.codex`, `~/.gemini`, `~/.config/opencode`, `~/.agents`; Cursor has no user-level file). Without `--yes` it only prints the plan. Every file it writes carries a `codewolf:managed` marker, and it never overwrites a file without that marker unless you pass `--force`.

`codewolf hook install` adds an opt-in git `post-commit` hook that reviews each commit in the background (`codewolf review --committed --format plain`) and writes the result to `.git/codewolf/last-hook-review.txt`. It never delays or fails a commit. An existing shell hook is kept and CodeWolf's marked block is added to it; `codewolf hook uninstall` removes only that block. The hook records the path of the CodeWolf it was installed with, so run `hook install` again after moving or reinstalling CodeWolf.

`codewolf doctor` prints one OK, WARN or FAIL line per check: Node version, git and the repository, the config file and whether it is trusted, each provider with its keys masked, whether Ollama answers at its base URL, the `claude` binary, each linter, and whether the state directory is writable. It exits 1 only when a line says FAIL.

`codewolf pr <number|url>` reads CodeWolf's own inline comments on a GitHub pull request and prints them as fix prompts for your agent (`--json` for structured output). It trusts only comments written by a bot account that carry CodeWolf's fingerprint marker, the same rule the Action uses. It uses `GITHUB_TOKEN` or `GH_TOKEN` when set, otherwise the `gh` CLI, and it never writes to GitHub.

## GitHub Action

Add `.github/workflows/codewolf.yml`:

```yaml
name: CodeWolf
on:
  pull_request:
    types: [opened, reopened, synchronize, ready_for_review]
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    # Skip pull requests from forks (read-only token, no secrets); react to comments only when they mention @codewolf.
    if: >-
      (github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository) ||
      (github.event_name != 'pull_request' && contains(github.event.comment.body, '@codewolf'))
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: za3ter123/codewolf@v0
        with:
          provider: anthropic
          api-keys: ${{ secrets.ANTHROPIC_API_KEYS }}
```

Ready-made workflows live in [`examples/workflows/`](examples/workflows/):

- [`codewolf.yml`](examples/workflows/codewolf.yml) uses API keys from repository secrets.
- [`codewolf-ollama.yml`](examples/workflows/codewolf-ollama.yml) needs no keys at all: it installs Ollama on the runner, pulls `qwen2.5-coder:3b` and reviews with it. This repository reviews its own pull requests that way.

What the action does on each pull request event:

1. Skips draft pull requests (it reviews them when they are marked ready) and anything `review.auto` in the config rules out.
2. On the first run, reviews the full pull request diff. On later pushes, reviews only the commits since the last reviewed one. If the head commit was already reviewed, it posts nothing.
3. Posts or edits one summary comment: summary, walkthrough table, estimated review effort, a sequence diagram when the change has a real call flow, and findings by severity.
4. Posts one review. Each inline comment starts with category, severity and effort, then the title, the explanation, a GitHub suggestion block so the fix is one click, and a collapsed prompt you can paste into a coding agent. The review body holds the count of actionable findings and collapsed sections for nitpicks, findings outside the diff, linter output, one combined agent prompt and the review details (profile, model, commit range, files). Findings it already posted are never repeated.
5. If GitHub rejects a comment because its line is outside the diff (HTTP 422), the review is retried without it and the finding moves to the review body.

Chat: mention `@codewolf` in a pull request comment or in a review thread.

| Command | What it does |
| --- | --- |
| `@codewolf review` | Review the commits pushed since the last review |
| `@codewolf full review` | Review the whole pull request again |
| `@codewolf pause` / `resume` | Stop or restart automatic reviews on this pull request |
| `@codewolf summary` | Regenerate the summary comment |
| `@codewolf configuration` | Show the settings in use (keys are never shown) |
| `@codewolf help` | List the commands |
| `@codewolf <anything else>` | A question, answered from the diff (and the review thread when asked inside one) |

Comments from bots are ignored. By default, commands and questions are accepted from the repository owner, members, collaborators, contributors and the pull request author. On a public repository that uses paid API keys, this means anyone who has had one pull request merged (a contributor), or anyone who opens a pull request and comments on it, can spend your keys with `@codewolf`. To restrict it, list who may run commands in `.codewolf.yaml`:

```yaml
review:
  auto:
    commandAccess: [OWNER, MEMBER, COLLABORATOR]   # default: [OWNER, MEMBER, COLLABORATOR, CONTRIBUTOR, AUTHOR]
```

The values are GitHub author associations, plus `AUTHOR` for the pull request author.

CodeWolf only trusts its own markers (the hidden comments that record the reviewed commit and the paused state) in comments written by a bot account, and it neutralizes marker-like text in model output and quoted questions. Use the default `github-token` or a GitHub App token; with a personal access token the summary is not recognized as CodeWolf's own and every run starts over.

The action reads `.codewolf.yaml` from the base branch of the pull request, not from the pull request itself, so a pull request cannot change which server your API keys are sent to. A config change takes effect once it is merged. If the file cannot be read for any reason other than not existing, the action uses default settings and prints a warning; it never falls back to the checked-out copy.

Inputs:

| Input | Default | Description |
| --- | --- | --- |
| `github-token` | `${{ github.token }}` | Token for reading the pull request and posting comments |
| `provider` | from config | `anthropic`, `openai`, `gemini`, `ollama` or `claude-code` |
| `model` | provider default | Model id |
| `api-keys` | | One or more keys, comma or newline separated. Pass them from secrets |
| `base-url` | provider default | Provider endpoint, for example an OpenRouter or Ollama URL |
| `profile` | `chill` | `quiet`, `chill` or `assertive` |
| `config` | `.codewolf.yaml` | Path to the config file |
| `language` | `en` | Language for the review text |

Pull requests from forks get a read-only token and no secrets from GitHub, so the example workflows skip them. A maintainer can still comment `@codewolf review` on such a pull request: comment events run with the base repository's token.

## Multiple keys and the fallback chain

Every provider has a key pool. Keys come from `--keys a,b,c` (the `api-keys` input in the action) or from environment variables: `ANTHROPIC_API_KEY(S)`, `OPENAI_API_KEY(S)`, `GEMINI_API_KEY(S)`, `OPENROUTER_API_KEY(S)` and `CODEWOLF_API_KEYS`. The plural forms take a comma or newline separated list. Keep keys out of `.codewolf.yaml`; it is committed to the repository.

- Requests rotate round-robin across healthy keys.
- A `429` cools that key for the `retry-after` time (60 seconds if the provider gives none) and the request moves to the next key at once.
- A `401` or `403` disables the key for the rest of the run.
- A `5xx` or network error moves to the next key, with at most two retries per key per request.

When every key of a provider is cooling or disabled, CodeWolf falls through to the next provider in the `providers:` list. A run fails only when the whole chain is exhausted, and the error names each provider and why it failed. A typical chain is a paid API first, a cheaper OpenAI-compatible endpoint second, and a local Ollama model last, so a review always finishes.

Keys are never printed in full. Logs show them masked, like `sk-...abcd`.

## Configuration: `.codewolf.yaml`

Run `codewolf init` for a commented starter file. Every field is optional; CLI flags and action inputs override it.

```yaml
profile: chill            # quiet: critical only. chill: critical and major, few nits. assertive: everything
language: en
providers:                # tried in order
  - name: anthropic
    model: claude-sonnet-5-5       # keys come from the environment or --keys, never from this file
  - name: openai
    baseUrl: https://openrouter.ai/api/v1
    model: qwen/qwen3-coder
  - name: ollama
    model: qwen2.5-coder:7b
review:
  exclude: ["**/*.lock", "dist/**"]    # lockfiles, dist/, minified files and binaries are excluded by default
  pathInstructions:
    - path: "src/api/**"
      instructions: "Check authz on every handler."
  failOn: critical         # CLI exits 1 if any finding is at or above this severity
  guidelines: true         # include CLAUDE.md, AGENTS.md, .cursorrules excerpts as review context
  auto:                    # GitHub Action only
    enabled: true          # false: review only on @codewolf review
    drafts: false          # true: review draft pull requests too
    baseBranches: []       # e.g. [main, "release/*"]; empty means every base branch
    ignoreUsers: []        # pull request authors to skip, e.g. [renovate]
    commandAccess: [OWNER, MEMBER, COLLABORATOR, CONTRIBUTOR, AUTHOR]   # who may use @codewolf
tools:                     # local linters whose output is merged into the review; missing tools are skipped
  ruff: true
  eslint: true
  semgrep: true
  gitleaks: true
```

A `.codewolf.yaml` found in the repository is treated as untrusted, because anyone who can open a pull request or share a repository can write one:

- `env:NAME` key references in it are ignored with a warning. They only work in a file you pass yourself with `--config`.
- Keys from your environment or `--keys` are sent only to the provider's official host (`api.anthropic.com`, `api.openai.com`, `openrouter.ai`, `generativelanguage.googleapis.com`) or to a base URL you chose yourself with `--base-url` or the `CODEWOLF_BASE_URL` environment variable (the `base-url` input in the action). If the file points a provider at any other server, that provider gets no keys and CodeWolf prints a warning. Keyless local providers such as Ollama are unaffected.
- A `command` for the `claude-code` provider is ignored. Set the binary with `--claude-bin` or `CODEWOLF_CLAUDE_BIN`.
- Local linters run with their own project config. ESLint in particular loads the repository's JavaScript config file, so pass `--no-tools` when reviewing a repository you do not trust.

Learnings are reviewer preferences in `.codewolf/learnings.md`, one per line. Add them with `codewolf learn "prefer early returns"` and commit the file; both the CLI and the action read it.

What the reviewer looks for: bugs, security problems (injection, broken authorization, hardcoded secrets, unsafe deserialization, SSRF, path traversal), performance, maintainability and missing tests. For a hot path it may propose a rewrite in a faster language or library, always with a stated reason. A built-in scanner that uses no model flags hardcoded secrets on added lines (AWS key ids, private key blocks, GitHub, Slack, OpenAI, Anthropic and Google key shapes, high-entropy `api_key = "..."` values). Findings that point at lines outside the diff, or at files that are not in it, are dropped before you see them.

## Claude Code plugin

Inside Claude Code:

```text
/plugin marketplace add za3ter123/codewolf
/plugin install codewolf@codewolf
```

Then run `/codewolf:codewolf` (optionally with flags such as `--base main`). It runs `codewolf review --format plain`, fixes the critical and major findings, re-runs up to three rounds, and reports what it fixed and what it left. The plugin also ships a `codewolf` skill that tells Claude when to run the reviewer and how to read its output.

An optional Stop hook blocks Claude from finishing while critical findings remain in uncommitted changes. It is off by default; see [`integrations/claude-code/hook-example/`](integrations/claude-code/hook-example/README.md) to turn it on.

## CodeWolf and CodeRabbit

CodeRabbit is a mature hosted product with features CodeWolf does not have. CodeWolf covers the core review loop, costs nothing beyond the model you choose, and is open about the gaps.

| | CodeWolf | CodeRabbit |
| --- | --- | --- |
| Price | Free. You pay your model provider, or nothing with a local model | $24 to $30 per developer per month on the base Essentials plan ([pricing](https://www.coderabbit.ai/pricing), October 2026) |
| Review limits | Only your provider's rate limits; many keys rotate past them | Reviews per hour are capped by plan |
| PR summary, walkthrough, effort estimate | Yes | Yes |
| Sequence diagrams | Yes, when the model finds a real call flow | Yes |
| Inline findings with one-click suggestions | Yes | Yes |
| Prompts for coding agents | Yes, per finding and combined | Yes |
| Incremental review of new commits | Yes | Yes |
| Chat and commands in PR comments | Yes, `@codewolf` | Yes |
| Pause, resume, auto-review rules | Yes | Yes |
| Local CLI review for coding agents | Yes | Yes |
| Learnings | Yes, from a file you commit | Yes, learned from chat and stored by the service |
| Linter and scanner output in the review | Yes: ruff, eslint, semgrep, gitleaks when installed, plus a built-in secret scanner | Yes, dozens of bundled tools |
| Open source | Yes, MIT | No |
| Your own API keys, many at once, rotation | Yes | No |
| Provider fallback chain | Yes | No |
| Local models (Ollama), zero-key CI | Yes | No |
| Runs on your Claude subscription | Yes, `claude-code` provider | No |
| Code stays on your runner (with a local model) | Yes | No, hosted service |
| GitLab, Bitbucket, Azure DevOps | Not yet, GitHub only | Yes |
| Codebase-wide context (code graph, related files) | No, the diff only | Yes |
| Docstring and unit test generation | No, by design: your coding agent writes them | Yes |
| Issue tracker integration (Jira, Linear) | No | Yes |
| IDE extension | No, by design: it installs into your coding agent | Yes |
| Hosted app with dashboard and org settings | No | Yes |

Review quality depends mostly on the model you point CodeWolf at. A small local model catches obvious bugs; a frontier model catches much more.

Other open-source reviewers are worth a look too. [PR-Agent](https://github.com/qodo-ai/pr-agent) from Qodo is the most established, with many tools and support for several git hosts. [Shippie](https://github.com/mattzcarey/shippie) is a lighter TypeScript reviewer that runs in CI. CodeWolf's focus is multi-key rotation with a provider fallback chain, zero-key local models, and a review loop built for coding agents.

## What CodeWolf will not do

CodeWolf is a tool that runs inside your own agent and your own CI. These features of hosted review services are left out on purpose:

- Accounts, login, organizations, SSO and regions. There is no service to log in to.
- Plans, credits, billing, usage caps and seat checks. Your only limits are your model provider's.
- Telemetry of any kind: no analytics, no crash reporting, no uninstall pings, no update checks. CodeWolf only talks to the model and GitHub endpoints you configure.
- A one-click GitHub App, hosted webhooks or a web dashboard. The Action runs in your own workflow with your own token.
- Cloud agent tasks and uploading your agent session transcripts. Your sessions stay on your machine.
- A VS Code extension UI. Your coding agent is the interface.
- A self-hosted server mode. The CLI and the Action need no server.
- Perforce and jj support. CodeWolf reads git diffs only.
- Stats heatmaps. They measure people, and a reviewer has no use for them.
- Docstring and unit test generation. Your host agent already writes those well; CodeWolf hands it the findings instead.

## How this was researched

The v0.2 agent features (the fix hand-off, applying suggestions, installing into agents, the commit hook, `doctor`, agent detection and pulling PR comments) were chosen by statically inspecting CodeRabbit's public VS Code extension 0.23.0 and CLI 0.9.0 with the REA reverse-engineering tool, to list which features they offer. Only that feature list was used. No CodeRabbit code, prompts, endpoints or wire formats were copied, and CodeWolf never calls CodeRabbit services. Everything here is written from scratch in our own words.

## Clean-room statement

CodeWolf is a clean-room implementation. It was built from CodeRabbit's public documentation, its publicly observable behavior on pull requests, and the feature inventory described above. No CodeRabbit source code, prompts, endpoints or private APIs were copied or called. CodeWolf is not affiliated with or endorsed by CodeRabbit.

## Development

```bash
npm ci
npm run build      # typecheck, then bundle dist/cli.js and dist/action.js
npm test           # node --test, no network
```

`dist/` is committed because the GitHub Action runs it directly. CI fails if `dist/` is out of date, so run `npm run build` before you commit.

## License

MIT License. Copyright (c) 2026 CodeWolf contributors. See [LICENSE](LICENSE).
