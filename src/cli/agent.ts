// Detects when CodeWolf runs inside a coding agent, so output defaults to plain text (never ANSI).

/** The agent CodeWolf is running under, from its environment variables, or null. */
export function detectAgent(env: NodeJS.ProcessEnv, isTTY: boolean = process.stdout.isTTY === true): string | null {
  if (env.CLAUDECODE || env.CLAUDE_CODE_ENTRYPOINT) return 'claude';
  if (env.CURSOR_AGENT) return 'cursor';
  if (env.GEMINI_CLI) return 'gemini';
  if (env.OPENCODE) return 'opencode';
  // these are also set in plain terminals, so they only count when stdout is not a terminal
  if (!isTTY && (env.CODEX_SANDBOX || env.CODEX_HOME)) return 'codex';
  if (!isTTY && Object.keys(env).some((k) => k.startsWith('AIDER_') && env[k])) return 'aider';
  return null;
}
