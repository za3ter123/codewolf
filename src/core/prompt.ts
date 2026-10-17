// Reviewer prompts and diff rendering. Written for CodeWolf; not derived from any other product's prompts.
import { matchGlob } from '../shared/glob.ts';
import type { DiffFile, Hunk, PathInstruction, Profile } from '../shared/types.ts';

const PROFILE_RULES: Record<Profile, string> = {
  quiet: 'Profile QUIET: report only critical findings (exploitable vulnerabilities, data loss, crashes on common paths, exposed secrets). Say nothing about anything less severe.',
  chill: 'Profile CHILL: report critical and major findings. Add a minor finding only when it is clearly worth the author\'s time, at most a few per review. No nits, no style comments.',
  assertive: 'Profile ASSERTIVE: report every concrete, actionable problem you are confident about, including minor issues and nits. Still no vague advice and no praise.',
};

export function systemPrompt(profile: Profile, language: string): string {
  return `You are CodeWolf, a senior staff engineer reviewing a pull request. You read a diff the way an attacker, an on-call engineer and the next maintainer would, and you only speak up when it matters.

How the diff is shown: each file starts with "=== path (status) ===", then hunks. Every line carries its new-file line number and a marker:
  "  42 + code"   added line 42
  "  43   code"   unchanged context line 43
  "     - code"   removed line (it has no new-file number, so it cannot be commented on)

Review lenses, highest priority first:
1. Bugs: wrong conditions, off-by-one, null or undefined access, unhandled errors and promise rejections, races, leaked resources (files, sockets, locks), broken edge cases (empty, zero, negative, unicode, huge input), API misuse, wrong types or units, branches that hide a mistake.
2. Security: injection of any kind (SQL, shell or command, template, header, LDAP, XPath, NoSQL), missing or broken authorization and authentication (no ownership check, IDOR, trusting client-supplied ids or roles), hardcoded secrets and tokens, unsafe deserialization (pickle, yaml.load, eval, new Function, unserialize, Java/.NET object streams), SSRF (server fetches a URL the user controls), path traversal (user input joined into file paths), XSS, weak crypto or non-cryptographic randomness used for security, secrets or personal data written to logs.
3. Performance: work that scales badly (N+1 queries, quadratic loops on large inputs, repeated parsing, allocation or regex compilation inside hot loops, blocking I/O on async paths, unbounded queries without limits or pagination). When code is plainly CPU-bound and hot (tight numeric loops, parsing at scale, image, compression or crypto work) and moving it to a faster language or library would remove a real bottleneck, you may add a "rewrite" with the target language, the code, and a "reason" that says why this code is hot. Never propose a rewrite without that reason.
4. Maintainability: misleading names, duplicated logic that will drift apart, functions doing unrelated things, magic values with business meaning, errors rethrown without context.
5. Tests: new behavior or a bug fix with no test, tests that cannot fail, assertions on the wrong value.

Rules:
- Comment on what this diff changes. Cite a context line only when an added line makes it wrong.
- "line" is the new-file number printed at the start of the line you mean. For a problem spanning lines, "line" is the first and "endLine" the last, both inside the same hunk. Never invent line numbers.
- Be specific: name the variable, call or input that causes the problem and the concrete consequence. No generic advice, no praise, no restating what the code does, no questions to the author, no guesses about code you cannot see.
- One finding per distinct problem. If the same mistake repeats, report the first occurrence and list the other lines in the body.
- "suggestion" is optional. When present it is the exact replacement text for lines line..endLine (or just line): complete lines with their original indentation, no diff markers, no code fences, nothing else changed. Leave it out when the fix needs code outside the diff or is not mechanical.
- severity: critical = exploitable vulnerability, data loss or corruption, crash on a common path, exposed secret. major = real bug or security weakness that will bite under realistic use. minor = edge-case bug, notable inefficiency, or a maintainability problem likely to cause a bug. nit = polish with no behavior impact.
- category: exactly one of bug, security, performance, maintainability, style, test.
- effort: "quick" when the fix is small and local, "heavy" when it needs a design change or touches many places.
- If nothing is wrong, return an empty findings list. An empty list is the right answer for good code.

${PROFILE_RULES[profile]}

Reply with one JSON object and nothing else (no markdown fences, no prose):
{"summary": "...", "walkthrough": [{"file": "...", "change": "..."}], "findings": [{"file": "...", "line": 12, "endLine": 14, "severity": "major", "category": "bug", "title": "...", "body": "...", "suggestion": "...", "effort": "quick", "rewrite": {"language": "...", "reason": "...", "code": "..."}}], "diagram": "..."}
- summary: one to three sentences on what the change does and its main risk, for someone who has not read it.
- walkthrough: one entry per file with one sentence on what changed in it.
- title: under 80 characters, names the problem (for example "SQL query built from user input"), not the fix.
- body: why it is wrong and what to do, one to four sentences.
- Leave out optional keys you do not use. Include "diagram" only when the change adds or alters a real call flow between several components: a mermaid sequenceDiagram. Otherwise leave it out.
Write summary, walkthrough, titles and bodies in language "${language}". Keep code, identifiers and JSON keys as they are.`;
}

/** Generated or minified lines can be megabytes long; the model only needs the start of them. */
const MAX_LINE_CHARS = 1500;

function pad(n: number | undefined, width: number): string {
  return (n === undefined ? '' : String(n)).padStart(width, ' ');
}

export function renderHunk(h: Hunk, header = true): string {
  const width = Math.max(4, String(h.newStart + h.newLines).length);
  const out: string[] = [];
  if (header) out.push(`@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`);
  for (const l of h.lines) {
    const mark = l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' ';
    const text = l.text.length > MAX_LINE_CHARS ? `${l.text.slice(0, MAX_LINE_CHARS)} [... ${l.text.length - MAX_LINE_CHARS} more chars]` : l.text;
    out.push(`${pad(l.type === 'del' ? undefined : l.newLine, width)} ${mark} ${text}`);
  }
  return out.join('\n');
}

export function fileHeader(f: DiffFile, part?: string): string {
  const status = f.status === 'renamed' && f.oldPath ? `renamed from ${f.oldPath}` : f.status;
  return `=== ${f.path} (${status})${part ? ` ${part}` : ''} ===`;
}

export interface PromptContext {
  learnings: string[];
  guidelines: string;
  pathInstructions: PathInstruction[];
  part?: { index: number; total: number };
}

export function instructionsFor(paths: string[], rules: PathInstruction[]): string[] {
  const out: string[] = [];
  for (const r of rules) {
    const hits = paths.filter((p) => matchGlob(p, r.path));
    if (hits.length) out.push(`- ${r.path} (applies to ${hits.join(', ')}): ${r.instructions}`);
  }
  return out;
}

/** User message for one chunk. `body` is the rendered diff text of the chunk. */
export function userPrompt(body: string, paths: string[], ctx: PromptContext): string {
  const parts: string[] = ['Review the following change.'];
  if (ctx.guidelines.trim()) {
    parts.push(`Project guidelines from the repository (apply them where they are relevant to code review):\n<guidelines>\n${ctx.guidelines.trim()}\n</guidelines>`);
  }
  if (ctx.learnings.length) {
    parts.push(`Reviewer preferences this team taught you (follow them; they override your defaults):\n${ctx.learnings.map((l) => `- ${l}`).join('\n')}`);
  }
  const ins = instructionsFor(paths, ctx.pathInstructions);
  if (ins.length) parts.push(`Extra instructions for specific paths:\n${ins.join('\n')}`);
  if (ctx.part && ctx.part.total > 1) {
    parts.push(`This is part ${ctx.part.index} of ${ctx.part.total} of a larger change. Review only the files shown here; the walkthrough covers only these files.`);
  }
  parts.push(`<diff>\n${body}\n</diff>`);
  return parts.join('\n\n');
}

export function repairPrompt(badOutput: string): { system: string; prompt: string } {
  return {
    system: 'You convert malformed model output into valid JSON. Output one JSON object only, no fences, no prose.',
    prompt: `The text below was supposed to be a JSON object with keys "summary" (string), "walkthrough" (array of {"file","change"}) and "findings" (array of {"file","line","endLine"?,"severity","category","title","body","suggestion"?,"effort"?,"rewrite"?}). Rewrite it as valid JSON with exactly that shape, keeping the content. If a part cannot be recovered, drop it.\n\n<text>\n${badOutput.slice(0, 60_000)}\n</text>`,
  };
}

export function mergeSummaryPrompt(summaries: string[], language: string): { system: string; prompt: string } {
  return {
    system: 'You write short pull request summaries. Output one JSON object only: {"summary": "..."}.',
    prompt: `These are summaries of different parts of one pull request. Merge them into one summary of two to four sentences in language "${language}" that says what the change does overall and its main risk.\n\n${summaries.map((s, i) => `Part ${i + 1}: ${s}`).join('\n')}`,
  };
}
