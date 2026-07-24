"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  connectIntegrationAction,
  disconnectIntegrationAction,
  testIntegrationAction,
  toggleIntegrationPauseAction,
} from "@/features/integrations/actions";
import type {
  IntegrationProvider,
  IntegrationStatus,
} from "@/features/integrations/types";

type Props = {
  id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  canPause: boolean;
};

export function IntegrationControls({ id, provider, status, canPause }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();
  const run = (
    action: () => Promise<{ message: string; redirectUrl?: string }>,
  ) => {
    startTransition(async () => {
      const result = await action();
      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
        return;
      }
      setMessage(result.message);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {status === "disconnected" ||
        status === "expired" ||
        status === "error" ? (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(() => connectIntegrationAction(provider))}
          >
            {status === "expired" ? "Reconnect sandbox" : "Connect sandbox"}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => testIntegrationAction(id))}
          >
            Test connection
          </Button>
        )}
        {canPause && ["connected", "paused"].includes(status) ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => toggleIntegrationPauseAction(id))}
          >
            {status === "paused" ? "Resume" : "Pause"}
          </Button>
        ) : null}
        {status === "connected" || status === "paused" ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => disconnectIntegrationAction(id))}
          >
            Disconnect
          </Button>
        ) : null}
      </div>
      {message ? (
        <p
          role="status"
          className="text-muted-foreground mt-2 text-xs leading-5"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
