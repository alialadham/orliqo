import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN) && process.env.NODE_ENV === "production",
  sendDefaultPii: false,
  tracesSampleRate: 0.05,
});
