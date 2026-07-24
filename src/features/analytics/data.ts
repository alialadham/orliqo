import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getWorkspaceContext } from "@/features/workspaces/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { analyticsSummary } from "./calculations";
import { demoAnalyticsRows } from "./demo";
import type { AnalyticsRow } from "./types";

function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

type DailyAnalyticsRecord = {
  metric_date: string;
  campaign_id: string | null;
  channel: AnalyticsRow["channel"] | null;
  industry: string | null;
  country: string | null;
  template: string | null;
  cta: string | null;
  send_hour: number | null;
  follow_up_step: number;
  discovered: number;
  qualified: number;
  approved: number;
  contacted: number;
  sent: number;
  delivered: number;
  opened: number;
  read: number;
  replied: number;
  positive: number;
  meetings: number;
  conversions: number;
  cost: number | string;
  revenue: number | string;
  campaigns: { name?: string } | null;
};

function mapRecord(record: DailyAnalyticsRecord): AnalyticsRow {
  return {
    date: record.metric_date,
    campaignId: record.campaign_id,
    campaignName: record.campaigns?.name ?? "Workspace total",
    channel: record.channel ?? "all",
    industry: record.industry ?? "Unattributed",
    country: record.country ?? "Unattributed",
    template: record.template ?? "Unattributed",
    cta: record.cta ?? "Unattributed",
    sendHour: record.send_hour,
    followUpStep: record.follow_up_step,
    discovered: record.discovered,
    qualified: record.qualified,
    approved: record.approved,
    contacted: record.contacted,
    sent: record.sent,
    delivered: record.delivered,
    opened: record.opened,
    read: record.read,
    replied: record.replied,
    positive: record.positive,
    meetings: record.meetings,
    conversions: record.conversions,
    cost: Number(record.cost),
    revenue: Number(record.revenue),
  };
}

export async function getAnalyticsSummary(rangeDays: 7 | 30 | 90) {
  const context = await getWorkspaceContext();
  if (!context) return null;
  const currentStart = dateOffset(-(rangeDays - 1));
  const previousStart = dateOffset(-(rangeDays * 2 - 1));
  if (context.isDemo)
    return {
      context,
      rangeDays,
      summary: analyticsSummary(
        demoAnalyticsRows(context.activeWorkspace.id),
        currentStart,
        previousStart,
      ),
    };

  const client =
    (await createServerSupabaseClient()) as unknown as SupabaseClient;
  const { data } = await client
    .from("daily_analytics")
    .select("*,campaigns(name)")
    .eq("workspace_id", context.activeWorkspace.id)
    .gte("metric_date", previousStart)
    .order("metric_date", { ascending: true });
  const rows = ((data ?? []) as DailyAnalyticsRecord[]).map(mapRecord);
  return {
    context,
    rangeDays,
    summary: analyticsSummary(rows, currentStart, previousStart),
  };
}
