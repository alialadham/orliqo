"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  approveMessageAction,
  controlCampaignAction,
  dispatchDemoMessageAction,
  generateCampaignMessagesAction,
  rewriteMessageAction,
} from "@/features/campaigns/actions";

type ActionResponse = Promise<{ message: string }>;

export function CampaignControls({
  campaignId,
  status,
}: {
  campaignId: string;
  status: string;
}) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (action: () => ActionResponse) =>
    start(async () => {
      const result = await action();
      setMessage(result.message);
      router.refresh();
    });
  const kill = () => {
    if (
      window.confirm(
        "Kill this campaign and cancel every unsent message? This cannot be resumed.",
      )
    )
      run(() => controlCampaignAction(campaignId, "kill"));
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {["draft", "researching", "awaiting_approval"].includes(status) ? (
        <Button
          disabled={pending}
          onClick={() => run(() => generateCampaignMessagesAction(campaignId))}
        >
          Generate grounded messages
        </Button>
      ) : null}
      {["draft", "awaiting_approval", "scheduled"].includes(status) ? (
        <Button
          disabled={pending}
          onClick={() => run(() => controlCampaignAction(campaignId, "launch"))}
        >
          Launch campaign
        </Button>
      ) : null}
      {status === "running" ? (
        <Button
          disabled={pending}
          variant="outline"
          onClick={() => run(() => controlCampaignAction(campaignId, "pause"))}
        >
          Pause
        </Button>
      ) : null}
      {status === "paused" ? (
        <Button
          disabled={pending}
          variant="outline"
          onClick={() => run(() => controlCampaignAction(campaignId, "resume"))}
        >
          Resume
        </Button>
      ) : null}
      {!["completed", "killed"].includes(status) ? (
        <Button disabled={pending} variant="destructive" onClick={kill}>
          Kill
        </Button>
      ) : null}
      {message ? (
        <span role="status" className="text-muted-foreground text-xs">
          {message}
        </span>
      ) : null}
    </div>
  );
}

export function MessageActions({
  id,
  canApprove,
  canSend,
  demo,
}: {
  id: string;
  canApprove: boolean;
  canSend: boolean;
  demo: boolean;
}) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (action: () => ActionResponse) =>
    start(async () => {
      const result = await action();
      setMessage(result.message);
      router.refresh();
    });
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {canApprove ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => approveMessageAction(id))}
          >
            Approve
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => rewriteMessageAction(id, "shorten"))}
        >
          Shorten
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => rewriteMessageAction(id, "friendly"))}
        >
          Tone
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => rewriteMessageAction(id, "translate"))}
        >
          Translate
        </Button>
        {canSend ? (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(() => dispatchDemoMessageAction(id))}
          >
            {demo ? "Simulate send" : "Send now"}
          </Button>
        ) : null}
      </div>
      {message ? (
        <p role="status" className="text-muted-foreground mt-1 text-xs">
          {message}
        </p>
      ) : null}
    </div>
  );
}
