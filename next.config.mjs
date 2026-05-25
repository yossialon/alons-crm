import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Packages that must only run server-side ─────────────────────────────────
  // Prevents Next.js from trying to bundle TCP/native modules into the client
  // or edge runtimes. ioredis uses net/tls which are Node.js-only.
  serverExternalPackages: ['ioredis'],

  // ── Security headers ─────────────────────────────────────────────────────────
  async headers() {
    // Content-Security-Policy — tightly scoped to what the app actually needs.
    // script-src:  'self' + Next.js inline runtime (nonce not used; hash-based
    //              approach is Next.js default) + Sentry tunnel script
    // connect-src: Supabase, Anthropic, Meta Graph, Sentry, Stripe JS
    // frame-src:   Stripe checkout iframe
    // img-src:     CDN hostnames that next/image already allows
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://connect.facebook.net",   // unsafe-eval required by Next.js dev; remove in hardened prod
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://graph.facebook.com https://scontent.cdninstagram.com https://lh3.googleusercontent.com https://www.facebook.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://graph.facebook.com https://www.facebook.com https://api.stripe.com https://*.sentry.io",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy',     value: csp },
          { key: 'X-Content-Type-Options',      value: 'nosniff' },
          { key: 'X-Frame-Options',             value: 'DENY' },
          { key: 'X-XSS-Protection',            value: '0' },          // CSP replaces this; '1' causes issues on modern browsers
          { key: 'Referrer-Policy',             value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',          value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          {
            key:   'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      // Webhooks and tracking pixels need relaxed CORS
      {
        source: '/api/webhooks/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST' },
        ],
      },
      {
        source: '/api/track/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Cache-Control',                value: 'no-store, no-cache' },
        ],
      },
    ];
  },

  // ── Image optimization ───────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'graph.facebook.com' },
      { protocol: 'https', hostname: 'scontent.cdninstagram.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  // ── Logging ──────────────────────────────────────────────────────────────────
  // Reduce noise in Vercel function logs — only show errors
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
};

export default withSentryConfig(nextConfig, {
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Source map upload auth token — set in .env.sentry-build-plugin or CI secrets
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload wider set of client source files for better stack trace resolution
  widenClientFileUpload: true,

  // Proxy Sentry requests through /monitoring to bypass ad-blockers
  tunnelRoute: "/monitoring",

  // Suppress non-CI output
  silent: !process.env.CI,

  // Disable source map upload when auth token is not set
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Automatically instrument Vercel functions
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
});
