import "server-only";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/features/audit/server";
import { addDemoActivity, demoPhase2Store } from "@/features/demo/phase2-store";
import {
  leadFingerprints,
  normalizeEmail,
  normalizePhone,
  normalizeUrl,
} from "@/features/leads/normalization";
import { calculateLeadScore } from "@/features/leads/scoring";
import {
  leadInputSchema,
  type LeadActionResult,
  type LeadInput,
} from "@/features/leads/schemas";
import type { Lead } from "@/features/leads/types";
import type { WorkspaceContext } from "@/features/workspaces/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthorizedLeadMutationContext = {
  workspaceId: string;
  userId: string;
  demo: boolean;
  workspace?: WorkspaceContext;
  revalidate?: boolean;
};

function revalidateLeadPaths(
  context: AuthorizedLeadMutationContext,
  leadId?: string,
) {
  if (context.revalidate === false) return;
  revalidatePath("/app/leads");
  if (leadId) revalidatePath(`/app/leads/${leadId}`);
}

function comparableFingerprint(lead: Lead) {
  return leadFingerprints({
    businessName: lead.businessName,
    city: lead.city,
    websiteUrl: lead.websiteUrl,
    email: lead.email,
    phone: lead.phone,
    instagramUrl: lead.instagramUrl,
    facebookUrl: lead.facebookUrl,
    linkedinUrl: lead.linkedinUrl,
  });
}

function duplicateDemo(
  leads: Lead[],
  input: LeadInput,
  excludeId?: string,
): Lead | undefined {
  const candidate = leadFingerprints(input);
  return leads.find(
    (lead) =>
      lead.id !== excludeId &&
      Object.entries(comparableFingerprint(lead)).some(
        ([key, value]) => value && value === candidate[key],
      ),
  );
}

function toDemoLead(
  input: LeadInput,
  context: AuthorizedLeadMutationContext,
  id: string = randomUUID(),
): Lead {
  const now = new Date().toISOString();
  return {
    id,
    workspaceId: context.workspaceId,
    businessName: input.businessName,
    legalName: input.legalName,
    industry: input.industry,
    category: input.category,
    description: input.description,
    country: input.country,
    city: input.city,
    address: input.address,
    websiteUrl: input.websiteUrl ? normalizeUrl(input.websiteUrl) : "",
    websiteStatus: input.websiteStatus,
    websiteConfidence: "unverified",
    email: normalizeEmail(input.email),
    emailVerification: input.email ? input.emailVerification : "missing",
    phone: normalizePhone(input.phone),
    phoneVerification: input.phone ? input.phoneVerification : "missing",
    whatsappAvailable: input.whatsappAvailable,
    whatsappConsent: input.whatsappConsent,
    instagramUrl: input.instagramUrl,
    facebookUrl: input.facebookUrl,
    linkedinUrl: input.linkedinUrl,
    reviewCount: input.reviewCount,
    averageRating: input.averageRating,
    socialActivityScore: null,
    employeeEstimate: input.employeeEstimate,
    revenueEstimate: input.revenueEstimate,
    services: input.services,
    qualificationScore: input.qualificationScore,
    qualificationReason: input.qualificationReason,
    suggestedOpportunity: input.suggestedOpportunity,
    recommendedChannel: input.recommendedChannel,
    personalizationAngle: input.personalizationAngle,
    status: input.status,
    doNotContact: input.status === "do_not_contact",
    doNotContactReason:
      input.status === "do_not_contact" ? "Marked during lead update" : "",
    assignedTo: input.assignedTo,
    assignedName: input.assignedTo ? "Assigned teammate" : "Unassigned",
    tags: input.tags,
    lastActivityAt: now,
    createdAt: now,
  };
}

function databaseLead(input: LeadInput) {
  return {
    business_name: input.businessName,
    legal_name: input.legalName || null,
    industry: input.industry || null,
    category: input.category || null,
    description: input.description || null,
    country: input.country || null,
    city: input.city || null,
    address: input.address || null,
    website_url: input.websiteUrl ? normalizeUrl(input.websiteUrl) : null,
    website_status: input.websiteStatus,
    website_status_confidence: input.websiteUrl ? "unverified" : "missing",
    email: normalizeEmail(input.email) || null,
    email_verification_status: input.email
      ? input.emailVerification
      : "missing",
    phone: normalizePhone(input.phone) || null,
    phone_verification_status: input.phone
      ? input.phoneVerification
      : "missing",
    whatsapp_available: input.whatsappAvailable,
    whatsapp_consent_status: input.whatsappConsent,
    instagram_url: input.instagramUrl || null,
    facebook_url: input.facebookUrl || null,
    linkedin_url: input.linkedinUrl || null,
    review_count: input.reviewCount,
    average_rating: input.averageRating,
    services: input.services,
    employee_estimate: input.employeeEstimate,
    revenue_estimate: input.revenueEstimate,
    qualification_score: input.qualificationScore,
    qualification_reason: input.qualificationReason || null,
    suggested_opportunity: input.suggestedOpportunity || null,
    recommended_channel: input.recommendedChannel,
    personalization_angle: input.personalizationAngle || null,
    status: input.status,
    do_not_contact: input.status === "do_not_contact",
    do_not_contact_reason:
      input.status === "do_not_contact" ? "Marked during lead update" : null,
    assigned_to: input.assignedTo || null,
  };
}

async function duplicateDatabase(
  workspaceId: string,
  input: LeadInput,
  excludeId?: string,
): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const checks: Array<
    [
      (
        | "normalized_email"
        | "normalized_phone"
        | "normalized_domain"
        | "normalized_business_city"
      ),
      string,
    ]
  > = [];
  if (input.email)
    checks.push(["normalized_email", normalizeEmail(input.email)]);
  if (input.phone)
    checks.push(["normalized_phone", normalizePhone(input.phone)]);
  if (input.websiteUrl)
    checks.push([
      "normalized_domain",
      new URL(normalizeUrl(input.websiteUrl)).hostname,
    ]);
  checks.push([
    "normalized_business_city",
    `${input.businessName} ${input.city}`
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim(),
  ]);
  for (const [field, value] of checks) {
    let query = supabase
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq(field, value);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.limit(1).maybeSingle();
    if (data) return data.id;
  }
  return null;
}

async function syncTags(
  workspaceId: string,
  userId: string,
  leadId: string,
  names: string[],
) {
  const supabase = await createServerSupabaseClient();
  await supabase
    .from("lead_tags")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId);
  for (const name of names) {
    const { data: tag } = await supabase
      .from("tags")
      .upsert(
        { workspace_id: workspaceId, name },
        { onConflict: "workspace_id,name" },
      )
      .select("id")
      .single();
    if (tag)
      await supabase.from("lead_tags").insert({
        workspace_id: workspaceId,
        lead_id: leadId,
        tag_id: tag.id,
        created_by: userId,
      });
  }
}

export async function saveLeadWithContext(
  raw: LeadInput,
  context: AuthorizedLeadMutationContext,
): Promise<LeadActionResult> {
  const parsed = leadInputSchema.safeParse(raw);
  if (!parsed.success)
    return {
      ok: false,
      message: "Check the highlighted lead fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  const input = parsed.data;
  if (context.demo) {
    const leads = demoPhase2Store().leads.get(context.workspaceId) ?? [];
    const duplicate = duplicateDemo(leads, input, input.id);
    if (duplicate && !input.duplicateOverride)
      return {
        ok: false,
        message: `Possible duplicate: ${duplicate.businessName}. Review before overriding.`,
        duplicateId: duplicate.id,
      };
    if (input.id) {
      const index = leads.findIndex((lead) => lead.id === input.id);
      if (index < 0) return { ok: false, message: "Lead not found." };
      leads[index] = {
        ...toDemoLead(input, context, input.id),
        createdAt: leads[index]!.createdAt,
      };
      addDemoActivity(input.id, "lead.edited", "Lead details updated");
    } else {
      const created = toDemoLead(input, context);
      leads.unshift(created);
      demoPhase2Store().detail.set(created.id, {
        sources: [],
        evidence: [],
        score: calculateLeadScore({
          icpMatch: false,
          locationMatch: false,
          industryMatch: false,
          websiteOpportunity: 0,
          socialActivity: null,
          reviewCount: input.reviewCount,
          hasEmail: Boolean(input.email),
          hasPhone: Boolean(input.phone),
          emailVerified: input.emailVerification === "verified",
          phoneVerified: input.phoneVerification === "verified",
          sizeFit: null,
          buyingSignal: false,
          excluded: false,
          evidenceCount: 0,
          populatedFieldCount: 8,
        }),
        notes: [],
        activities: [],
      });
      addDemoActivity(created.id, "lead.created", "Lead created manually");
      demoPhase2Store().leads.set(context.workspaceId, leads);
      revalidateLeadPaths(context);
      return { ok: true, message: "Lead created.", id: created.id };
    }
    revalidateLeadPaths(context, input.id);
    return { ok: true, message: "Lead updated.", id: input.id };
  }

  const duplicateId = await duplicateDatabase(
    context.workspaceId,
    input,
    input.id,
  );
  if (duplicateId && !input.duplicateOverride)
    return {
      ok: false,
      message:
        "A likely duplicate already exists. Review it before overriding.",
      duplicateId,
    };
  const supabase = await createServerSupabaseClient();
  let leadId = input.id;
  if (leadId) {
    const { error } = await supabase
      .from("leads")
      .update(databaseLead(input))
      .eq("workspace_id", context.workspaceId)
      .eq("id", leadId);
    if (error) return { ok: false, message: "Lead could not be updated." };
  } else {
    leadId = randomUUID();
    const { error } = await supabase.from("leads").insert({
      id: leadId,
      workspace_id: context.workspaceId,
      created_by: context.userId,
      ...databaseLead(input),
    });
    if (error)
      return {
        ok: false,
        message:
          error.code === "23505"
            ? "A duplicate lead already exists."
            : "Lead could not be created.",
      };
  }
  await Promise.all([
    syncTags(context.workspaceId, context.userId, leadId, input.tags),
    supabase.from("lead_activities").insert({
      workspace_id: context.workspaceId,
      lead_id: leadId,
      actor_type: "user",
      actor_id: context.userId,
      event_type: input.id ? "lead.edited" : "lead.created",
      summary: input.id ? "Lead details updated" : "Lead created manually",
      metadata: {},
    }),
    writeAuditLog({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      action: input.id ? "lead.updated" : "lead.created",
      entityType: "lead",
      entityId: leadId,
      after: {
        businessName: input.businessName,
        duplicateOverride: input.duplicateOverride,
      },
    }),
  ]);
  revalidateLeadPaths(context, leadId);
  return {
    ok: true,
    message: input.id ? "Lead updated." : "Lead created.",
    id: leadId,
  };
}
