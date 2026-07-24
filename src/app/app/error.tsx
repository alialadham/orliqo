"use client";

import { StatePanel } from "@/components/feedback/state-panel";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return <StatePanel variant="error" title="Workspace view unavailable" description="The request failed safely. Retry this view; no provider delivery was attempted." retry={{ label: "Retry", onClick: reset }} action={{ label: "Return to dashboard", href: "/app/dashboard" }} />;
}
