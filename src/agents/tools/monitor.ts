// ── System Monitor Tool ───────────────────────────────────────────────────────
// Individual health check functions used by the Tech Manager agent.

import { createClient } from '@supabase/supabase-js';
import type { HealthCheck } from '@/agents/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const BASE_URL     = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const ALERT_MS     = Number(process.env.TECH_ALERT_THRESHOLD_MS ?? '3000');

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required for monitor operations. ' +
      'This module must only run server-side. ' +
      'Never fall back to the public anon key.',
    );
  }
  return createClient(SUPABASE_URL, key);
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const t = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - t };
}

/** 1. Database round-trip latency */
export async function checkDbLatency(): Promise<HealthCheck> {
  try {
    const { ms } = await timed(() =>
      Promise.resolve(serviceClient().from('leads').select('id').limit(1))
    );
    return {
      name:     'db_latency',
      status:   ms > ALERT_MS ? 'warn' : 'ok',
      value_ms: ms,
      details:  `DB round-trip: ${ms}ms`,
    };
  } catch (e) {
    return { name: 'db_latency', status: 'error', details: String(e) };
  }
}

/** 2. Leads API endpoint latency */
export async function checkLeadApi(): Promise<HealthCheck> {
  try {
    const { ms, result } = await timed(() =>
      fetch(`${BASE_URL}/api/leads`, {
        headers: { Cookie: '' }, // unauthenticated — expect 401, not 500
      })
    );
    const ok = result.status < 500;
    return {
      name:     'lead_api',
      status:   !ok ? 'error' : ms > ALERT_MS ? 'warn' : 'ok',
      value_ms: ms,
      details:  `HTTP ${result.status}`,
    };
  } catch (e) {
    return { name: 'lead_api', status: 'error', details: String(e) };
  }
}

/** 3. Claude API connectivity */
export async function checkClaudeApi(): Promise<HealthCheck> {
  const key = process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY;
  if (!key) return { name: 'claude_api', status: 'warn', details: 'ANTHROPIC_API_KEY / CLAUDE_API_KEY not set' };
  try {
    const { ms } = await timed(() =>
      fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key ?? '', 'anthropic-version': '2023-06-01' },
        body:    JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 5, messages: [{ role: 'user', content: 'ping' }] }),
      })
    );
    return {
      name:     'claude_api',
      status:   ms > 8000 ? 'warn' : 'ok',
      value_ms: ms,
      details:  `Anthropic API reachable in ${ms}ms`,
    };
  } catch (e) {
    return { name: 'claude_api', status: 'error', details: String(e) };
  }
}

/** 4. WhatsApp API reachability */
export async function checkWhatsappApi(): Promise<HealthCheck> {
  const token   = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { name: 'whatsapp_api', status: 'warn', details: 'WA credentials not set' };
  try {
    const { ms, result } = await timed(() =>
      fetch(`https://graph.facebook.com/v19.0/${phoneId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    const ok = result.status === 200;
    return {
      name:     'whatsapp_api',
      status:   ok ? 'ok' : 'error',
      value_ms: ms,
      details:  `HTTP ${result.status}`,
    };
  } catch (e) {
    return { name: 'whatsapp_api', status: 'error', details: String(e) };
  }
}

/** 5. Instagram API reachability */
export async function checkInstagramApi(): Promise<HealthCheck> {
  const token   = process.env.INSTAGRAM_ACCESS_TOKEN;
  const acctId  = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!token || !acctId) return { name: 'instagram_api', status: 'warn', details: 'IG credentials not set' };
  try {
    const { ms, result } = await timed(() =>
      fetch(`https://graph.facebook.com/v19.0/${acctId}?fields=id&access_token=${token}`)
    );
    return {
      name:     'instagram_api',
      status:   result.status === 200 ? 'ok' : 'warn',
      value_ms: ms,
      details:  `HTTP ${result.status}`,
    };
  } catch (e) {
    return { name: 'instagram_api', status: 'error', details: String(e) };
  }
}

/** 6. Storage bucket reachability */
export async function checkStorage(): Promise<HealthCheck> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_URL) return { name: 'storage', status: 'warn', details: 'Supabase not configured' };
  try {
    const { ms } = await timed(() =>
      serviceClient().storage.from('brand-assets').list('', { limit: 1 })
    );
    return { name: 'storage', status: ms > ALERT_MS ? 'warn' : 'ok', value_ms: ms, details: `Storage reachable in ${ms}ms` };
  } catch (e) {
    return { name: 'storage', status: 'error', details: String(e) };
  }
}

/** 7. Agent runs table is accessible */
export async function checkAgentTable(): Promise<HealthCheck> {
  try {
    const { ms } = await timed(() =>
      Promise.resolve(serviceClient().from('agent_runs').select('id').limit(1))
    );
    return { name: 'agent_table', status: 'ok', value_ms: ms, details: `agent_runs table accessible in ${ms}ms` };
  } catch (e) {
    return { name: 'agent_table', status: 'error', details: String(e) };
  }
}

/** 8. Social messages table */
export async function checkSocialMessages(): Promise<HealthCheck> {
  try {
    const { ms } = await timed(() =>
      Promise.resolve(serviceClient().from('social_messages').select('id').limit(1))
    );
    return { name: 'social_messages', status: 'ok', value_ms: ms, details: `social_messages accessible in ${ms}ms` };
  } catch (e) {
    return { name: 'social_messages', status: 'error', details: String(e) };
  }
}

/** 9. Disk/memory — not directly measurable from serverless, report config completeness instead */
export async function checkConfig(): Promise<HealthCheck> {
  const required = ['ANTHROPIC_API_KEY', 'DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SESSION_SECRET'];
  const missing  = required.filter((k) => !process.env[k]);
  return {
    name:    'config',
    status:  missing.length > 0 ? 'warn' : 'ok',
    details: missing.length > 0 ? `Missing env vars: ${missing.join(', ')}` : 'All required env vars present',
  };
}

/** Run all 9 checks in parallel */
export async function runAllHealthChecks(): Promise<HealthCheck[]> {
  return Promise.all([
    checkDbLatency(),
    checkLeadApi(),
    checkClaudeApi(),
    checkWhatsappApi(),
    checkInstagramApi(),
    checkStorage(),
    checkAgentTable(),
    checkSocialMessages(),
    checkConfig(),
  ]);
}
