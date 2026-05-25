import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  // Client config uses NEXT_PUBLIC_ prefix — safe to expose to browser
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  sendDefaultPii: false,

  tracesSampleRate: isProd ? 0.05 : 1.0,

  // Session Replay: 5% of sessions in prod, 100% of sessions with errors
  replaysSessionSampleRate: isProd ? 0.05 : 0,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media by default — privacy-first
      maskAllText:  true,
      blockAllMedia: true,
    }),
  ],
});

// Hook into App Router navigation transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
