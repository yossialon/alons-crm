import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  sendDefaultPii: true,

  // 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Attach local variable values to stack frames in error events
  includeLocalVariables: true,

  enableLogs: true,

  integrations: [
    // Automatic Anthropic AI monitoring — tracks token usage, errors, latency.
    // Only active when @anthropic-ai/sdk is used directly; the /api/claude route
    // uses raw fetch, so spans there are added manually (see the route handler).
    Sentry.anthropicAIIntegration({
      recordInputs: true,
      recordOutputs: true,
    }),
  ],
});
