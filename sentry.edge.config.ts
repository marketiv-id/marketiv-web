import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

  // Environment dynamically read from env var (staging / production)
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NEXT_PUBLIC_APP_ENV || "staging",

  // Tracing (minimal sample rate)
  tracesSampleRate: 0.1,

  // Disable default PII collection
  sendDefaultPii: false,
});
