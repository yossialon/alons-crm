// ── Agent Claude Tool ─────────────────────────────────────────────────────────
// Direct Anthropic API calls from server-side agents (no HTTP round-trip).

import Anthropic from '@anthropic-ai/sdk';

// Support both ANTHROPIC_API_KEY (standard) and CLAUDE_API_KEY (legacy alias)
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY ?? '';
const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

type Message = { role: 'user' | 'assistant'; content: string };

/** Call Claude claude-haiku-4-5-20251001 for fast, cheap operations */
export async function callClaudeHaiku(messages: Message[], system?: string): Promise<string> {
  const res = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    ...(system ? { system } : {}),
    messages,
  });
  return res.content[0]?.type === 'text' ? res.content[0].text : '';
}

/** Call Claude claude-sonnet-4-5 for complex reasoning */
export async function callClaude(messages: Message[], system?: string): Promise<string> {
  const res = await client.messages.create({
    model:      'claude-sonnet-4-5',
    max_tokens: 4096,
    ...(system ? { system } : {}),
    messages,
  });
  return res.content[0]?.type === 'text' ? res.content[0].text : '';
}

/** Call Claude with web-search beta for lead hunting */
export async function callClaudeWithWebSearch(prompt: string, system?: string): Promise<string> {
  // Call via raw fetch to avoid SDK type complexity with betas
  const body: Record<string, unknown> = {
    model:      'claude-sonnet-4-5',
    max_tokens: 4096,
    messages:   [{ role: 'user', content: prompt }],
    betas:      ['web_search_20250305'],
  };
  if (system) body.system = system;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta':    'web-search-2025-03-05',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude web search error: ${err}`);
  }

  const data = await res.json() as { content: { type: string; text?: string }[] };
  return data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n');
}
