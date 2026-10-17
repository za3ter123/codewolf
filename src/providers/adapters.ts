// One function per provider: turn (system, prompt) into text with plain fetch. Key handling lives in chain.ts.
import type { ProviderConfig } from '../shared/types.ts';
import { postJson, ProviderError } from './http.ts';
import { runClaudeCode } from './claude-code.ts';
import { topUpUrlFrom402 } from './publik.ts';

export interface AdapterRequest {
  system: string;
  prompt: string;
  json: boolean;
  maxTokens: number;
  signal?: AbortSignal | undefined;
}

export type Adapter = (p: ProviderConfig, key: string | null, req: AdapterRequest) => Promise<string>;

function nonEmpty(text: string, provider: string): string {
  if (!text.trim()) throw new ProviderError(`${provider} returned an empty response`, 'client');
  return text;
}

const anthropic: Adapter = async (p, key, req) => {
  const headers: Record<string, string> = { 'anthropic-version': '2023-06-01' };
  if (key) headers['x-api-key'] = key;
  const res = await postJson(`${p.baseUrl}/v1/messages`, headers, {
    model: p.model,
    max_tokens: req.maxTokens,
    system: req.system,
    messages: [{ role: 'user', content: req.prompt }],
  }, { timeoutMs: p.timeoutMs, signal: req.signal }) as { content?: { type: string; text?: string }[] };
  const text = (res.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
  return nonEmpty(text, 'anthropic');
};

const openai: Adapter = async (p, key, req) => {
  const headers: Record<string, string> = {};
  if (key) headers.authorization = `Bearer ${key}`;
  const official = /\/\/api\.openai\.com\b/.test(p.baseUrl);
  const body: Record<string, unknown> = {
    model: p.model,
    messages: [{ role: 'system', content: req.system }, { role: 'user', content: req.prompt }],
  };
  // api.openai.com renamed the limit for newer models; compatible servers still use max_tokens.
  body[official ? 'max_completion_tokens' : 'max_tokens'] = req.maxTokens;
  const res = await postJson(`${p.baseUrl}/chat/completions`, headers, body, { timeoutMs: p.timeoutMs, signal: req.signal }) as {
    choices?: { message?: { content?: string | { type?: string; text?: string }[] | null } }[];
  };
  const content = res.choices?.[0]?.message?.content;
  const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map((c) => c.text ?? '').join('') : '';
  return nonEmpty(text, 'openai');
};

const gemini: Adapter = async (p, key, req) => {
  const headers: Record<string, string> = {};
  if (key) headers['x-goog-api-key'] = key;
  const generationConfig: Record<string, unknown> = { temperature: 0.2, maxOutputTokens: req.maxTokens };
  if (req.json) generationConfig.responseMimeType = 'application/json';
  const res = await postJson(`${p.baseUrl}/v1beta/models/${encodeURIComponent(p.model)}:generateContent`, headers, {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
    generationConfig,
  }, { timeoutMs: p.timeoutMs, signal: req.signal }) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
  };
  if (res.promptFeedback?.blockReason) throw new ProviderError(`gemini blocked the prompt: ${res.promptFeedback.blockReason}`, 'client');
  const text = (res.candidates?.[0]?.content?.parts ?? []).map((x) => x.text ?? '').join('');
  return nonEmpty(text, 'gemini');
};

const OLLAMA_MIN_CTX = 8192;
const OLLAMA_MAX_CTX = 65536;

const ollama: Adapter = async (p, key, req) => {
  const headers: Record<string, string> = {};
  if (key) headers.authorization = `Bearer ${key}`;
  // Ollama's default context window silently truncates long prompts; size it to the request (~3 chars per token).
  const need = Math.ceil((req.system.length + req.prompt.length) / 3) + req.maxTokens;
  const numCtx = Math.min(OLLAMA_MAX_CTX, Math.max(OLLAMA_MIN_CTX, 2 ** Math.ceil(Math.log2(need))));
  const body: Record<string, unknown> = {
    model: p.model,
    stream: false,
    // thinking models (gemma4, qwen3, deepseek-r1) otherwise spend the whole token budget reasoning and return no content
    think: false,
    messages: [{ role: 'system', content: req.system }, { role: 'user', content: req.prompt }],
    options: { temperature: 0.1, num_ctx: numCtx, num_predict: req.maxTokens },
  };
  if (req.json) body.format = 'json';
  type OllamaReply = { message?: { content?: string }; done_reason?: string };
  const call = () => postJson(`${p.baseUrl}/api/chat`, headers, body, { timeoutMs: p.timeoutMs, signal: req.signal }) as Promise<OllamaReply>;
  let res: OllamaReply;
  try {
    res = await call();
  } catch (e) {
    if (e instanceof ProviderError && e.status === 400 && /think/i.test(e.message)) {
      delete body.think; // older servers or models that reject the flag
      res = await call();
    } else if (e instanceof ProviderError && e.status === 404) {
      throw new ProviderError(`${e.message} (is the model pulled? try: ollama pull ${p.model})`, 'client', 404);
    } else throw e;
  }
  const content = res.message?.content ?? '';
  if (!content.trim() && res.done_reason === 'length') throw new ProviderError(`ollama hit the ${req.maxTokens} token output limit before answering`, 'client');
  return nonEmpty(content, 'ollama');
};

// publik API speaks OpenAI chat completions. A 402 shows its message and exactly one link, the top-up URL.
const publik: Adapter = async (p, key, req) => {
  try {
    return await openai(p, key, req);
  } catch (e) {
    if (!(e instanceof ProviderError) || e.status !== 402) throw e;
    let body: unknown = null;
    try { body = JSON.parse(e.body ?? ''); } catch { /* not JSON */ }
    const { message, url } = topUpUrlFrom402(body);
    throw new ProviderError(url ? `${message} ${url}` : message, 'client', 402);
  }
};

const claudeCode: Adapter = async (p, _key, req) => nonEmpty(await runClaudeCode(p, req), 'claude-code');

export const ADAPTERS: Record<ProviderConfig['name'], Adapter> = { anthropic, openai, gemini, ollama, 'claude-code': claudeCode, publik };
