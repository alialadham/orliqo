import "server-only";

import { readDemoSession } from "@/features/auth/demo-session";
import { demoPhase5Conversations } from "@/features/demo/phase5-store";
import type {
  InboxChannel,
  InboxConversation,
  InboxFolder,
} from "@/features/inbox/types";
import { getWorkspaceContext } from "@/features/workspaces/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type InboxQuery = {
  folder: InboxFolder;
  channel: InboxChannel | "all";
  conversationId?: string;
  search?: string;
};

export function belongsToFolder(
  conversation: InboxConversation,
  folder: InboxFolder,
): boolean {
  if (folder === "all") return true;
  if (folder === "interested") return conversation.intent === "interested";
  if (folder === "needs_response")
    return conversation.status === "needs_response";
  if (folder === "follow_up_later")
    return conversation.status === "follow_up_later";
  if (folder === "not_interested")
    return conversation.status === "not_interested";
  return (
    conversation.status === folder.slice(0, -1) ||
    conversation.status === folder
  );
}

export function filterInboxConversations(
  conversations: InboxConversation[],
  query: Pick<InboxQuery, "folder" | "channel" | "search">,
): InboxConversation[] {
  const search = query.search?.trim().toLowerCase();
  return conversations.filter(
    (conversation) =>
      belongsToFolder(conversation, query.folder) &&
      (query.channel === "all" || conversation.channel === query.channel) &&
      (!search ||
        [
          conversation.businessName,
          conversation.contactName,
          conversation.preview,
          conversation.campaignName,
        ].some((value) => value.toLowerCase().includes(search))),
  );
}

export async function getInboxData(query: InboxQuery) {
  const context = await getWorkspaceContext();
  let conversations: InboxConversation[] = [];
  if (context?.isDemo) {
    const session = await readDemoSession();
    if (session?.kind === "workspace")
      conversations = demoPhase5Conversations(session.activeWorkspaceId);
  } else if (context) {
    const client =
      (await createServerSupabaseClient()) as unknown as SupabaseClient;
    const { data: rows } = await client
      .from("conversations")
      .select(
        "id,lead_id,campaign_id,channel,status,intent,intent_confidence,unread_count,last_message_at,assigned_to,leads(business_name,qualification_score,status),campaigns(name),messages(id,direction,body,created_at,send_status),reply_suggestions(id,body,edited_body,status,scheduled_at,created_at)",
      )
      .eq("workspace_id", context.activeWorkspace.id)
      .order("last_message_at", { ascending: false })
      .limit(100);
    conversations = ((rows ?? []) as Array<Record<string, unknown>>).map(
      (row) => {
        const lead = (row.leads ?? {}) as Record<string, unknown>;
        const campaign = (row.campaigns ?? {}) as Record<string, unknown>;
        const messages = (row.messages ?? []) as Array<Record<string, unknown>>;
        const suggestions = (row.reply_suggestions ?? []) as Array<
          Record<string, unknown>
        >;
        const last = messages.at(-1);
        return {
          id: String(row.id),
          leadId: String(row.lead_id ?? ""),
          businessName: String(lead.business_name ?? "Unmatched contact"),
          contactName: String(lead.business_name ?? "Inbound contact"),
          channel: row.channel as InboxChannel,
          preview: String(last?.body ?? ""),
          intent: row.intent as InboxConversation["intent"],
          intentConfidence: Number(row.intent_confidence ?? 0),
          status: row.status as InboxConversation["status"],
          unreadCount: Number(row.unread_count ?? 0),
          relativeTime: "Recent",
          lastMessageAt: String(row.last_message_at ?? ""),
          campaignName: String(campaign.name ?? "Unattributed"),
          score: Number(lead.qualification_score ?? 0),
          leadStatus: String(lead.status ?? "Unmatched"),
          assignedName: row.assigned_to ? "Assigned teammate" : "Unassigned",
          notes: [],
          messages: messages.map((message) => ({
            id: String(message.id),
            direction: message.direction as "inbound" | "outbound",
            body: String(message.body),
            sentAt: String(message.created_at),
            deliveryStatus:
              message.direction === "inbound"
                ? "received"
                : ((["sent", "delivered", "read"].includes(
                    String(message.send_status),
                  )
                    ? message.send_status
                    : "sent") as "sent" | "delivered" | "read"),
          })),
          aiSuggestion: String(
            suggestions.find((item) => item.status === "pending")?.body ??
              "Generate a reviewed suggestion before replying.",
          ),
          replySuggestion: suggestions[0]
            ? {
                id: String(suggestions[0].id ?? ""),
                body: String(
                  suggestions[0].edited_body ?? suggestions[0].body ?? "",
                ),
                status: String(suggestions[0].status) as
                  "pending" | "accepted" | "edited" | "dismissed",
                ...(suggestions[0].scheduled_at
                  ? { scheduledAt: String(suggestions[0].scheduled_at) }
                  : {}),
              }
            : null,
        };
      },
    );
  }
  const filtered = filterInboxConversations(conversations, query);
  const selected =
    filtered.find((conversation) => conversation.id === query.conversationId) ??
    filtered[0] ??
    null;
  const counts = Object.fromEntries(
    (
      [
        "all",
        "interested",
        "needs_response",
        "follow_up_later",
        "not_interested",
        "meetings",
        "archived",
        "spam",
      ] as const
    ).map((folder) => [
      folder,
      conversations.filter((conversation) =>
        belongsToFolder(conversation, folder),
      ).length,
    ]),
  ) as Record<InboxFolder, number>;
  return {
    conversations: filtered,
    selected,
    counts,
    demo: Boolean(context?.isDemo),
  };
}
