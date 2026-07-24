import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/features/auth/session";
import { readDemoSession } from "@/features/auth/demo-session";
import { readDemoSessionFromRequest } from "@/features/auth/demo-session";
import {
  demoPhase2Store,
  type DemoLeadImport,
} from "@/features/demo/phase2-store";
import {
  mapImportRow,
  autoMapHeaders,
  parseLeadFile,
} from "@/features/imports/lead-file";
import { saveLeadWithContext } from "@/features/leads/save";
import { leadFingerprints } from "@/features/leads/normalization";
import type { LeadInput } from "@/features/leads/schemas";
import { requirePermission } from "@/features/permissions/server";
import { hasPermission } from "@/features/permissions/permissions";
import { DEMO_WORKSPACES } from "@/features/demo/data";
import { getServerEnvironment } from "@/lib/env";
import { bodyWithinLimit, csrfErrorResponse } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/security/rate-limit";
import type { Json } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_SIZE = 10 * 1024 * 1024;
const confirmSchema = z.object({
  jobId: z.string().uuid(),
  mapping: z.record(z.string(), z.string()),
  skipInvalid: z.boolean().default(true),
});

function leadFromMapped(mapped: Record<string, string>): LeadInput {
  const number = (value?: string) => (value?.trim() ? Number(value) : null);
  return {
    businessName: mapped.businessName ?? "",
    legalName: mapped.legalName ?? "",
    industry: mapped.industry ?? "",
    category: mapped.category ?? "",
    description: mapped.description ?? "",
    country: mapped.country ?? "",
    city: mapped.city ?? "",
    address: mapped.address ?? "",
    websiteUrl: mapped.websiteUrl ?? "",
    websiteStatus: mapped.websiteStatus || "unknown",
    email: mapped.email ?? "",
    emailVerification: mapped.email ? "unverified" : "missing",
    phone: mapped.phone ?? "",
    phoneVerification: mapped.phone ? "unverified" : "missing",
    whatsappAvailable: false,
    whatsappConsent: "unknown",
    instagramUrl: mapped.instagramUrl ?? "",
    facebookUrl: mapped.facebookUrl ?? "",
    linkedinUrl: mapped.linkedinUrl ?? "",
    reviewCount: number(mapped.reviewCount),
    averageRating: number(mapped.averageRating),
    services: (mapped.services ?? "")
      .split(/[,;|]/)
      .map((item) => item.trim())
      .filter(Boolean),
    employeeEstimate: number(mapped.employeeEstimate),
    revenueEstimate: number(mapped.revenueEstimate),
    qualificationScore: number(mapped.qualificationScore) ?? 0,
    qualificationReason: "Imported without an automated qualification claim.",
    suggestedOpportunity: "",
    recommendedChannel: mapped.email
      ? "email"
      : mapped.phone
        ? "manual_call"
        : "instagram",
    personalizationAngle: "",
    status: (mapped.status || "new") as LeadInput["status"],
    assignedTo: "",
    tags: (mapped.tags ?? "")
      .split(/[,;|]/)
      .map((item) => item.trim())
      .filter(Boolean),
    duplicateOverride: false,
  };
}

async function importContext(request: Request) {
  const directSession = readDemoSessionFromRequest(request);
  if (directSession?.kind === "workspace") {
    const workspace = DEMO_WORKSPACES.find(
      (item) => item.id === directSession.activeWorkspaceId,
    );
    if (!workspace || !hasPermission(workspace.role, "lead:create"))
      return null;
    return {
      user: { id: directSession.userId },
      context: { activeWorkspace: workspace, isDemo: true },
      demo: true,
    };
  }
  const user = await getCurrentUser();
  if (!user) return null;
  const context = await requirePermission("lead:create");
  if (!context) return null;
  const session = await readDemoSession();
  return {
    user,
    context,
    demo: Boolean(session?.kind === "workspace" && context.isDemo),
  };
}

export async function POST(request: Request) {
  const csrfError = csrfErrorResponse(request, getServerEnvironment().APP_URL);
  if (csrfError) return csrfError;
  if (!bodyWithinLimit(request, MAX_SIZE + 512 * 1024))
    return NextResponse.json(
      { error: "Lead import request is too large." },
      { status: 413 },
    );
  const scope = await importContext(request);
  if (!scope)
    return NextResponse.json(
      { error: "Lead import permission required." },
      { status: 403 },
    );
  const rate = await checkRateLimit(
    `lead-import:${scope.user.id}`,
    10,
    60 * 60_000,
  );
  if (!rate.allowed)
    return NextResponse.json(
      {
        error: rate.available
          ? "Lead import rate limit reached."
          : "Request protection is temporarily unavailable.",
      },
      {
        status: rate.available ? 429 : 503,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json(
      { error: "Choose a CSV or XLSX file." },
      { status: 400 },
    );
  if (file.size < 1 || file.size > MAX_SIZE)
    return NextResponse.json(
      { error: "File must be between 1 byte and 10 MB." },
      { status: 400 },
    );
  const extension = file.name.toLowerCase().endsWith(".csv")
    ? "csv"
    : file.name.toLowerCase().endsWith(".xlsx")
      ? "xlsx"
      : null;
  if (!extension)
    return NextResponse.json(
      { error: "Only CSV and XLSX files are supported." },
      { status: 400 },
    );
  const parsed = await parseLeadFile(await file.arrayBuffer(), extension);
  if (!parsed.headers.length || !parsed.rows.length)
    return NextResponse.json(
      { error: "The file has no importable rows." },
      { status: 422 },
    );
  if (parsed.rows.length > 5_000)
    return NextResponse.json(
      { error: "Lead imports support up to 5,000 rows per file." },
      { status: 422 },
    );
  const mapping = autoMapHeaders(parsed.headers);
  const jobId = randomUUID();
  const rows: DemoLeadImport["rows"] = parsed.rows.map((raw, index) => {
    const result = mapImportRow(raw, mapping);
    return {
      rowNumber: index + 2,
      raw,
      mapped: result.mapped,
      errors: result.errors,
      suppressed: false,
    };
  });

  const existing = scope.demo
    ? (demoPhase2Store().leads.get(scope.context.activeWorkspace.id) ?? []).map(
        (lead) => ({
          id: lead.id,
          doNotContact: lead.doNotContact,
          identity: leadFingerprints({
            businessName: lead.businessName,
            city: lead.city,
            websiteUrl: lead.websiteUrl,
            email: lead.email,
            phone: lead.phone,
            instagramUrl: lead.instagramUrl,
            facebookUrl: lead.facebookUrl,
            linkedinUrl: lead.linkedinUrl,
          }),
        }),
      )
    : await (async () => {
        const supabase = await createServerSupabaseClient();
        const { data } = await supabase
          .from("leads")
          .select(
            "id, business_name, city, website_url, email, phone, instagram_url, facebook_url, linkedin_url, do_not_contact",
          )
          .eq("workspace_id", scope.context.activeWorkspace.id)
          .limit(5000);
        return (data ?? []).map((lead) => ({
          id: lead.id,
          doNotContact: lead.do_not_contact,
          identity: leadFingerprints({
            businessName: lead.business_name,
            city: lead.city ?? "",
            websiteUrl: lead.website_url ?? "",
            email: lead.email ?? "",
            phone: lead.phone ?? "",
            instagramUrl: lead.instagram_url ?? "",
            facebookUrl: lead.facebook_url ?? "",
            linkedinUrl: lead.linkedin_url ?? "",
          }),
        }));
      })();
  for (const row of rows) {
    const candidate = leadFingerprints(leadFromMapped(row.mapped));
    const duplicate = existing.find((lead) =>
      Object.entries(candidate).some(
        ([key, fingerprint]) =>
          fingerprint && fingerprint === lead.identity[key],
      ),
    );
    if (duplicate) {
      row.duplicateId = duplicate.id;
      row.suppressed = duplicate.doNotContact;
    }
  }

  if (scope.demo) {
    demoPhase2Store().leadImports.set(jobId, {
      id: jobId,
      workspaceId: scope.context.activeWorkspace.id,
      status: "ready",
      headers: parsed.headers,
      mapping,
      rows,
    });
  } else {
    const supabase = await createServerSupabaseClient();
    const path = `${scope.context.activeWorkspace.id}/imports/${jobId}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error: uploadError } = await supabase.storage
      .from("workspace-assets")
      .upload(path, file, {
        contentType:
          file.type ||
          (extension === "csv"
            ? "text/csv"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
      });
    if (uploadError)
      return NextResponse.json(
        { error: "The import file could not be stored securely." },
        { status: 422 },
      );
    const { error: jobError } = await supabase.from("import_jobs").insert({
      id: jobId,
      workspace_id: scope.context.activeWorkspace.id,
      source_type: extension,
      storage_object_path: path,
      mapping,
      status: "ready",
      total_rows: rows.length,
      valid_rows: rows.filter((row) => !row.errors.length).length,
      duplicate_rows: 0,
      imported_rows: 0,
      requested_by: scope.user.id,
      errors: rows.flatMap((row) =>
        row.errors.map((error) => ({ row: row.rowNumber, error })),
      ) as Json,
    });
    if (jobError)
      return NextResponse.json(
        { error: "Import job could not be created." },
        { status: 422 },
      );
    const { error: rowError } = await supabase.from("import_rows").insert(
      rows.map((row) => ({
        workspace_id: scope.context.activeWorkspace.id,
        import_job_id: jobId,
        row_number: row.rowNumber,
        raw_data: row.raw,
        mapped_data: row.mapped,
        normalized_data: {
          duplicateId: row.duplicateId ?? null,
          suppressed: row.suppressed,
        },
        validation_errors: row.errors,
        duplicate_lead_id: row.duplicateId ?? null,
        decision:
          row.errors.length || row.duplicateId || row.suppressed
            ? "skip"
            : "pending",
      })),
    );
    if (rowError)
      return NextResponse.json(
        { error: "Import rows could not be staged." },
        { status: 422 },
      );
  }
  return NextResponse.json({
    job: {
      id: jobId,
      headers: parsed.headers,
      mapping,
      totalRows: rows.length,
      validRows: rows.filter(
        (row) => !row.errors.length && !row.duplicateId && !row.suppressed,
      ).length,
      invalidRows: rows.filter((row) => row.errors.length).length,
      duplicateRows: rows.filter((row) => row.duplicateId).length,
      suppressedRows: rows.filter((row) => row.suppressed).length,
      preview: rows.slice(0, 8),
    },
  });
}

export async function PUT(request: Request) {
  const csrfError = csrfErrorResponse(request, getServerEnvironment().APP_URL);
  if (csrfError) return csrfError;
  if (!bodyWithinLimit(request, 64 * 1024))
    return NextResponse.json(
      { error: "Import confirmation is too large." },
      { status: 413 },
    );
  const scope = await importContext(request);
  if (!scope)
    return NextResponse.json(
      { error: "Lead import permission required." },
      { status: 403 },
    );
  const rate = await checkRateLimit(
    `lead-import-confirm:${scope.user.id}`,
    20,
    60 * 60_000,
  );
  if (!rate.allowed)
    return NextResponse.json(
      {
        error: rate.available
          ? "Lead import confirmation rate limit reached."
          : "Request protection is temporarily unavailable.",
      },
      {
        status: rate.available ? 429 : 503,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  const parsed = confirmSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Import confirmation is invalid." },
      { status: 400 },
    );
  let rows: DemoLeadImport["rows"];
  if (scope.demo) {
    const job = demoPhase2Store().leadImports.get(parsed.data.jobId);
    if (
      !job ||
      job.workspaceId !== scope.context.activeWorkspace.id ||
      job.status !== "ready"
    )
      return NextResponse.json(
        { error: "Import job was not found or already completed." },
        { status: 404 },
      );
    rows = job.rows;
  } else {
    const supabase = await createServerSupabaseClient();
    const { data: job } = await supabase
      .from("import_jobs")
      .select("id, status")
      .eq("workspace_id", scope.context.activeWorkspace.id)
      .eq("id", parsed.data.jobId)
      .single();
    if (!job || job.status !== "ready")
      return NextResponse.json(
        { error: "Import job was not found or already completed." },
        { status: 404 },
      );
    const { data } = await supabase
      .from("import_rows")
      .select("row_number, raw_data, normalized_data, duplicate_lead_id")
      .eq("workspace_id", scope.context.activeWorkspace.id)
      .eq("import_job_id", parsed.data.jobId)
      .order("row_number");
    rows = (data ?? []).map((row) => {
      const normalized =
        row.normalized_data &&
        typeof row.normalized_data === "object" &&
        !Array.isArray(row.normalized_data)
          ? row.normalized_data
          : {};
      return {
        rowNumber: row.row_number,
        raw: row.raw_data as Record<string, string>,
        mapped: {},
        errors: [],
        duplicateId: row.duplicate_lead_id ?? undefined,
        suppressed: normalized.suppressed === true,
      };
    });
    await supabase
      .from("import_jobs")
      .update({ status: "importing", mapping: parsed.data.mapping })
      .eq("id", parsed.data.jobId);
  }

  const summary = {
    imported: 0,
    updated: 0,
    skipped: 0,
    duplicate: 0,
    invalid: 0,
    suppressed: 0,
  };
  for (const row of rows) {
    const mapped = mapImportRow(row.raw, parsed.data.mapping);
    if (mapped.errors.length) {
      summary.invalid += 1;
      if (parsed.data.skipInvalid) {
        summary.skipped += 1;
        continue;
      }
    }
    if (row.suppressed) {
      summary.suppressed += 1;
      summary.skipped += 1;
      continue;
    }
    if (row.duplicateId) {
      summary.duplicate += 1;
      summary.skipped += 1;
      continue;
    }
    const result = await saveLeadWithContext(leadFromMapped(mapped.mapped), {
      workspaceId: scope.context.activeWorkspace.id,
      userId: scope.user.id,
      demo: scope.demo,
      revalidate: false,
    });
    if (result.ok) summary.imported += 1;
    else if (result.duplicateId) {
      summary.duplicate += 1;
      summary.skipped += 1;
    } else {
      summary.invalid += 1;
      summary.skipped += 1;
    }
  }
  if (scope.demo) {
    const job = demoPhase2Store().leadImports.get(parsed.data.jobId);
    if (job) {
      job.status = "completed";
      job.mapping = parsed.data.mapping;
    }
  } else {
    const supabase = await createServerSupabaseClient();
    await supabase
      .from("import_jobs")
      .update({
        status: summary.invalid || summary.duplicate ? "partial" : "completed",
        imported_rows: summary.imported,
        updated_rows: summary.updated,
        skipped_rows: summary.skipped,
        duplicate_rows: summary.duplicate,
        invalid_rows: summary.invalid,
        suppressed_rows: summary.suppressed,
      })
      .eq("workspace_id", scope.context.activeWorkspace.id)
      .eq("id", parsed.data.jobId);
  }
  return NextResponse.json({ summary });
}
