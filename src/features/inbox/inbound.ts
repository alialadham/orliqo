import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { classifyInboundMessage } from "./classification";
import type { InboxChannel } from "./types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type NormalizedInboundMessage = {
  workspaceId: string;
  integrationId: string;
  provider: "gmail" | "outlook" | "resend" | "ses" | "whatsapp";
  providerEventId: string;
  providerMessageId: string;
  providerThreadId: string;
  channel: Extract<InboxChannel, "email" | "whatsapp">;
  senderAddress: string;
  senderName?: string;
  recipientAddress?: string;
  subject?: string;
  body: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

export async function persistInboundMessage(
  input: NormalizedInboundMessage,
): Promise<{ duplicate: boolean; conversationId: string | null }> {
  const classification = classifyInboundMessage(input.body);
  const client = createAdminSupabaseClient() as unknown as SupabaseClient;
  const { data, error } = await client
    .schema("private")
    .rpc("process_inbound_message", {
      target_workspace_id: input.workspaceId,
      target_integration_id: input.integrationId,
      provider_name: input.provider,
      provider_event_id: input.providerEventId,
      provider_message_id: input.providerMessageId,
      provider_thread_id: input.providerThreadId,
      message_channel: input.channel,
      sender_address: input.senderAddress,
      sender_name: input.senderName ?? null,
      recipient_address: input.recipientAddress ?? null,
      message_subject: input.subject ?? null,
      message_body: input.body,
      occurred_at: input.occurredAt,
      classified_intent: classification.intent,
      intent_confidence: classification.confidence,
      intent_evidence: classification.evidence,
      classifier_version: classification.classifierVersion,
      redacted_metadata: input.metadata ?? {},
    });
  if (error) throw new Error("Inbound message persistence failed.");
  const result = data as {
    duplicate?: boolean;
    conversation_id?: string;
  } | null;
  return {
    duplicate: Boolean(result?.duplicate),
    conversationId: result?.conversation_id ?? null,
  };
}
