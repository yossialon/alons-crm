/**
 * Thin logger that writes to console and, when SENTRY_DSN is set, captures
 * exceptions via @sentry/nextjs. Keeps call sites clean of SDK references.
 */

function captureWithSentry(err: unknown, context?: unknown): void {
  if (!process.env.SENTRY_DSN) return;
  try {
    // Dynamic import so the app works without Sentry installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/nextjs') as typeof import('@sentry/nextjs');
    if (context) {
      Sentry.withScope((scope) => {
        scope.setExtra('context', context);
        Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
      });
    } else {
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    }
  } catch {
    // Sentry not installed or failed — silently degrade
  }
}

export const log = {
  info(message: string, data?: unknown): void {
    console.info(`[crm] ${message}`, data ?? '');
  },

  warn(message: string, data?: unknown): void {
    console.warn(`[crm] WARN: ${message}`, data ?? '');
  },

  error(message: string, err?: unknown): void {
    console.error(`[crm] ERROR: ${message}`, err ?? '');
    captureWithSentry(err ?? new Error(message), { message });
  },
};
