import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Tag every event with the deployment environment
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  // Attach the Vercel deployment URL / git SHA for easy triage
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // PII: never send request bodies, cookies, or user data to Sentry
  sendDefaultPii: false,

  // 100% in dev/preview, 10% in production — adjust once you have baseline data
  tracesSampleRate: isProd ? 0.1 : 1.0,

  // Local variable capture is valuable but may expose env vars / request data.
  // Only enable in development where no real user data flows through.
  includeLocalVariables: !isProd,

  enableLogs: true,

  integrations: [
    // Automatic Anthropic AI monitoring — tracks token usage, errors, latency.
    // Only active when @anthropic-ai/sdk is used directly; the /api/claude route
    // uses raw fetch, so spans there are added manually in the route handler.
    Sentry.anthropicAIIntegration({
      // Never record prompt/response content in production (contains user PII)
      recordInputs:  !isProd,
      recordOutputs: !isProd,
    }),
  ],

  beforeSend(event) {
    // Strip sensitive request headers before sending to Sentry
    if (event.request?.headers) {
      const safe = { ...event.request.headers };
      for (const key of ['cookie', 'authorization', 'x-session-token']) {
        if (key in safe) safe[key] = '[Filtered]';
      }
      event.request.headers = safe;
    }
    return event;
  },
});
