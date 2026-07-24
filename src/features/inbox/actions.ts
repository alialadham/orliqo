"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeAuditLog } from "@/features/audit/server";
import { readDemoSession } from "@/features/auth/demo-session";
import { demoPhase5Store } from "@/features/demo/phase5-store";
import {
  configuredEmailAdapter,
  configuredWhatsAppAdapter,
} from "@/features/integrations/provider-runtime";
import { isEmailProvider } from "@/features/integrations/email-adapters";
import { requirePermission } from "@/features/permissions/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { INBOX_INTENTS, type InboxConversation } from "./types";

export type InboxActionResult = { ok: boolean; message: string };
const idSchema = z.string().uuid();
const conversationIdSchema = z.string().min(1).max(100);

async function context(permission: "inbox:reply" | "message:send") {
  const value = await requirePermission(permission);
  if (!value) return null;
  return {
    value,
    demo: (await readDemoSession())?.kind === "workspace",
  };
}

function demoConversation(workspaceId: string, conversationId: string) {
  return (demoPhase5Store().get(workspaceId) ?? []).find(
    (item) => item.id === conversationId,
  );
}

function relation(value: unknown): Record<string, unknown> | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && typeof candidate === "object"
    ? (candidate as Record<string, unknown>)
    : null;
}

async function audited(
  action: Awaited<ReturnType<typeof context>>,
  name: string,
  conversationId: string,
  after: Record<string, unknown>,
) {
  if (!action) return;
  await writeAuditLog({
    workspaceId: action.value.activeWorkspace.id,
    actorId: action.value.user.id,
    action: name,
    entityType: "conversation",
    entityId: idSchema.safeParse(conversationId).success
      ? conversationId
      : null,
    after,
  });
  revalidatePath("/app/inbox");
}

export async function setConversationReadAction(
  conversationId: string,
  unread: boolean,
): Promise<InboxActionResult> {
  const action = await context("inbox:reply");
  if (!action || !conversationIdSchema.safeParse(conversationId).success)
    return { ok: false, message: "Conversation update is not permitted." };
  if (action.demo) {
    const item = demoConversation(
      action.value.activeWorkspace.id,
      conversationId,
    );
    if (!item) return { ok: false, message: "Conversation not found." };
    item.unreadCount = unread ? Math.max(1, item.unreadCount) : 0;
  } else {
    const client =
      (await createServerSupabaseClient()) as unknown as SupabaseClient;
    const { error } = await client
      .from("conversations")
      .update({
        unread_count: unread ? 1 : 0,
        read_at: unread ? null : new Date().toISOString(),
        last_read_by: unread ? null : action.value.user.id,
      } as never)
      .eq("id", conversationId)
      .eq("workspace_id", action.value.activeWorkspace.id);
    if (error) return { ok: false, message: "Read state was not updated." };
  }
  await audited(
    action,
    unread ? "inbox.marked_unread" : "inbox.marked_read",
    conversationId,
    { unread },
  );
  return { ok: true, message: unread ? "Marked unread." : "Marked read." };
}

export async function assignConversationAction(
  conversationId: string,
  assigneeId: string | null,
): Promise<InboxActionResult> {
  const action = await context("inbox:reply");
  if (
    !action ||
    !conversationIdSchema.safeParse(conversationId).success ||
    (assigneeId !== null && !idSchema.safeParse(assigneeId).success)
  )
    return { ok: false, message: "Assignment is not valid." };
  if (action.demo) {
    const item = demoConversation(
      action.value.activeWorkspace.id,
      conversationId,
    );
    if (!item) return { ok: false, message: "Conversation not found." };
    item.assignedName = assigneeId ? "Assigned teammate" : "Unassigned";
  } else {
    const client =
      (await createServerSupabaseClient()) as unknown as SupabaseClient;
    if (assigneeId) {
      const { data: member } = await client
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", action.value.activeWorkspace.id)
        .eq("user_id", assigneeId)
        .eq("status", "active")
        .maybeSingle();
      if (!member)
        return {
          ok: false,
          message: "Assignee is not an active workspace member.",
        };
    }
    const { error } = await client
      .from("conversations")
      .update({
        assigned_to: assigneeId,
        assigned_at: new Date().toISOString(),
        assigned_by: action.value.user.id,
      } as never)
      .eq("id", conversationId)
      .eq("workspace_id", action.value.activeWorkspace.id);
    if (error) return { ok: false, message: "Assignment was not updated." };
  }
  await audited(action, "inbox.assigned", conversationId, { assigneeId });
  return { ok: true, message: "Assignment updated." };
}

export async function updateConversationIntentAction(
  conversationId: string,
  intent: InboxConversation["intent"],
): Promise<InboxActionResult> {
  const action = await context("inbox:reply");
  if (!action || !INBOX_INTENTS.includes(intent))
    return { ok: false, message: "Intent update is not valid." };
  if (action.demo) {
    const item = demoConversation(
      action.value.activeWorkspace.id,
      conversationId,
    );
    if (!item) return { ok: false, message: "Conversation not found." };
    item.intent = intent;
    item.intentConfidence = 1;
  } else {
    const client =
      (await createServerSupabaseClient()) as unknown as SupabaseClient;
    const { error } = await client
      .from("conversations")
      .update({
        intent,
        intent_confidence: 1,
        intent_evidence: ["manual review"],
        classifier_version: "manual",
      } as never)
      .eq("id", conversationId)
      .eq("workspace_id", action.value.activeWorkspace.id);
    if (error) return { ok: false, message: "Intent was not updated." };
  }
  await audited(action, "inbox.intent.updated", conversationId, { intent });
  return { ok: true, message: "Intent updated." };
}

export async function addConversationNoteAction(
  conversationId: string,
  formData: FormData,
): Promise<InboxActionResult> {
  const action = await context("inbox:reply");
  const body = z
    .string()
    .trim()
    .min(1)
    .max(5000)
    .safeParse(formData.get("body"));
  if (!action || !body.success)
    return { ok: false, message: "Enter a valid note." };
  if (action.demo) {
    const item = demoConversation(
      action.value.activeWorkspace.id,
      conversationId,
    );
    if (!item) return { ok: false, message: "Conversation not found." };
    item.notes.unshift(body.data);
  } else {
    const client =
      (await createServerSupabaseClient()) as unknown as SupabaseClient;
    const { error } = await client.from("conversation_notes").insert({
      workspace_id: action.value.activeWorkspace.id,
      conversation_id: conversationId,
      body: body.data,
      created_by: action.value.user.id,
    } as never);
    if (error) return { ok: false, message: "Note was not added." };
  }
  await audited(action, "inbox.note.added", conversationId, {});
  return { ok: true, message: "Internal note added." };
}

function suggestionBody(item: InboxConversation, mode?: string) {
  const base = `Thanks, ${item.contactName}. I can share the relevant details for ${item.businessName}. Would you prefer a concise summary here or by email?`;
  if (mode === "shorten")
    return `Thanks, ${item.contactName}. Should I share the details here or by email?`;
  if (mode === "friendlier")
    return `Hi ${item.contactName}! Happy to help with ${item.businessName}. Would you like the quick summary here or by email?`;
  if (mode === "translate")
    return `مرحباً ${item.contactName}، يسعدني مشاركة التفاصيل المناسبة لـ ${item.businessName}. هل تفضل ملخصاً هنا أم عبر البريد الإلكتروني؟`;
  return base;
}

export async function generateReplySuggestionAction(
  conversationId: string,
  mode:
    | "generate"
    | "shorten"
    | "friendlier"
    | "translate"
    | "regenerate" = "generate",
): Promise<InboxActionResult> {
  const action = await context("inbox:reply");
  if (!action)
    return { ok: false, message: "Reply generation is not permitted." };
  const demoItem = demoConversation(
    action.value.activeWorkspace.id,
    conversationId,
  );
  if (action.demo) {
    if (!demoItem) return { ok: false, message: "Conversation not found." };
    if (demoItem.intent === "stop_contact")
      return {
        ok: false,
        message: "Stop-contact requests cannot receive generated replies.",
      };
    demoItem.aiSuggestion = suggestionBody(demoItem, mode);
    demoItem.replySuggestion = {
      id: `phase5-suggestion-${conversationId}-${mode}`,
      body: demoItem.aiSuggestion,
      status: "pending",
    };
  } else {
    const client =
      (await createServerSupabaseClient()) as unknown as SupabaseClient;
    const { data: conversation } = await client
      .from("conversations")
      .select("id,intent,lead_id,leads(business_name)")
      .eq("id", conversationId)
      .eq("workspace_id", action.value.activeWorkspace.id)
      .maybeSingle();
    if (!conversation || conversation.intent === "stop_contact")
      return {
        ok: false,
        message: "Conversation is unavailable for reply generation.",
      };
    const businessName = String(
      relation(conversation.leads)?.business_name ?? "your business",
    );
    const body =
      mode === "translate"
        ? `مرحباً، يسعدني مشاركة التفاصيل المناسبة لـ ${businessName}. هل تفضل ملخصاً هنا أم عبر البريد الإلكتروني؟`
        : `Thanks for your reply. I can share the relevant details for ${businessName}. Would you prefer a concise summary here or by email?`;
    const { error } = await client.from("reply_suggestions").insert({
      workspace_id: action.value.activeWorkspace.id,
      conversation_id: conversationId,
      body,
      language: mode === "translate" ? "ar" : "en",
      tone: mode === "friendlier" ? "friendly" : "professional",
      generation_model: "deterministic-safe-boundary",
      generation_prompt_version: "phase5-v1",
      status: "pending",
      transformation: mode,
      created_by: "ai",
    });
    if (error) return { ok: false, message: "Suggestion was not generated." };
  }
  await audited(action, "inbox.suggestion.generated", conversationId, {
    mode,
    suggestionOnly: true,
  });
  return {
    ok: true,
    message: "Suggestion generated for review. Nothing was sent.",
  };
}

export async function reviewReplySuggestionAction(
  conversationId: string,
  suggestionId: string,
  decision: "approve" | "reject" | "edit",
  body?: string,
): Promise<InboxActionResult> {
  const action = await context("inbox:reply");
  if (!action || (!action.demo && !idSchema.safeParse(suggestionId).success))
    return { ok: false, message: "Suggestion review is not valid." };
  if (action.demo) {
    const item = demoConversation(
      action.value.activeWorkspace.id,
      conversationId,
    );
    if (!item?.replySuggestion || item.replySuggestion.id !== suggestionId)
      return { ok: false, message: "Suggestion not found." };
    if (decision === "edit") {
      const edited = z.string().trim().min(1).max(10000).safeParse(body);
      if (!edited.success)
        return { ok: false, message: "Edited reply is not valid." };
      item.replySuggestion.body = edited.data;
      item.aiSuggestion = edited.data;
    }
    item.replySuggestion.status =
      decision === "approve"
        ? "accepted"
        : decision === "edit"
          ? "edited"
          : "dismissed";
  } else {
    const client =
      (await createServerSupabaseClient()) as unknown as SupabaseClient;
    const now = new Date().toISOString();
    const { error } = await client
      .from("reply_suggestions")
      .update({
        status:
          decision === "approve"
            ? "accepted"
            : decision === "edit"
              ? "edited"
              : "dismissed",
        edited_body:
          decision === "edit"
            ? z.string().trim().min(1).max(10000).parse(body)
            : null,
        approved_by: decision === "approve" ? action.value.user.id : null,
        approved_at: decision === "approve" ? now : null,
        rejected_by: decision === "reject" ? action.value.user.id : null,
        rejected_at: decision === "reject" ? now : null,
        rejection_reason:
          decision === "reject" ? "Rejected during inbox review." : null,
      } as never)
      .eq("id", suggestionId)
      .eq("conversation_id", conversationId)
      .eq("workspace_id", action.value.activeWorkspace.id);
    if (error)
      return { ok: false, message: "Suggestion review was not saved." };
  }
  await audited(action, `inbox.suggestion.${decision}d`, conversationId, {
    suggestionId,
  });
  return { ok: true, message: `Suggestion ${decision}d. Nothing was sent.` };
}

export async function stopContactAction(
  conversationId: string,
): Promise<InboxActionResult> {
  const action = await context("inbox:reply");
  if (!action) return { ok: false, message: "Stop-contact is not permitted." };
  if (action.demo) {
    const item = demoConversation(
      action.value.activeWorkspace.id,
      conversationId,
    );
    if (!item) return { ok: false, message: "Conversation not found." };
    item.intent = "stop_contact";
    item.status = "closed";
    item.leadStatus = "Do not contact";
  } else {
    const client =
      (await createServerSupabaseClient()) as unknown as SupabaseClient;
    const { error } = await client
      .schema("private")
      .rpc("stop_contact_from_conversation", {
        target_workspace_id: action.value.activeWorkspace.id,
        target_conversation_id: conversationId,
        actor_id: action.value.user.id,
        stop_reason: "Inbound stop-contact request",
      });
    if (error)
      return { ok: false, message: "Atomic stop-contact workflow failed." };
  }
  revalidatePath("/app/inbox");
  return {
    ok: true,
    message: "Contact suppressed and queued outreach cancelled.",
  };
}

export async function recordMeetingOutcomeAction(
  conversationId: string,
  formData: FormData,
): Promise<InboxActionResult> {
  const action = await context("inbox:reply");
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(200),
      startsAt: z.iso.datetime(),
      endsAt: z.iso.datetime(),
    })
    .refine((value) => value.endsAt > value.startsAt, {
      message: "Meeting end must be after its start.",
    })
    .safeParse({
      title: formData.get("title"),
      startsAt: formData.get("startsAt"),
      endsAt: formData.get("endsAt"),
    });
  if (!action || !parsed.success)
    return { ok: false, message: "Meeting details are not valid." };
  if (action.demo) {
    const item = demoConversation(
      action.value.activeWorkspace.id,
      conversationId,
    );
    if (!item) return { ok: false, message: "Conversation not found." };
    item.status = "meeting";
    item.leadStatus = "Interested";
  } else {
    const client =
      (await createServerSupabaseClient()) as unknown as SupabaseClient;
    const { error } = await client
      .schema("private")
      .rpc("record_meeting_outcome", {
        target_workspace_id: action.value.activeWorkspace.id,
        target_conversation_id: conversationId,
        actor_id: action.value.user.id,
        meeting_title: parsed.data.title,
        meeting_starts_at: parsed.data.startsAt,
        meeting_ends_at: parsed.data.endsAt,
        external_calendar_id: null,
        external_event_id: null,
      });
    if (error)
      return { ok: false, message: "Meeting outcome was not recorded." };
  }
  revalidatePath("/app/inbox");
  revalidatePath("/app/calendar");
  return {
    ok: true,
    message: "Meeting, lead, campaign, calendar, and analytics updated.",
  };
}

export async function scheduleApprovedReplyAction(
  conversationId: string,
  suggestionId: string,
  scheduledAt: string,
): Promise<InboxActionResult> {
  const action = await context("message:send");
  const parsedTime = z.iso.datetime().safeParse(scheduledAt);
  if (
    !action ||
    !parsedTime.success ||
    new Date(parsedTime.data).getTime() <= Date.now()
  )
    return { ok: false, message: "Choose a valid future send time." };
  if (action.demo) {
    const item = demoConversation(
      action.value.activeWorkspace.id,
      conversationId,
    );
    if (
      !item?.replySuggestion ||
      item.replySuggestion.id !== suggestionId ||
      item.replySuggestion.status !== "accepted"
    )
      return {
        ok: false,
        message: "Approve the suggestion before scheduling.",
      };
    item.replySuggestion.scheduledAt = parsedTime.data;
    revalidatePath("/app/inbox");
    return {
      ok: true,
      message: "Demo schedule saved. No provider send will occur.",
    };
  }
  const client =
    (await createServerSupabaseClient()) as unknown as SupabaseClient;
  const { data: suggestion } = await client
    .from("reply_suggestions")
    .select(
      "id,body,edited_body,status,source_message_id,conversation_id,conversations(id,workspace_id,lead_id,campaign_id,channel,external_thread_id,leads(do_not_contact,normalized_email,normalized_phone,whatsapp_consent_status))",
    )
    .eq("id", suggestionId)
    .eq("conversation_id", conversationId)
    .eq("workspace_id", action.value.activeWorkspace.id)
    .eq("status", "accepted")
    .maybeSingle();
  const conversation = relation(suggestion?.conversations);
  const lead = relation(conversation?.leads);
  if (!suggestion || !conversation || !lead || lead.do_not_contact)
    return {
      ok: false,
      message: "Consent or suppression rules blocked scheduling.",
    };
  const channel = String(conversation.channel);
  if (channel !== "email" && channel !== "whatsapp")
    return {
      ok: false,
      message: "This channel does not support automated scheduling.",
    };
  if (channel === "whatsapp" && lead.whatsapp_consent_status !== "granted")
    return { ok: false, message: "Verified WhatsApp consent is required." };
  const normalizedRecipient =
    channel === "email" ? lead.normalized_email : lead.normalized_phone;
  if (!normalizedRecipient)
    return { ok: false, message: "A normalized recipient is required." };
  const { data: suppression } = await client
    .from("suppression_entries")
    .select("id")
    .eq("workspace_id", action.value.activeWorkspace.id)
    .eq("type", channel === "email" ? "email" : "phone")
    .eq("normalized_value", String(normalizedRecipient))
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .maybeSingle();
  if (suppression)
    return { ok: false, message: "Suppression rules blocked scheduling." };
  const { data: inboundMessage } = await client
    .from("messages")
    .select("provider_metadata,created_at")
    .eq("workspace_id", action.value.activeWorkspace.id)
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const inboundMetadata = (inboundMessage?.provider_metadata ?? {}) as Record<
    string,
    unknown
  >;
  const integrationId =
    typeof inboundMetadata.integration_id === "string"
      ? inboundMetadata.integration_id
      : null;
  if (!integrationId)
    return {
      ok: false,
      message: "The inbound provider connection is unavailable.",
    };
  const { data: integration } = await client
    .from("integrations")
    .select("id")
    .eq("id", integrationId)
    .eq("workspace_id", action.value.activeWorkspace.id)
    .eq("status", "connected")
    .eq(
      "provider",
      channel === "email" ? String(inboundMetadata.provider) : "whatsapp",
    )
    .maybeSingle();
  if (!integration)
    return {
      ok: false,
      message: "The inbound provider connection is not ready.",
    };
  const body = String(suggestion.edited_body ?? suggestion.body);
  const idempotencyKey = `inbox-schedule:${suggestionId}`;
  const { data: scheduledMessage, error } = await client
    .from("messages")
    .insert({
      workspace_id: action.value.activeWorkspace.id,
      campaign_id: conversation.campaign_id,
      lead_id: conversation.lead_id,
      conversation_id: conversationId,
      channel,
      direction: "outbound",
      body,
      approval_status: "approved",
      approved_by: action.value.user.id,
      approved_at: new Date().toISOString(),
      send_status: "scheduled",
      scheduled_at: parsedTime.data,
      provider_thread_id: conversation.external_thread_id,
      provider_metadata: {
        origin: "inbox_reply",
        integration_id: integration.id,
        thread_id: conversation.external_thread_id,
        reply_suggestion_id: suggestionId,
        session_open:
          channel === "whatsapp" &&
          Boolean(
            inboundMessage?.created_at &&
            Date.now() - new Date(inboundMessage.created_at).getTime() <
              24 * 60 * 60 * 1000,
          ),
      },
      idempotency_key: idempotencyKey,
      created_by: action.value.user.id,
    })
    .select("id")
    .single();
  if (error || !scheduledMessage)
    return { ok: false, message: "Reply could not be scheduled." };
  try {
    await inngest.send({
      name: "orliqo/send-inbox-reply.scheduled",
      data: {
        workspaceId: action.value.activeWorkspace.id,
        entityId: scheduledMessage.id,
        idempotencyKey,
        scheduledAt: parsedTime.data,
        channel,
        demo: false,
      },
    });
  } catch {
    await client
      .from("messages")
      .update({
        send_status: "cancelled",
        failure_code: "SCHEDULE_ENQUEUE_FAILED",
        failure_message: "Durable scheduling could not be started.",
      })
      .eq("id", scheduledMessage.id)
      .eq("workspace_id", action.value.activeWorkspace.id);
    return {
      ok: false,
      message: "Durable reply scheduling could not be started.",
    };
  }
  await client
    .from("reply_suggestions")
    .update({ scheduled_at: parsedTime.data })
    .eq("id", suggestionId)
    .eq("workspace_id", action.value.activeWorkspace.id);
  await audited(action, "inbox.reply.scheduled", conversationId, {
    suggestionId,
    scheduledAt: parsedTime.data,
  });
  return {
    ok: true,
    message: "Approved reply scheduled through the audited queue.",
  };
}

export async function sendApprovedReplyAction(
  conversationId: string,
  suggestionId: string,
): Promise<InboxActionResult> {
  const action = await context("message:send");
  if (!action) return { ok: false, message: "Sending is not permitted." };
  if (action.demo)
    return {
      ok: false,
      message: "Demo mode is suggestion-only. No message was sent.",
    };
  const client =
    (await createServerSupabaseClient()) as unknown as SupabaseClient;
  const { data: suggestion } = await client
    .from("reply_suggestions")
    .select(
      "id,body,edited_body,status,conversation_id,conversations(id,lead_id,channel,external_thread_id,leads(email,phone,normalized_email,normalized_phone,whatsapp_consent_status,do_not_contact),campaign_id)",
    )
    .eq("id", suggestionId)
    .eq("conversation_id", conversationId)
    .eq("workspace_id", action.value.activeWorkspace.id)
    .eq("status", "accepted")
    .maybeSingle();
  const conversation = relation(suggestion?.conversations);
  const lead = relation(conversation?.leads);
  if (!suggestion || !conversation || !lead)
    return {
      ok: false,
      message: "Only approved suggestions with a matched lead can be sent.",
    };
  if (lead.do_not_contact)
    return {
      ok: false,
      message: "Consent or suppression rules blocked this reply.",
    };
  const channel = String(conversation.channel);
  if (channel !== "email" && channel !== "whatsapp")
    return { ok: false, message: "This channel requires a manual reply." };
  if (
    (channel === "email" && !lead.email) ||
    (channel === "whatsapp" &&
      (!lead.phone || lead.whatsapp_consent_status !== "granted"))
  )
    return {
      ok: false,
      message: "A verified recipient and applicable consent are required.",
    };
  const normalizedRecipient =
    channel === "email" ? lead.normalized_email : lead.normalized_phone;
  if (!normalizedRecipient)
    return { ok: false, message: "A normalized recipient is required." };
  const { data: suppression } = await client
    .from("suppression_entries")
    .select("id")
    .eq("workspace_id", action.value.activeWorkspace.id)
    .eq("type", channel === "email" ? "email" : "phone")
    .eq("normalized_value", String(normalizedRecipient))
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .maybeSingle();
  if (suppression)
    return { ok: false, message: "Suppression rules blocked this reply." };
  const { data: inboundMessage } = await client
    .from("messages")
    .select("provider_metadata,created_at")
    .eq("workspace_id", action.value.activeWorkspace.id)
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const inboundMetadata = (inboundMessage?.provider_metadata ?? {}) as Record<
    string,
    unknown
  >;
  const integrationId =
    typeof inboundMetadata.integration_id === "string"
      ? inboundMetadata.integration_id
      : null;
  if (!integrationId)
    return {
      ok: false,
      message: "The inbound provider connection is unavailable.",
    };
  const { data: integration } = await client
    .from("integrations")
    .select("*")
    .eq("id", integrationId)
    .eq("workspace_id", action.value.activeWorkspace.id)
    .eq("status", "connected")
    .maybeSingle();
  if (!integration)
    return {
      ok: false,
      message: "The inbound provider connection is unavailable.",
    };
  const body = String(suggestion.edited_body ?? suggestion.body);
  const idempotencyKey = `inbox:${action.value.activeWorkspace.id}:${suggestionId}`;
  let providerMessageId: string;
  if (channel === "email") {
    if (!isEmailProvider(integration.provider))
      return {
        ok: false,
        message: "The inbound email provider is unavailable.",
      };
    const { data: account } = await client
      .from("email_accounts")
      .select("email_address,sender_name,signature_html,paused")
      .eq("integration_id", integration.id)
      .eq("workspace_id", action.value.activeWorkspace.id)
      .maybeSingle();
    if (!account || account.paused)
      return {
        ok: false,
        message: "The inbound email account is unavailable.",
      };
    const adapter = await configuredEmailAdapter({
      id: integration.id,
      workspaceId: integration.workspace_id,
      provider: integration.provider,
      configuration: (integration.configuration ?? {}) as Record<
        string,
        unknown
      >,
    });
    if (!adapter)
      return { ok: false, message: "Provider adapter is unavailable." };
    const result = await adapter.send({
      provider: adapter.provider,
      from: account.email_address,
      to: String(lead.email),
      subject: "Re: your reply",
      text: body,
      html: `<p>${body.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>`,
      signature: account.signature_html ?? account.sender_name,
      scheduledAt: null,
      followUpDays: null,
      threadId: String(conversation.external_thread_id ?? "") || null,
      idempotencyKey,
      trackingEnabled: false,
      bcc: [],
    });
    if (!result.ok) return { ok: false, message: result.error.message };
    providerMessageId = result.providerMessageId;
  } else {
    const sessionOpen = Boolean(
      inboundMessage?.created_at &&
      Date.now() - new Date(inboundMessage.created_at).getTime() <
        24 * 60 * 60 * 1000,
    );
    if (!sessionOpen)
      return {
        ok: false,
        message:
          "The WhatsApp service window is closed; use an approved template.",
      };
    const adapter = await configuredWhatsAppAdapter({
      id: integration.id,
      workspaceId: integration.workspace_id,
      provider: integration.provider,
      configuration: (integration.configuration ?? {}) as Record<
        string,
        unknown
      >,
    });
    if (!adapter)
      return {
        ok: false,
        message: "Official WhatsApp adapter is unavailable.",
      };
    const result = await adapter.send({
      to: String(lead.phone),
      body,
      consent: "granted",
      doNotContact: false,
      sessionOpen: true,
      templateName: null,
      templateStatus: null,
      variables: {},
      requiredVariables: [],
      idempotencyKey,
    });
    if (!result.ok || !result.providerMessageId)
      return { ok: false, message: result.error ?? "WhatsApp send failed." };
    providerMessageId = result.providerMessageId;
  }
  const { error: persistError } = await client.from("messages").insert({
    workspace_id: action.value.activeWorkspace.id,
    campaign_id: conversation.campaign_id,
    lead_id: conversation.lead_id,
    conversation_id: conversationId,
    channel,
    direction: "outbound",
    body,
    approval_status: "approved",
    approved_by: action.value.user.id,
    approved_at: new Date().toISOString(),
    send_status: "sent",
    sent_at: new Date().toISOString(),
    provider_message_id: providerMessageId,
    provider_thread_id: conversation.external_thread_id,
    provider_metadata: {
      origin: "inbox_reply",
      integration_id: integration.id,
      reply_suggestion_id: suggestionId,
    },
    idempotency_key: idempotencyKey,
    created_by: action.value.user.id,
  });
  if (persistError)
    return {
      ok: false,
      message:
        "Provider accepted the reply, but persistence requires reconciliation.",
    };
  await audited(action, "inbox.reply.sent", conversationId, {
    suggestionId,
    provider: integration.provider,
  });
  return {
    ok: true,
    message: "Approved reply sent through the configured provider adapter.",
  };
}

export async function setConversationReadFormAction(
  conversationId: string,
  unread: boolean,
  formData: FormData,
): Promise<void> {
  void formData;
  await setConversationReadAction(conversationId, unread);
}

export async function updateConversationIntentFormAction(
  conversationId: string,
  intent: InboxConversation["intent"],
  formData: FormData,
): Promise<void> {
  void formData;
  await updateConversationIntentAction(conversationId, intent);
}

export async function addConversationNoteFormAction(
  conversationId: string,
  formData: FormData,
): Promise<void> {
  await addConversationNoteAction(conversationId, formData);
}

export async function generateReplySuggestionFormAction(
  conversationId: string,
  mode: "generate" | "shorten" | "friendlier" | "translate" | "regenerate",
  formData: FormData,
): Promise<void> {
  void formData;
  await generateReplySuggestionAction(conversationId, mode);
}

export async function stopContactFormAction(
  conversationId: string,
  formData: FormData,
): Promise<void> {
  void formData;
  await stopContactAction(conversationId);
}

export async function reviewReplySuggestionFormAction(
  conversationId: string,
  suggestionId: string,
  decision: "approve" | "reject" | "edit",
  formData: FormData,
): Promise<void> {
  await reviewReplySuggestionAction(
    conversationId,
    suggestionId,
    decision,
    String(formData.get("body") ?? "") || undefined,
  );
}

export async function scheduleApprovedReplyFormAction(
  conversationId: string,
  suggestionId: string,
  formData: FormData,
): Promise<void> {
  const localTime = String(formData.get("scheduledAt") ?? "");
  const date = new Date(localTime);
  await scheduleApprovedReplyAction(
    conversationId,
    suggestionId,
    Number.isNaN(date.getTime()) ? "" : date.toISOString(),
  );
}

export async function sendApprovedReplyFormAction(
  conversationId: string,
  suggestionId: string,
  formData: FormData,
): Promise<void> {
  void formData;
  await sendApprovedReplyAction(conversationId, suggestionId);
}

export async function recordMeetingOutcomeFormAction(
  conversationId: string,
  formData: FormData,
): Promise<void> {
  const normalized = new FormData();
  normalized.set("title", String(formData.get("title") ?? ""));
  for (const field of ["startsAt", "endsAt"] as const) {
    const date = new Date(String(formData.get(field) ?? ""));
    normalized.set(
      field,
      Number.isNaN(date.getTime()) ? "" : date.toISOString(),
    );
  }
  await recordMeetingOutcomeAction(conversationId, normalized);
}
