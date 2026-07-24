"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { syncWhatsAppTemplatesAction } from "@/features/integrations/actions";

export function TemplateSyncButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMessage((await syncWhatsAppTemplatesAction()).message);
            router.refresh();
          })
        }
      >
        <RefreshCw />
        {pending ? "Syncing…" : "Sync templates"}
      </Button>
      {message ? (
        <span role="status" className="text-muted-foreground text-xs">
          {message}
        </span>
      ) : null}
    </div>
  );
}
