import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { checkRateLimit } from '@/lib/rateLimit';
import { log } from '@/lib/logger';

const RATE_LIMIT_MAX = process.env.CLAUDE_RATE_LIMIT_MAX ? parseInt(process.env.CLAUDE_RATE_LIMIT_MAX, 10) : 100;
const RATE_LIMIT = { windowMs: 60 * 60 * 1000, max: RATE_LIMIT_MAX };

export async function POST(req: NextRequest) {
  // Use CLAUDE_API_KEY to avoid being overridden by Claude Code's injected ANTHROPIC_API_KEY=""
  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes('PASTE_YOUR_NEW_KEY')) {
    log.error('CLAUDE_API_KEY is not configured');
    return NextResponse.json({ error: 'AI service is not configured' }, { status: 500 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'local';

  const allowed = await checkRateLimit(`${ip}:claude`, RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Max ${RATE_LIMIT_MAX} AI requests per hour.` },
      { status: 429 }
    );
  }

  let body: { model?: string; messages?: unknown[]; max_tokens?: number; betas?: string[] } & Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  return Sentry.startSpan(
    {
      name: 'anthropic.messages.create',
      op: 'gen_ai.invoke_agent',
      attributes: {
        'gen_ai.system': 'anthropic',
        'gen_ai.request.model': body.model ?? 'unknown',
        'gen_ai.request.max_tokens': body.max_tokens ?? 0,
      },
    },
    async (span) => {
      try {
        // FIXED: only add anthropic-beta header when the caller explicitly requests betas.
        // Forwarding web-search on every request caused unnecessary 400s for non-search calls.
        const upstreamHeaders: Record<string, string> = {
          'Content-Type':      'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key':         apiKey,
        };
        if (body.betas && Array.isArray(body.betas) && body.betas.length > 0) {
          upstreamHeaders['anthropic-beta'] = body.betas.join(',');
        }

        const upstream = await fetch('https://api.anthropic.com/v1/messages', {
          method:  'POST',
          headers: upstreamHeaders,
          body:    JSON.stringify(body),
        });

        const data = (await upstream.json()) as {
          usage?: { input_tokens?: number; output_tokens?: number };
        };

        if (data.usage) {
          span.setAttributes({
            'gen_ai.usage.input_tokens': data.usage.input_tokens ?? 0,
            'gen_ai.usage.output_tokens': data.usage.output_tokens ?? 0,
          });
        }

        if (!upstream.ok) {
          span.setStatus({ code: 2, message: `HTTP ${upstream.status}` });
        }

        return NextResponse.json(data, { status: upstream.status });
      } catch (err) {
        span.setStatus({ code: 2, message: String(err) });
        log.error('Anthropic upstream request failed', err);
        return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 });
      }
    }
  );
}
