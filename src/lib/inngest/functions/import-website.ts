import "server-only";

import { buildWebsiteImportResult } from "@/features/onboarding/website-import";
import { fetchPublicWebsite } from "@/lib/security/ssrf";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

import { inngest, websiteImportRequestedSchema, type WebsiteImportRequested } from "../client";

function publicFailureMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Website import failed safely.";
  return message.slice(0, 500);
}

async function markFailed(data: WebsiteImportRequested, error: unknown) {
  const admin = createAdminSupabaseClient();
  const completedAt = new Date().toISOString();
  const message = publicFailureMessage(error);
  await Promise.all([
    admin.from("website_imports").update({ status: "failed", completed_at: completedAt, error_code: "WEBSITE_IMPORT_FAILED", error_message: message }).eq("id", data.importId).eq("workspace_id", data.workspaceId),
    admin.from("job_runs").update({ status: "failed", completed_at: completedAt, error_code: "WEBSITE_IMPORT_FAILED", error_message: message }).eq("id", data.jobRunId).eq("workspace_id", data.workspaceId),
  ]);
}

export const importWebsiteFunction = inngest.createFunction(
  {
    id: "phase2-import-website",
    triggers: [{ event: "orliqo/website.import.requested" }],
    retries: 3,
    concurrency: [{ limit: 2, key: "event.data.workspaceId" }],
    onFailure: async ({ event, error }) => {
      const data = websiteImportRequestedSchema.safeParse(event.data.event.data);
      if (data.success) await markFailed(data.data, error);
    },
  },
  async ({ event, step }) => {
    const data = websiteImportRequestedSchema.parse(event.data);
    const admin = createAdminSupabaseClient();

    await step.run("mark-running", async () => {
      const startedAt = new Date().toISOString();
      const [websiteUpdate, jobUpdate] = await Promise.all([
        admin.from("website_imports").update({ status: "running", started_at: startedAt, error_code: null, error_message: null }).eq("id", data.importId).eq("workspace_id", data.workspaceId),
        admin.from("job_runs").update({ status: "running", started_at: startedAt, attempt: 1, progress: { stage: "fetching" } }).eq("id", data.jobRunId).eq("workspace_id", data.workspaceId),
      ]);
      if (websiteUpdate.error || jobUpdate.error) throw new Error("Website import state could not be updated.");
    });

    const page = await step.run("fetch-public-website", () => fetchPublicWebsite(data.requestedUrl));
    const extraction = await step.run("extract-grounded-business-context", () => buildWebsiteImportResult({
      importId: data.importId,
      sourceUrl: page.url,
      content: page.text,
      retrievedAt: page.retrievedAt,
    }));

    await step.run("persist-reviewed-suggestions", async () => {
      const completedAt = new Date().toISOString();
      if (extraction.result.suggestions.length) {
        const { error } = await admin.from("website_import_suggestions").upsert(extraction.result.suggestions.map((suggestion) => ({
          id: suggestion.id,
          workspace_id: data.workspaceId,
          website_import_id: data.importId,
          field_name: suggestion.field,
          suggested_value: suggestion.value,
          source_url: suggestion.sourceUrl,
          citation_text: "Extracted from the cited public page; review before accepting.",
          confidence: suggestion.confidence,
          decision: "pending",
          retrieved_at: suggestion.retrievedAt,
          provider: extraction.result.provider,
          model: extraction.result.model,
          prompt_version: extraction.result.promptVersion,
        })));
        if (error) throw new Error("Website suggestions could not be stored.");
      }

      const [websiteUpdate, jobUpdate, auditInsert] = await Promise.all([
        admin.from("website_imports").update({
          normalized_url: extraction.result.normalizedUrl,
          status: "succeeded",
          completed_at: completedAt,
          provider: extraction.result.provider,
          model: extraction.result.model,
          prompt_version: extraction.result.promptVersion,
          usage_metadata: extraction.usage,
          source_retrieved_at: page.retrievedAt,
        }).eq("id", data.importId).eq("workspace_id", data.workspaceId),
        admin.from("job_runs").update({ status: "succeeded", completed_at: completedAt, progress: { stage: "completed", suggestions: extraction.result.suggestions.length } }).eq("id", data.jobRunId).eq("workspace_id", data.workspaceId),
        admin.from("audit_logs").insert({
          workspace_id: data.workspaceId,
          actor_id: data.requestedBy,
          actor_type: "user",
          action: "website_import.completed",
          entity_type: "website_import",
          entity_id: data.importId,
          before_state: {},
          after_state: { provider: extraction.result.provider, suggestionCount: extraction.result.suggestions.length },
        }),
      ]);
      if (websiteUpdate.error || jobUpdate.error || auditInsert.error) throw new Error("Website import results could not be finalized.");
    });

    return { importId: data.importId, suggestions: extraction.result.suggestions.length };
  },
);
