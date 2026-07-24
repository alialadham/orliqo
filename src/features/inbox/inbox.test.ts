import { describe, expect, it } from "vitest";

import { DEMO_WORKSPACE_ID } from "@/features/demo/data";
import { demoPhase5Conversations } from "@/features/demo/phase5-store";
import { filterInboxConversations } from "@/features/inbox/data";
import { INBOX_INTENTS } from "@/features/inbox/types";

describe("Phase 5 inbox foundation", () => {
  it("covers every required intent with deterministic inbound fixtures", () => {
    const conversations = demoPhase5Conversations(DEMO_WORKSPACE_ID);
    expect(
      new Set(conversations.map((conversation) => conversation.intent)),
    ).toEqual(new Set(INBOX_INTENTS));
    expect(
      conversations.every((conversation) =>
        conversation.messages.some(
          (message) => message.direction === "inbound",
        ),
      ),
    ).toBe(true);
    expect(
      conversations.every((conversation) =>
        conversation.messages.every(
          (message) =>
            message.deliveryStatus !== "sent" ||
            message.direction === "outbound",
        ),
      ),
    ).toBe(true);
  });

  it("filters folders and channels without crossing the workspace fixture", () => {
    const conversations = demoPhase5Conversations(DEMO_WORKSPACE_ID);
    expect(
      filterInboxConversations(conversations, {
        folder: "needs_response",
        channel: "all",
      }),
    ).toHaveLength(4);
    expect(
      filterInboxConversations(conversations, {
        folder: "all",
        channel: "whatsapp",
      }).every((conversation) => conversation.channel === "whatsapp"),
    ).toBe(true);
    expect(demoPhase5Conversations("other-workspace")).toEqual([]);
  });
});
