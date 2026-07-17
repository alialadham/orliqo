"use client";

import { useEffect } from "react";

import { StatePanel } from "@/components/feedback/state-panel";

export default function AppError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <StatePanel variant="error" title="Workspace view unavailable" description="The request failed safely. Refresh the page to retry; no provider delivery was attempted." action={{ label: "Return to dashboard", href: "/app/dashboard" }} />;
}
