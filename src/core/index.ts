// Public engine API. Builder B (GitHub Action) imports from here; keep names stable.
export type {
  Category, ConfigOverrides, DiffFile, Effort, Finding, Hunk, HunkLine, PathInstruction, Profile, ProviderConfig,
  ProviderName, ResolvedConfig, ReviewResult, Severity,
} from '../shared/types.ts';
export { CATEGORIES, PROVIDER_NAMES, SEVERITIES } from '../shared/types.ts';
export { parseDiff, parseFilePatch, commentableLines, newLineText } from './diff.ts';
export { ConfigError, DEFAULT_EXCLUDES, findConfigFile, loadConfig, readConfigFile, resolveConfig, splitList } from './config.ts';
export type { LoadOptions, ResolveOptions } from './config.ts';
export { appendLearning, learningsPath, readGuidelines, readLearnings } from './learnings.ts';
export { review, agentPrompt, estimateEffort } from './engine.ts';
export type { ReviewOptions } from './engine.ts';
export { maskKey, redact, registerSecret } from '../shared/mask.ts';
export { VERSION } from '../shared/version.ts';
