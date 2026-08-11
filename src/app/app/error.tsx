"use client";

import { StatePanel } from "@/components/feedback/state-panel";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return <StatePanel variant="error" title="We couldn’t load this workspace view" description="Try this page again. If the problem continues, return to the dashboard and retry in a moment." retry={{ label: "Try again", onClick: reset }} action={{ label: "Return to dashboard", href: "/app/dashboard" }} />;
}
