// Engine contract types (SPEC.md "Engine contract"). Names here are a public API: builder B imports them.

export type Severity = 'critical' | 'major' | 'minor' | 'nit';
export type Category = 'bug' | 'security' | 'performance' | 'maintainability' | 'style' | 'test';
export type Profile = 'quiet' | 'chill' | 'assertive';
export type Effort = 'quick' | 'heavy';
export type Kind = 'issue' | 'refactor' | 'nitpick';
export type ProviderName = 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'claude-code' | 'publik';

export const SEVERITIES: readonly Severity[] = ['critical', 'major', 'minor', 'nit'];
export const CATEGORIES: readonly Category[] = ['bug', 'security', 'performance', 'maintainability', 'style', 'test'];
export const PROVIDER_NAMES: readonly ProviderName[] = ['anthropic', 'openai', 'gemini', 'ollama', 'claude-code', 'publik'];

export interface HunkLine {
  type: 'add' | 'del' | 'ctx';
  text: string;
  newLine?: number;
  oldLine?: number;
}

export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: HunkLine[];
}

export interface DiffFile {
  path: string;
  oldPath?: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  hunks: Hunk[];
  patch: string;
  /** True when git reported "Binary files ... differ" or a GIT binary patch. */
  binary?: boolean;
}

export interface Finding {
  file: string;
  line: number;
  endLine?: number;
  severity: Severity;
  category: Category;
  title: string;
  body: string;
  suggestion?: string;
  rewrite?: { language: string; reason: string; code: string };
  /** 'llm', 'builtin' (deterministic scanner) or 'tool:<name>' (ruff, eslint, semgrep, gitleaks). */
  source: 'llm' | 'builtin' | string;
  fingerprint: string;
  /** How much work the fix is, as judged by the model. */
  effort?: Effort;
  /** Deterministic instruction a coding agent can act on. */
  agentPrompt?: string;
  /** Default: 'nitpick' for nit severity, else 'issue'; the model may mark a finding 'refactor'. */
  kind?: Kind;
  /** CWE id ("CWE-89") on security findings, validated. */
  cwe?: string;
}

export interface ReviewResult {
  summary: string;
  walkthrough: { file: string; change: string }[];
  findings: Finding[];
  /** Model findings on a changed file but outside every hunk: shown separately, never inline, never in the exit code. */
  outsideDiff?: Finding[];
  stats: { files: number; findings: number; bySeverity: Record<string, number> };
  provider: { name: string; model: string };
  /** Human review effort estimate: score 1 (trivial) to 5 (very heavy), and minutes. */
  effort: { score: number; minutes: number };
  /** Mermaid sequenceDiagram when the change has a real call flow. */
  diagram?: string;
  /** Non-fatal problems (unparseable chunk, skipped files). Not part of the minimum contract. */
  warnings?: string[];
  /** Files in a chunk whose model output could not be parsed: not reviewed, so never treated as clean. */
  unreviewed?: string[];
}

export interface ProviderConfig {
  name: ProviderName;
  model: string;
  baseUrl: string;
  /** Resolved key values (env: references already expanded). Empty = keyless. */
  keys: string[];
  timeoutMs: number;
  maxTokens: number;
  /** claude-code only: override the binary (path or name). */
  command?: string;
}

export interface PathInstruction {
  path: string;
  instructions: string;
}

export interface ResolvedConfig {
  profile: Profile;
  language: string;
  providers: ProviderConfig[];
  review: {
    exclude: string[];
    pathInstructions: PathInstruction[];
    failOn: Severity | 'none';
    concurrency: number;
    maxChunkTokens: number;
    /** Include CLAUDE.md / AGENTS.md / .cursorrules / copilot-instructions excerpts in the prompt. */
    guidelines: boolean;
  };
  /** External linters to fuse; false disables one. Missing tools are skipped. */
  tools: { ruff: boolean; eslint: boolean; semgrep: boolean; gitleaks: boolean };
  learnings: string[];
  /** Trimmed excerpt of repo agent guidelines (CLAUDE.md, AGENTS.md, ...); empty when none or disabled. */
  guidelines: string;
  /** Repository root (git toplevel, else config dir, else cwd). */
  root: string;
  configPath?: string;
  /** No provider, model, base URL or key is set anywhere (not even publik API): the chain is the default local Ollama. */
  nothingConfigured?: boolean;
}

/** Overrides from CLI flags or GitHub Action inputs. All optional; strings are raw user input. */
export interface ConfigOverrides {
  provider?: string;
  model?: string;
  baseUrl?: string;
  /** Comma/newline list or array. env:NAME entries are expanded. */
  keys?: string | string[];
  profile?: string;
  language?: string;
  failOn?: string;
  /** claude-code binary (CLI --claude-bin). Never read from config files. */
  claudeBin?: string;
}
