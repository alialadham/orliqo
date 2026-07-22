import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAuditLog } from "@/features/audit/server";
import { readDemoSession, readDemoSessionFromRequest } from "@/features/auth/demo-session";
import { getCurrentUser } from "@/features/auth/session";
import { demoPhase2Store } from "@/features/demo/phase2-store";
import { normalizeUrl } from "@/features/leads/normalization";
import { buildWebsiteImportResult } from "@/features/onboarding/website-import";
import type { WebsiteImportResult, WebsiteSuggestion } from "@/features/onboarding/types";
import { requirePermission } from "@/features/permissions/server";
import { hasPermission } from "@/features/permissions/permissions";
import { DEMO_WORKSPACES } from "@/features/demo/data";
import { inngest } from "@/lib/inngest/client";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { assertSafePublicUrl } from "@/lib/security/ssrf";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const requestSchema = z.object({ url: z.string().trim().min(4).max(2048) });
const querySchema = z.object({ importId: z.string().uuid() });

async function authorizedWorkspace(request: Request) {
  const directSession = readDemoSessionFromRequest(request);
  if (directSession) {
    const workspace = DEMO_WORKSPACES.find((item) => item.id === directSession.activeWorkspaceId);
    if (directSession.kind === "workspace" && (!workspace || !hasPermission(workspace.role, "settings:manage"))) return null;
    return { user: { id: directSession.userId, email: directSession.email, provider: "demo" as const }, workspaceId: directSession.activeWorkspaceId, demo: true as const };
  }
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.provider === "demo") {
    const session = await readDemoSession();
    if (!session) return null;
    if (session.kind === "workspace" && !(await requirePermission("settings:manage"))) return null;
    return { user, workspaceId: session.activeWorkspaceId, demo: true as const };
  }
  const context = await requirePermission("settings:manage");
  return context ? { user, workspaceId: context.activeWorkspace.id, demo: false as const } : null;
}

export async function GET(request: Request) {
  const context = await authorizedWorkspace(request);
  if (!context) return NextResponse.json({ error: "Authentication or permission required." }, { status: 403 });
  const parsed = querySchema.safeParse({ importId: new URL(request.url).searchParams.get("importId") });
  if (!parsed.success) return NextResponse.json({ error: "A valid import ID is required." }, { status: 400 });

  if (context.demo) {
    const result = (demoPhase2Store().imports.get(context.workspaceId) ?? []).find((item) => item.id === parsed.data.importId);
    return result ? NextResponse.json({ status: "succeeded", result }) : NextResponse.json({ error: "Website import was not found." }, { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: websiteImport, error } = await supabase.from("website_imports").select("*").eq("id", parsed.data.importId).eq("workspace_id", context.workspaceId).single();
  if (error || !websiteImport) return NextResponse.json({ error: "Website import was not found." }, { status: 404 });
  if (websiteImport.status === "failed") return NextResponse.json({ status: "failed", error: websiteImport.error_message || "Website import failed safely." });
  if (websiteImport.status !== "succeeded" && websiteImport.status !== "partial") return NextResponse.json({ status: websiteImport.status });

  const { data: rows, error: suggestionsError } = await supabase.from("website_import_suggestions").select("*").eq("website_import_id", websiteImport.id).eq("workspace_id", context.workspaceId).eq("decision", "pending").order("created_at");
  if (suggestionsError) return NextResponse.json({ error: "Website suggestions could not be loaded." }, { status: 500 });
  const suggestions: WebsiteSuggestion[] = (rows ?? []).map((row) => ({
    id: row.id,
    field: row.field_name as WebsiteSuggestion["field"],
    value: row.suggested_value as string | string[],
    sourceUrl: row.source_url,
    retrievedAt: row.retrieved_at,
    confidence: row.confidence as WebsiteSuggestion["confidence"],
    decision: row.decision as WebsiteSuggestion["decision"],
  }));
  const result: WebsiteImportResult = {
    id: websiteImport.id,
    normalizedUrl: websiteImport.normalized_url,
    provider: websiteImport.provider,
    model: websiteImport.model,
    promptVersion: websiteImport.prompt_version,
    suggestions,
  };
  return NextResponse.json({ status: websiteImport.status, result });
}

export async function POST(request: Request) {
  const context = await authorizedWorkspace(request);
  if (!context) return NextResponse.json({ error: "Authentication or permission required." }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid public website URL." }, { status: 400 });
  const rate = checkRateLimit(`website-import:${context.user.id}`, 5, 15 * 60_000);
  if (!rate.allowed) return NextResponse.json({ error: `Try again in ${rate.retryAfterSeconds} seconds.` }, { status: 429 });

  const importId = crypto.randomUUID();
  if (context.demo) {
    const page = {
      url: normalizeUrl(parsed.data.url),
      text: "Orliqo Demo provides professional services for small businesses through structured consultation and project delivery.",
      retrievedAt: new Date().toISOString(),
    };
    const { result } = await buildWebsiteImportResult({ importId, sourceUrl: page.url, content: page.text, retrievedAt: page.retrievedAt });
    const imports = demoPhase2Store().imports.get(context.workspaceId) ?? [];
    imports.unshift(result);
    demoPhase2Store().imports.set(context.workspaceId, imports);
    return NextResponse.json({ status: "succeeded", result, demo: true });
  }

  try {
    const normalizedUrl = (await assertSafePublicUrl(parsed.data.url)).toString();
    const supabase = await createServerSupabaseClient();
    const { data: profile, error: profileError } = await supabase.from("business_profiles").select("id").eq("workspace_id", context.workspaceId).single();
    if (profileError || !profile) throw new Error("Business profile was not found.");

    const admin = createAdminSupabaseClient();
    const jobRunId = crypto.randomUUID();
    const { error: jobError } = await admin.from("job_runs").insert({
      id: jobRunId,
      workspace_id: context.workspaceId,
      inngest_function_id: "phase2-import-website",
      job_type: "website_import",
      entity_type: "website_import",
      entity_id: importId,
      status: "pending",
      idempotency_key: `website-import:${importId}`,
      scheduled_at: new Date().toISOString(),
      progress: { stage: "queued" },
    });
    if (jobError) throw new Error("Website import job could not be created.");

    const { error: importError } = await admin.from("website_imports").insert({
      id: importId,
      workspace_id: context.workspaceId,
      business_profile_id: profile.id,
      requested_url: parsed.data.url,
      normalized_url: normalizedUrl,
      status: "pending",
      job_run_id: jobRunId,
      requested_by: context.user.id,
    });
    if (importError) {
      await admin.from("job_runs").update({ status: "failed", completed_at: new Date().toISOString(), error_code: "IMPORT_RECORD_FAILED" }).eq("id", jobRunId);
      throw new Error("Website import history could not be stored.");
    }

    try {
      const event = await inngest.send({
        id: importId,
        name: "orliqo/website.import.requested",
        data: { importId, jobRunId, workspaceId: context.workspaceId, requestedBy: context.user.id, requestedUrl: normalizedUrl },
      });
      await admin.from("job_runs").update({ inngest_event_id: event.ids[0] ?? importId }).eq("id", jobRunId).eq("workspace_id", context.workspaceId);
    } catch {
      const failedAt = new Date().toISOString();
      await Promise.all([
        admin.from("website_imports").update({ status: "failed", completed_at: failedAt, error_code: "QUEUE_UNAVAILABLE", error_message: "The background job could not be queued." }).eq("id", importId),
        admin.from("job_runs").update({ status: "failed", completed_at: failedAt, error_code: "QUEUE_UNAVAILABLE", error_message: "The background job could not be queued." }).eq("id", jobRunId),
      ]);
      return NextResponse.json({ error: "Website import is temporarily unavailable." }, { status: 503 });
    }

    await writeAuditLog({ workspaceId: context.workspaceId, actorId: context.user.id, action: "website_import.queued", entityType: "website_import", entityId: importId, after: { normalizedUrl } });
    return NextResponse.json({ status: "pending", importId }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Website import failed safely.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
