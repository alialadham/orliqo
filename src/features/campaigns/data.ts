import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { readDemoSession } from "@/features/auth/demo-session";
import { campaignDetail, demoPhase3Store } from "@/features/demo/phase3-store";
import { getWorkspaceContext } from "@/features/workspaces/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  Campaign,
  CampaignDetail,
  CampaignMessage,
  MessageVersion,
  OutreachChannel,
} from "./types";

type CampaignRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  goal: string;
  audience_source: string;
  status: Campaign["status"];
  target_prospect_count: number;
  main_offer: string | null;
  main_cta: string | null;
  tone: string | null;
  language: string;
  personalization_depth: string | null;
  follow_up_count: number;
  start_at: string | null;
  sending_days: number[];
  send_window_start: string;
  send_window_end: string;
  timezone: string;
  daily_limit: number;
  monthly_limit: number | null;
  min_interval_minutes: number;
  max_interval_minutes: number;
  stop_on_reply: boolean;
  auto_replenish: boolean;
  replenish_threshold: number;
  replenish_count: number;
  replenish_minimum_score: number;
  replenish_require_approval: boolean;
  created_at: string;
  updated_at: string;
  paused_at: string | null;
  killed_at: string | null;
};

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function mapCampaign(row: CampaignRow, channels: OutreachChannel[]): Campaign {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description ?? "",
    goal: row.goal,
    audienceSource: row.audience_source,
    status: row.status,
    targetProspectCount: row.target_prospect_count,
    channels,
    mainOffer: row.main_offer ?? "",
    mainCta: row.main_cta ?? "",
    tone: row.tone ?? "professional",
    language: row.language,
    personalizationDepth: (row.personalization_depth ??
      "standard") as Campaign["personalizationDepth"],
    followUpCount: row.follow_up_count,
    startAt: row.start_at ?? row.created_at,
    sendingDays: row.sending_days,
    sendWindowStart: String(row.send_window_start).slice(0, 5),
    sendWindowEnd: String(row.send_window_end).slice(0, 5),
    timezone: row.timezone,
    dailyLimit: row.daily_limit,
    monthlyLimit: row.monthly_limit ?? row.daily_limit * 20,
    minIntervalMinutes: row.min_interval_minutes,
    maxIntervalMinutes: row.max_interval_minutes,
    stopOnReply: row.stop_on_reply,
    autoReplenish: row.auto_replenish,
    replenishThreshold: row.replenish_threshold,
    replenishCount: row.replenish_count,
    replenishMinimumScore: row.replenish_minimum_score,
    replenishRequireApproval: row.replenish_require_approval,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pausedAt: row.paused_at,
    killedAt: row.killed_at,
  };
}

export async function getCampaigns(): Promise<Campaign[]> {
  const session = await readDemoSession();
  if (session?.kind === "workspace")
    return structuredClone(
      demoPhase3Store().campaigns.get(session.activeWorkspaceId) ?? [],
    );
  const context = await getWorkspaceContext();
  if (!context) return [];
  const client = (await createServerSupabaseClient()) as unknown as SupabaseClient;
  const workspaceId = context.activeWorkspace.id;
  const [{ data: campaigns }, { data: channelRows }] = await Promise.all([
    client
      .from("campaigns")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false }),
    client
      .from("campaign_channels")
      .select("campaign_id,channel")
      .eq("workspace_id", workspaceId)
      .eq("enabled", true),
  ]);
  return ((campaigns ?? []) as CampaignRow[]).map((row) =>
    mapCampaign(
      row,
      (channelRows ?? [])
        .filter((channel) => channel.campaign_id === row.id)
        .map((channel) => channel.channel as OutreachChannel),
    ),
  );
}

export async function getCampaignDetail(
  id: string,
): Promise<CampaignDetail | null> {
  const session = await readDemoSession();
  if (session?.kind === "workspace") {
    const detail = campaignDetail(id);
    return detail?.campaign.workspaceId === session.activeWorkspaceId
      ? detail
      : null;
  }
  const context = await getWorkspaceContext();
  if (!context) return null;
  const workspaceId = context.activeWorkspace.id;
  const client = (await createServerSupabaseClient()) as unknown as SupabaseClient;
  const [{ data: campaignRow }, { data: channelRows }] = await Promise.all([
    client
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    client
      .from("campaign_channels")
      .select("channel")
      .eq("campaign_id", id)
      .eq("workspace_id", workspaceId)
      .eq("enabled", true)
      .order("priority"),
  ]);
  if (!campaignRow) return null;

  const [
    { data: messageRows },
    { data: activityRows },
    { data: usageRows },
  ] = await Promise.all([
    client
      .from("messages")
      .select("*")
      .eq("campaign_id", id)
      .eq("workspace_id", workspaceId)
      .eq("direction", "outbound")
      .order("created_at"),
    client
      .from("audit_logs")
      .select("id,action,created_at")
      .eq("workspace_id", workspaceId)
      .eq("entity_type", "campaign")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    client
      .from("usage_counters")
      .select("used,reserved,limit_value")
      .eq("workspace_id", workspaceId)
      .eq("metric", "ai_messages")
      .lte("period_start", new Date().toISOString())
      .gt("period_end", new Date().toISOString())
      .limit(1),
  ]);
  const messagesRaw = messageRows ?? [];
  const messageIds = messagesRaw.map((message) => message.id as string);
  const leadIds = [...new Set(messagesRaw.map((message) => message.lead_id as string))];
  const [
    { data: leads },
    { data: versions },
    { data: attempts },
  ] = await Promise.all([
    leadIds.length
      ? client
          .from("leads")
          .select("id,business_name")
          .eq("workspace_id", workspaceId)
          .in("id", leadIds)
      : Promise.resolve({ data: [] }),
    messageIds.length
      ? client
          .from("message_versions")
          .select("*")
          .eq("workspace_id", workspaceId)
          .in("message_id", messageIds)
          .order("version_number")
      : Promise.resolve({ data: [] }),
    messageIds.length
      ? client
          .from("message_attempts")
          .select("message_id,attempt_number,result,completed_at,started_at,error_message")
          .eq("workspace_id", workspaceId)
          .in("message_id", messageIds)
          .order("attempt_number")
      : Promise.resolve({ data: [] }),
  ]);
  const businessNames = new Map(
    (leads ?? []).map((lead) => [String(lead.id), String(lead.business_name)]),
  );
  const messages: CampaignMessage[] = messagesRaw.map((message) => {
    const providerMetadata =
      message.provider_metadata &&
      typeof message.provider_metadata === "object" &&
      !Array.isArray(message.provider_metadata)
        ? (message.provider_metadata as Record<string, unknown>)
        : {};
    const messageVersions: MessageVersion[] = (versions ?? [])
      .filter((version) => version.message_id === message.id)
      .map((version) => ({
        id: version.id,
        number: version.version_number,
        subject: version.subject,
        body: version.body,
        sourceIds: version.grounding_source_ids ?? [],
        facts: arrayOfStrings(version.personalization_facts),
        riskFlags: arrayOfStrings(version.risk_flags),
        unsupportedClaims: arrayOfStrings(version.unsupported_claims),
        model: version.generation_model ?? "unknown",
        promptVersion: version.generation_prompt_version ?? "unknown",
        createdAt: version.created_at,
      }));
    return {
      id: message.id,
      campaignId: message.campaign_id,
      leadId: message.lead_id,
      businessName: businessNames.get(message.lead_id) ?? "Lead",
      channel: message.channel as OutreachChannel,
      sequenceStep: message.sequence_step,
      subject: message.subject,
      body: message.body,
      sourceIds: message.grounding_source_ids ?? [],
      facts: arrayOfStrings(message.personalization_facts),
      confidence:
        typeof providerMetadata.confidence === "number"
          ? providerMetadata.confidence
          : 0,
      approvalStatus: message.approval_status,
      sendStatus: message.send_status,
      scheduledAt: message.scheduled_at,
      idempotencyKey: message.idempotency_key,
      versions: messageVersions,
      attempts: (attempts ?? [])
        .filter((attempt) => attempt.message_id === message.id)
        .map((attempt) => ({
          number: attempt.attempt_number,
          result: attempt.result ?? "pending",
          at: attempt.completed_at ?? attempt.started_at,
          error: attempt.error_message ?? undefined,
        })),
    };
  });
  const usage = usageRows?.[0];
  return {
    campaign: mapCampaign(
      campaignRow as CampaignRow,
      (channelRows ?? []).map((row) => row.channel as OutreachChannel),
    ),
    messages,
    activity: (activityRows ?? []).map((activity) => ({
      id: activity.id,
      summary: String(activity.action)
        .replaceAll(".", " ")
        .replaceAll("_", " "),
      createdAt: activity.created_at,
    })),
    queueHealth: {
      ready: messages.filter(
        (message) =>
          message.approvalStatus === "approved" &&
          !["cancelled", "suppressed", "failed"].includes(message.sendStatus),
      ).length,
      threshold: (campaignRow as CampaignRow).replenish_threshold,
      reserved: Number(usage?.reserved ?? 0),
      used: Number(usage?.used ?? 0),
      limit: Number(
        usage?.limit_value ??
          (campaignRow as CampaignRow).monthly_limit ??
          0,
      ),
    },
  };
}
