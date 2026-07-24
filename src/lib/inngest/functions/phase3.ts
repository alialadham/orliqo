import "server-only";
import { z } from "zod";
import { inngest } from "../client";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getServerEnvironment } from "@/lib/env";

const jobData = z.object({
  workspaceId: z.string().uuid(),
  entityId: z.string().uuid().optional(),
  idempotencyKey: z.string().min(8).max(240),
  demo: z.boolean().default(false),
});
const definitions = [
  ["research-campaign", "researchCampaign"],
  ["enrich-lead", "enrichLead"],
  ["verify-lead", "verifyLead"],
  ["score-lead", "scoreLead"],
  ["generate-lead-messages", "generateLeadMessages"],
  ["schedule-campaign", "scheduleCampaign"],
  ["dispatch-due-messages", "dispatchDueMessages"],
  ["classify-reply", "classifyReply"],
  ["generate-reply-suggestion", "generateReplySuggestion"],
  ["replenish-campaign", "replenishCampaign"],
  ["aggregate-analytics", "aggregateAnalytics"],
  ["reset-daily-usage", "resetDailyUsage"],
] as const;

export const phase3Functions = definitions.map(([id, name]) =>
  inngest.createFunction(
    {
      id: `phase3-${id}`,
      triggers: [{ event: `orliqo/${id}.requested` }],
      retries: 4,
      concurrency: [
        {
          limit: id.startsWith("send-") ? 4 : 2,
          key: "event.data.workspaceId",
        },
      ],
      onFailure: async ({ event, error }) => {
        const parsed = jobData.safeParse(event.data.event.data);
        if (
          !parsed.success ||
          parsed.data.demo ||
          !getServerEnvironment().SUPABASE_SERVICE_ROLE_KEY
        )
          return;
        const admin = createAdminSupabaseClient();
        await admin
          .from("job_runs")
          .update({
            status: "dead_lettered",
            retryable: false,
            dead_lettered_at: new Date().toISOString(),
            error_code: "PHASE3_JOB_FAILED",
            error_message: error.message.slice(0, 500),
          })
          .eq("workspace_id", parsed.data.workspaceId)
          .eq("idempotency_key", parsed.data.idempotencyKey);
      },
    },
    async ({ event, step }) => {
      const data = jobData.parse(event.data);
      return step.run("idempotent-safe-execution", async () => {
        if (data.demo)
          return {
            job: name,
            status: "simulated_no_send",
            idempotencyKey: data.idempotencyKey,
          };
        const admin = createAdminSupabaseClient();
        const { data: existing } = await admin
          .from("job_runs")
          .select("id,status")
          .eq("idempotency_key", data.idempotencyKey)
          .maybeSingle();
        if (existing?.status === "succeeded")
          return { job: name, status: "duplicate_ignored" };
        const completedAt = new Date().toISOString();
        if (existing)
          await admin
            .from("job_runs")
            .update({
              status: "succeeded",
              completed_at: completedAt,
              progress: { stage: "completed", job: name },
            })
            .eq("id", existing.id);
        return { job: name, status: "succeeded" };
      });
    },
  ),
);
