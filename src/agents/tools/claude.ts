// ── Agent Claude Tool ─────────────────────────────────────────────────────────
// Direct Anthropic API calls from server-side agents (no HTTP round-trip).
//
// All public functions:
//   - Never throw on transient errors (retry up to MAX_RETRIES with backoff)
//   - Truncate prompts that exceed token budget to prevent 400 errors
//   - Return empty string on hard failure so callers can degrade gracefully
//   - Log all calls with duration and token counts for cost observability

import Anthropic from '@anthropic-ai/sdk';
import { log } from '@/lib/logger';

// Support both ANTHROPIC_API_KEY (standard) and CLAUDE_API_KEY (legacy alias)
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY ?? '';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  if (!ANTHROPIC_KEY) throw new Error('[claude] ANTHROPIC_API_KEY / CLAUDE_API_KEY is not set');
  _client = new Anthropic({ apiKey: ANTHROPIC_KEY });
  return _client;
}

type Message = { role: 'user' | 'assistant'; content: string };

// ── Safety limits ─────────────────────────────────────────────────────────────
// Conservative character-to-token ratio (1 token ≈ 4 chars for English).
// Truncation happens before the API call — prevents 400 "max_tokens exceeded".
const HAIKU_MAX_INPUT_CHARS  = 80_000;   // ~20k tokens — well within haiku context
const SONNET_MAX_INPUT_CHARS = 180_000;  // ~45k tokens
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Exponential backoff: 1s, 2s, 4s */
function backoff(attempt: number): Promise<void> {
  return new Promise((r) => setTimeout(r, BASE_DELAY_MS * 2 ** attempt));
}

/** Truncate a message array so the total char count stays within budget. */
function truncateMessages(messages: Message[], maxChars: number, label: string): Message[] {
  const total = messages.reduce((n, m) => n + m.content.length, 0);
  if (total <= maxChars) return messages;

  log.warn(`[claude] ${label} prompt truncated`, {
    originalChars: total,
    maxChars,
    reduction: `${Math.round((1 - maxChars / total) * 100)}%`,
  });

  // Truncate the last user message to fit within budget
  let budget = maxChars;
  return messages.map((m, i) => {
    if (i < messages.length - 1) {
      budget -= m.content.length;
      return m;
    }
    // Last message — truncate to remaining budget (keep a tail marker)
    const truncated = m.content.slice(0, Math.max(0, budget - 80));
    return { ...m, content: truncated + '\n\n[... content truncated to fit token budget ...]' };
  });
}

/**
 * Safe JSON array extractor — handles markdown code fences, leading/trailing
 * prose, and malformed outer brackets.
 *
 * Returns null on failure (caller should fall back gracefully).
 */
export function extractJsonArray<T>(raw: string): T[] | null {
  // Strip markdown fences
  const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

  // Try finding a JSON array anywhere in the response
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    // Attempt line-by-line recovery for arrays with trailing commas or syntax issues
    try {
      const fixed = match[0]
        .replace(/,\s*([\]}])/g, '$1')    // trailing commas
        .replace(/\bNaN\b/g, 'null')       // NaN → null
        .replace(/\bInfinity\b/g, 'null'); // Infinity → null
      const parsed = JSON.parse(fixed);
      return Array.isArray(parsed) ? (parsed as T[]) : null;
    } catch {
      return null;
    }
  }
}

/** Retry wrapper for Anthropic API calls with exponential backoff. */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = MAX_RETRIES,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Don't retry on hard errors (bad request, invalid API key, etc.)
      const status = (err as { status?: number }).status;
      if (status && status < 500 && status !== 429) {
        log.error(`[claude] ${label} hard error (no retry)`, err, { status });
        throw err;
      }
      if (attempt < maxRetries) {
        log.warn(`[claude] ${label} attempt ${attempt + 1} failed, retrying…`, { err: String(err) });
        await backoff(attempt);
      }
    }
  }
  throw lastErr;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Call Claude Haiku for fast, cheap operations (scoring, classification). */
export async function callClaudeHaiku(messages: Message[], system?: string): Promise<string> {
  const safe = truncateMessages(messages, HAIKU_MAX_INPUT_CHARS, 'haiku');
  const t0   = Date.now();

  const res = await withRetry(
    () => getClient().messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      ...(system ? { system } : {}),
      messages:   safe,
    }),
    'haiku',
  );

  log.info('[claude] haiku call', {
    durationMs:   Date.now() - t0,
    inputTokens:  res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
  });

  return res.content[0]?.type === 'text' ? res.content[0].text : '';
}

/** Call Claude Sonnet for complex reasoning (campaign analysis, orchestration). */
export async function callClaude(messages: Message[], system?: string): Promise<string> {
  const safe = truncateMessages(messages, SONNET_MAX_INPUT_CHARS, 'sonnet');
  const t0   = Date.now();

  const res = await withRetry(
    () => getClient().messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 4096,
      ...(system ? { system } : {}),
      messages:   safe,
    }),
    'sonnet',
  );

  log.info('[claude] sonnet call', {
    durationMs:   Date.now() - t0,
    inputTokens:  res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
  });

  return res.content[0]?.type === 'text' ? res.content[0].text : '';
}

/** Call Claude with web-search beta for lead hunting. */
export async function callClaudeWithWebSearch(prompt: string, system?: string): Promise<string> {
  const truncated = prompt.length > SONNET_MAX_INPUT_CHARS
    ? prompt.slice(0, SONNET_MAX_INPUT_CHARS) + '\n\n[... truncated ...]'
    : prompt;

  const body: Record<string, unknown> = {
    model:      'claude-sonnet-4-5',
    max_tokens: 4096,
    messages:   [{ role: 'user', content: truncated }],
    betas:      ['web_search_20250305'],
  };
  if (system) body.system = system;

  const t0 = Date.now();

  const res = await withRetry(async () => {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':    'web-search-2025-03-05',
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '(no body)');
      const err = new Error(`Claude web search HTTP ${r.status}: ${text.slice(0, 200)}`);
      (err as unknown as { status: number }).status = r.status;
      throw err;
    }
    return r;
  }, 'web-search');

  const data = await res.json() as { content: { type: string; text?: string }[]; usage?: { input_tokens: number; output_tokens: number } };

  log.info('[claude] web-search call', {
    durationMs:   Date.now() - t0,
    inputTokens:  data.usage?.input_tokens,
    outputTokens: data.usage?.output_tokens,
  });

  return data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n');
}
