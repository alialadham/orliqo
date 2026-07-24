import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

// Prevent Zod's optional runtime code-generation probe under a strict CSP.
z.config({ jitless: true });

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    enabled: process.env.NODE_ENV === "production",
    sendDefaultPii: false,
    tracesSampleRate: 0.05,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
if (posthogKey && posthogHost && process.env.NODE_ENV === "production") {
  void import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        defaults: "2026-05-30",
        capture_pageview: true,
        capture_pageleave: true,
        disable_session_recording: true,
      });
    })
    .catch(() => undefined);
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
