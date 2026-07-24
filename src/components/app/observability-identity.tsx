"use client";

import { useEffect } from "react";

export function ObservabilityIdentity({
  userId,
  workspaceId,
  enabled,
}: {
  userId: string;
  workspaceId: string;
  enabled: boolean;
}) {
  useEffect(() => {
    const configured = Boolean(
      process.env.NEXT_PUBLIC_POSTHOG_KEY &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST,
    );
    if (!enabled || !configured) return;
    let active = true;
    void import("posthog-js")
      .then(({ default: posthog }) => {
        if (!active || !posthog.__loaded) return;
        posthog.identify(userId);
        posthog.group("workspace", workspaceId);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [enabled, userId, workspaceId]);
  return null;
}
