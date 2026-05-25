/**
 * Structured logger for the CRM.
 *
 * - In production (Vercel): outputs JSON to stdout so logs are parseable in
 *   the Vercel dashboard and any downstream log drain (Datadog, Logtail, etc.).
 * - In development: outputs human-readable colored text.
 * - When SENTRY_DSN is set: errors and warnings are also captured via Sentry.
 *
 * Usage:
 *   import { log } from '@/lib/logger';
 *   log.info('Lead imported', { leadId, source });
 *   log.error('Stripe charge failed', err, { orgId, plan });
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level:    Level;
  message:  string;
  ts:       string;
  env:      string;
  data?:    unknown;
  error?:   { message: string; stack?: string; name: string };
}

const isProd = process.env.NODE_ENV === 'production';
const env    = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development';

function toErrorShape(err: unknown): { message: string; stack?: string; name: string } | undefined {
  if (!err) return undefined;
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: isProd ? undefined : err.stack };
  }
  return { name: 'UnknownError', message: String(err) };
}

function emit(level: Level, message: string, data?: unknown, err?: unknown): void {
  const entry: LogEntry = {
    level,
    message,
    ts:  new Date().toISOString(),
    env,
    ...(data  !== undefined ? { data }           : {}),
    ...(err   !== undefined ? { error: toErrorShape(err) } : {}),
  };

  if (isProd) {
    // JSON to stdout — Vercel / log drains parse this
    const line = JSON.stringify(entry);
    if (level === 'error') process.stderr.write(line + '\n');
    else                   process.stdout.write(line + '\n');
  } else {
    // Human-readable dev output
    const prefix = { debug: '🔍', info: 'ℹ️ ', warn: '⚠️ ', error: '🚨' }[level];
    const fn     = { debug: console.debug, info: console.info, warn: console.warn, error: console.error }[level];
    fn(`${prefix} [crm:${level}] ${message}`, ...(data !== undefined ? [data] : []), ...(err !== undefined ? [err] : []));
  }
}

function captureWithSentry(level: 'warn' | 'error', err: unknown, context?: unknown): void {
  if (!process.env.SENTRY_DSN) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/nextjs') as typeof import('@sentry/nextjs');
    if (level === 'warn') {
      Sentry.captureMessage(String(err), { level: 'warning', extra: { context } });
    } else {
      Sentry.withScope((scope) => {
        if (context) scope.setExtra('context', context);
        Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
      });
    }
  } catch {
    // Sentry not installed or failed — silently degrade
  }
}

export const log = {
  debug(message: string, data?: unknown): void {
    if (!isProd) emit('debug', message, data);
  },

  info(message: string, data?: unknown): void {
    emit('info', message, data);
  },

  warn(message: string, data?: unknown): void {
    emit('warn', message, data);
    captureWithSentry('warn', message, data);
  },

  error(message: string, err?: unknown, data?: unknown): void {
    emit('error', message, data, err);
    captureWithSentry('error', err ?? new Error(message), { message, data });
  },
};
