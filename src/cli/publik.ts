// First-run offer of publik API, for an interactive CLI run where no provider is set up. The Action never comes here.
import { DISCLOSURE, balanceLine, provision } from '../providers/publik.ts';
import { errorMessage } from '../shared/log.ts';
import type { ResolvedConfig } from '../shared/types.ts';

export const OWN_KEY_HINT = 'To use your own key, set ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY or OPENROUTER_API_KEY '
  + '(or pass --keys), or start Ollama for a local model. codewolf doctor checks the setup.';

export interface OfferIO {
  /** stdin and stdout are both a TTY. */
  interactive: boolean;
  ask: (question: string) => Promise<string>;
  write: (text: string) => void;
  ollamaUp: (baseUrl: string) => Promise<boolean>;
}

/** True when the user said yes and this computer now has a publik credential. Never provisions without that yes. */
export async function offerPublik(config: ResolvedConfig, io: OfferIO): Promise<boolean> {
  if (!io.interactive || !config.nothingConfigured) return false;
  if (await io.ollamaUp(config.providers[0]?.baseUrl ?? '')) return false; // a running local Ollama is today's default; keep it
  io.write(`${DISCLOSURE}\n`);
  const answer = (await io.ask('Use publik API? [y/N] ')).trim().toLowerCase();
  if (answer !== 'y' && answer !== 'yes') { io.write(`${OWN_KEY_HINT}\n`); return false; }
  try {
    const c = await provision();
    const card = [balanceLine(c.balance_micros, c.claim_state), c.cost_sentence ?? '', c.claim_url ? `Sign in with publik: ${c.claim_url}` : ''];
    io.write(card.filter(Boolean).join('\n') + '\n');
    return true;
  } catch (e) {
    io.write(`${errorMessage(e)}\n${OWN_KEY_HINT}\n`);
    return false;
  }
}

/** Ollama answers at baseUrl within a second (same probe as codewolf doctor). */
export async function ollamaUp(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(1000) });
    await res.body?.cancel();
    return res.ok;
  } catch {
    return false;
  }
}
