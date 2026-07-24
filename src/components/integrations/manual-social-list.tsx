"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, MessageSquareReply } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  markManualSocialSentAction,
  toggleManualReplyAction,
} from "@/features/integrations/actions";
import type { ManualSocialDraft } from "@/features/integrations/types";

export function ManualSocialList({ drafts }: { drafts: ManualSocialDraft[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();
  const run = (action: () => Promise<{ message: string }>) =>
    startTransition(async () => {
      setMessage((await action()).message);
      router.refresh();
    });

  return (
    <div className="space-y-3">
      {drafts.map((draft) => (
        <article
          key={draft.id}
          className="bg-card grid gap-4 rounded-xl border p-4 lg:grid-cols-[170px_1fr_auto] lg:items-center"
        >
          <div>
            <strong>{draft.businessName}</strong>
            <div className="mt-1 flex gap-2">
              <Badge variant="outline" className="capitalize">
                {draft.channel}
              </Badge>
              <Badge variant="secondary">Manual only</Badge>
            </div>
          </div>
          <div>
            <p className="text-sm leading-6">{draft.body}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {draft.capability.reason}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-64 lg:justify-end">
            <Button asChild size="sm" variant="outline">
              <a href={draft.profileUrl} target="_blank" rel="noreferrer">
                <ExternalLink />
                Open profile
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void navigator.clipboard.writeText(draft.body)}
            >
              <Copy />
              Copy
            </Button>
            <Button
              size="sm"
              disabled={pending || Boolean(draft.sentAt)}
              onClick={() => run(() => markManualSocialSentAction(draft.id))}
            >
              <Check />
              {draft.sentAt ? "Sent manually" : "Mark sent"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => toggleManualReplyAction(draft.id))}
            >
              <MessageSquareReply />
              {draft.replyStatus === "replied"
                ? "Reply recorded"
                : "Track reply"}
            </Button>
          </div>
        </article>
      ))}
      {message ? (
        <p role="status" className="text-muted-foreground text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
