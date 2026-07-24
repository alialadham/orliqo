import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getServerEnvironment } from "@/lib/env";
import { inngest } from "../client";

function admin(): SupabaseClient {
  return createAdminSupabaseClient() as unknown as SupabaseClient;
}

export const aggregateAnalyticsFunction = inngest.createFunction(
  {
    id: "phase7-aggregate-daily-analytics",
    triggers: [{ cron: "15 1 * * *" }],
    retries: 4,
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    if (!getServerEnvironment().SUPABASE_SERVICE_ROLE_KEY)
      return { status: "not_configured" };
    const metricDate = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    const workspaces = await step.run("list-workspaces", async () => {
      const { data } = await admin().from("workspaces").select("id");
      return data ?? [];
    });
    return step.run("aggregate-workspaces", async () => {
      const client = admin();
      const results = await Promise.all(
        workspaces.map((workspace) =>
          client.schema("private").rpc("aggregate_daily_analytics", {
            target_workspace_id: workspace.id,
            target_date: metricDate,
          }),
        ),
      );
      const failed = results.filter((result) => result.error).length;
      if (failed) throw new Error(`${failed} analytics aggregations failed.`);
      return { status: "succeeded", workspaces: results.length, metricDate };
    });
  },
);

export const replenishCampaignsFunction = inngest.createFunction(
  {
    id: "phase7-replenish-campaigns",
    triggers: [{ cron: "*/30 * * * *" }],
    retries: 3,
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    if (!getServerEnvironment().SUPABASE_SERVICE_ROLE_KEY)
      return { status: "not_configured" };
    const campaigns = await step.run("eligible-campaigns", async () => {
      const { data } = await admin()
        .from("campaigns")
        .select("id,workspace_id")
        .eq("status", "running")
        .eq("auto_replenish", true)
        .limit(500);
      return data ?? [];
    });
    return step.run("bounded-replenishment", async () => {
      const client = admin();
      const results = await Promise.all(
        campaigns.map((campaign) =>
          client.schema("private").rpc("replenish_campaign_bounded", {
            target_workspace_id: campaign.workspace_id,
            target_campaign_id: campaign.id,
          }),
        ),
      );
      const failed = results.filter((result) => result.error).length;
      if (failed) throw new Error(`${failed} replenishment runs failed.`);
      return { status: "succeeded", campaigns: results.length };
    });
  },
);

export const phase7Functions = [
  aggregateAnalyticsFunction,
  replenishCampaignsFunction,
];
