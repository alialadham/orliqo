import { InboxView } from "@/components/inbox/inbox-view";
import { StatePanel } from "@/components/feedback/state-panel";
import { getInboxData } from "@/features/inbox/data";
import type { InboxChannel, InboxFolder } from "@/features/inbox/types";
import { hasPermission } from "@/features/permissions/permissions";
import { getWorkspaceContext } from "@/features/workspaces/data";

const folders = new Set<InboxFolder>([
  "all",
  "interested",
  "needs_response",
  "follow_up_later",
  "not_interested",
  "meetings",
  "archived",
  "spam",
]);
const channels = new Set<InboxChannel | "all">([
  "all",
  "email",
  "whatsapp",
  "instagram",
  "linkedin",
]);

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{
    folder?: string;
    channel?: string;
    conversation?: string;
    q?: string;
  }>;
}) {
  const context = await getWorkspaceContext();
  if (!context) return null;
  if (!hasPermission(context.activeWorkspace.role, "inbox:view"))
    return (
      <StatePanel
        variant="permission"
        title="Inbox permission required"
        description="Your workspace role cannot view inbound conversations."
        action={{ label: "Go to dashboard", href: "/app/dashboard" }}
      />
    );
  const query = await searchParams;
  const folder = folders.has(query.folder as InboxFolder)
    ? (query.folder as InboxFolder)
    : "all";
  const channel = channels.has(query.channel as InboxChannel | "all")
    ? (query.channel as InboxChannel | "all")
    : "all";
  const data = await getInboxData({
    folder,
    channel,
    conversationId: query.conversation,
    search: query.q,
  });
  return (
    <InboxView
      {...data}
      folder={folder}
      channel={channel}
      canReply={hasPermission(context.activeWorkspace.role, "inbox:reply")}
    />
  );
}
