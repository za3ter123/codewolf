export const INIT_TEMPLATE = `# CodeWolf configuration. Every key is optional; CLI flags override this file.
# Docs: https://github.com/za3ter123/codewolf

# quiet = critical only, chill = critical + major and a few minor, assertive = everything including nits
profile: chill

# Language for summaries and comments
language: en

# Providers are tried in order. When every key of one provider is rate limited or rejected,
# CodeWolf falls through to the next. keys accepts literal keys or env:NAME (comma or newline list).
providers:
  - name: anthropic
    model: claude-sonnet-5-5
    keys: [env:ANTHROPIC_API_KEYS]
  # Any OpenAI-compatible server: OpenAI, OpenRouter, Groq, Together, LM Studio, vLLM
  # - name: openai
  #   baseUrl: https://openrouter.ai/api/v1
  #   model: qwen/qwen3-coder
  #   keys: [env:OPENROUTER_API_KEY]
  # - name: gemini
  #   model: gemini-2.5-flash
  #   keys: [env:GEMINI_API_KEYS]
  # Your Claude subscription through the local Claude Code CLI, no API key
  # - name: claude-code
  # Local and free
  - name: ollama
    model: qwen2.5-coder:7b
    # baseUrl: http://127.0.0.1:11434
    # timeout: 900          # seconds

review:
  # Added to the built-in excludes (lockfiles, dist/, minified files, binaries). Prefix with ! to re-include.
  exclude: []
  # Extra instructions for matching paths
  pathInstructions: []
  #  - path: "src/api/**"
  #    instructions: "Check authorization on every handler."
  # Exit 1 when a finding is at or above this severity: critical | major | minor | nit | none
  failOn: none
  # Include CLAUDE.md, AGENTS.md, .cursorrules and .github/copilot-instructions.md as project guidelines
  guidelines: true
  # concurrency: 4
  # maxChunkTokens: 12000

# Local linters fused into the review when installed. Set one to false to skip it.
tools:
  ruff: true
  eslint: true
  semgrep: true
  gitleaks: true
`;
