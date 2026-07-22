"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/features/audit/server";
import { readDemoSession } from "@/features/auth/demo-session";
import { addDemoActivity, demoPhase2Store } from "@/features/demo/phase2-store";
import { leadFingerprints, normalizeEmail, normalizePhone, normalizeUrl } from "@/features/leads/normalization";
import { calculateLeadScore } from "@/features/leads/scoring";
import { leadInputSchema, type LeadActionResult, type LeadInput } from "@/features/leads/schemas";
import type { Lead } from "@/features/leads/types";
import { requirePermission } from "@/features/permissions/server";
import type { WorkspaceContext } from "@/features/workspaces/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type MutationContext = { workspaceId: string; userId: string; demo: boolean; workspace?: WorkspaceContext };

async function mutationContext(permission: "lead:create" | "lead:update" | "lead:delete" | "lead:export"): Promise<MutationContext | null> {
  const session = await readDemoSession();
  if (session?.kind === "workspace") {
    const context = await requirePermission(permission);
    return context ? { workspaceId: context.activeWorkspace.id, userId: context.user.id, demo: true, workspace: context } : null;
  }
  const context = await requirePermission(permission);
  return context ? { workspaceId: context.activeWorkspace.id, userId: context.user.id, demo: false, workspace: context } : null;
}

function parsedFailure(error: { flatten(): { fieldErrors: Record<string, string[]> } }): LeadActionResult {
  return { ok: false, message: "Check the highlighted lead fields.", fieldErrors: error.flatten().fieldErrors };
}

function comparableFingerprint(lead: Lead) {
  return leadFingerprints({ businessName: lead.businessName, city: lead.city, websiteUrl: lead.websiteUrl, email: lead.email, phone: lead.phone, instagramUrl: lead.instagramUrl, facebookUrl: lead.facebookUrl, linkedinUrl: lead.linkedinUrl });
}

function duplicateDemo(leads: Lead[], input: LeadInput, excludeId?: string): Lead | undefined {
  const candidate = leadFingerprints(input);
  return leads.find((lead) => lead.id !== excludeId && Object.entries(comparableFingerprint(lead)).some(([key, value]) => value && value === candidate[key]));
}

function toDemoLead(input: LeadInput, context: MutationContext, id: string = randomUUID()): Lead {
  const now = new Date().toISOString();
  return {
    id, workspaceId: context.workspaceId, businessName: input.businessName, legalName: input.legalName, industry: input.industry,
    category: input.category, description: input.description, country: input.country, city: input.city, address: input.address,
    websiteUrl: input.websiteUrl ? normalizeUrl(input.websiteUrl) : "", websiteStatus: input.websiteStatus, websiteConfidence: "unverified",
    email: normalizeEmail(input.email), emailVerification: input.email ? input.emailVerification : "missing", phone: normalizePhone(input.phone),
    phoneVerification: input.phone ? input.phoneVerification : "missing", whatsappAvailable: input.whatsappAvailable,
    whatsappConsent: input.whatsappConsent, instagramUrl: input.instagramUrl, facebookUrl: input.facebookUrl, linkedinUrl: input.linkedinUrl,
    reviewCount: input.reviewCount, averageRating: input.averageRating, socialActivityScore: null, employeeEstimate: input.employeeEstimate,
    revenueEstimate: input.revenueEstimate, services: input.services, qualificationScore: input.qualificationScore,
    qualificationReason: input.qualificationReason, suggestedOpportunity: input.suggestedOpportunity, recommendedChannel: input.recommendedChannel,
    personalizationAngle: input.personalizationAngle, status: input.status, doNotContact: input.status === "do_not_contact",
    doNotContactReason: input.status === "do_not_contact" ? "Marked during lead update" : "", assignedTo: input.assignedTo,
    assignedName: input.assignedTo ? "Assigned teammate" : "Unassigned", tags: input.tags, lastActivityAt: now, createdAt: now,
  };
}

function databaseLead(input: LeadInput) {
  return {
    business_name: input.businessName, legal_name: input.legalName || null, industry: input.industry || null, category: input.category || null,
    description: input.description || null, country: input.country || null, city: input.city || null, address: input.address || null,
    website_url: input.websiteUrl ? normalizeUrl(input.websiteUrl) : null, website_status: input.websiteStatus,
    website_status_confidence: input.websiteUrl ? "unverified" : "missing", email: normalizeEmail(input.email) || null,
    email_verification_status: input.email ? input.emailVerification : "missing", phone: normalizePhone(input.phone) || null,
    phone_verification_status: input.phone ? input.phoneVerification : "missing", whatsapp_available: input.whatsappAvailable,
    whatsapp_consent_status: input.whatsappConsent, instagram_url: input.instagramUrl || null, facebook_url: input.facebookUrl || null,
    linkedin_url: input.linkedinUrl || null, review_count: input.reviewCount, average_rating: input.averageRating, services: input.services,
    employee_estimate: input.employeeEstimate, revenue_estimate: input.revenueEstimate, qualification_score: input.qualificationScore,
    qualification_reason: input.qualificationReason || null, suggested_opportunity: input.suggestedOpportunity || null,
    recommended_channel: input.recommendedChannel, personalization_angle: input.personalizationAngle || null, status: input.status,
    do_not_contact: input.status === "do_not_contact", do_not_contact_reason: input.status === "do_not_contact" ? "Marked during lead update" : null,
    assigned_to: input.assignedTo || null,
  };
}

async function duplicateDatabase(workspaceId: string, input: LeadInput, excludeId?: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const checks: Array<["normalized_email" | "normalized_phone" | "normalized_domain" | "normalized_business_city", string]> = [];
  const identity = leadFingerprints(input);
  if (input.email) checks.push(["normalized_email", normalizeEmail(input.email)]);
  if (input.phone) checks.push(["normalized_phone", normalizePhone(input.phone)]);
  if (input.websiteUrl) checks.push(["normalized_domain", new URL(normalizeUrl(input.websiteUrl)).hostname]);
  checks.push(["normalized_business_city", `${input.businessName} ${input.city}`.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()]);
  void identity;
  for (const [field, value] of checks) {
    let query = supabase.from("leads").select("id").eq("workspace_id", workspaceId).eq(field, value);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.limit(1).maybeSingle();
    if (data) return data.id;
  }
  return null;
}

async function syncTags(workspaceId: string, userId: string, leadId: string, names: string[]) {
  const supabase = await createServerSupabaseClient();
  await supabase.from("lead_tags").delete().eq("workspace_id", workspaceId).eq("lead_id", leadId);
  for (const name of names) {
    const { data: tag } = await supabase.from("tags").upsert({ workspace_id: workspaceId, name }, { onConflict: "workspace_id,name" }).select("id").single();
    if (tag) await supabase.from("lead_tags").insert({ workspace_id: workspaceId, lead_id: leadId, tag_id: tag.id, created_by: userId });
  }
}

async function addTag(workspaceId: string, userId: string, leadIds: string[], name: string) {
  const supabase = await createServerSupabaseClient();
  const { data: tag } = await supabase.from("tags").upsert({ workspace_id: workspaceId, name }, { onConflict: "workspace_id,name" }).select("id").single();
  if (!tag) return;
  await supabase.from("lead_tags").upsert(
    leadIds.map((leadId) => ({ workspace_id: workspaceId, lead_id: leadId, tag_id: tag.id, created_by: userId })),
    { onConflict: "lead_id,tag_id", ignoreDuplicates: true },
  );
}

export async function saveLeadAction(raw: LeadInput): Promise<LeadActionResult> {
  const parsed = leadInputSchema.safeParse(raw);
  if (!parsed.success) return parsedFailure(parsed.error);
  const input = parsed.data;
  const context = await mutationContext(input.id ? "lead:update" : "lead:create");
  if (!context) return { ok: false, message: "You do not have permission to save leads." };
  if (context.demo) {
    const leads = demoPhase2Store().leads.get(context.workspaceId) ?? [];
    const duplicate = duplicateDemo(leads, input, input.id);
    if (duplicate && !input.duplicateOverride) return { ok: false, message: `Possible duplicate: ${duplicate.businessName}. Review before overriding.`, duplicateId: duplicate.id };
    if (input.id) {
      const index = leads.findIndex((lead) => lead.id === input.id);
      if (index < 0) return { ok: false, message: "Lead not found." };
      const updated = { ...toDemoLead(input, context, input.id), createdAt: leads[index]!.createdAt };
      leads[index] = updated; addDemoActivity(input.id, "lead.edited", "Lead details updated");
    } else {
      const created = toDemoLead(input, context); leads.unshift(created); demoPhase2Store().detail.set(created.id, { sources: [], evidence: [], score: calculateLeadScore({ icpMatch: false, locationMatch: false, industryMatch: false, websiteOpportunity: 0, socialActivity: null, reviewCount: input.reviewCount, hasEmail: Boolean(input.email), hasPhone: Boolean(input.phone), emailVerified: input.emailVerification === "verified", phoneVerified: input.phoneVerification === "verified", sizeFit: null, buyingSignal: false, excluded: false, evidenceCount: 0, populatedFieldCount: 8 }), notes: [], activities: [] }); addDemoActivity(created.id, "lead.created", "Lead created manually");
      demoPhase2Store().leads.set(context.workspaceId, leads); revalidatePath("/app/leads"); return { ok: true, message: "Lead created.", id: created.id };
    }
    revalidatePath("/app/leads"); revalidatePath(`/app/leads/${input.id}`); return { ok: true, message: "Lead updated.", id: input.id };
  }

  const duplicateId = await duplicateDatabase(context.workspaceId, input, input.id);
  if (duplicateId && !input.duplicateOverride) return { ok: false, message: "A likely duplicate already exists. Review it before overriding.", duplicateId };
  const supabase = await createServerSupabaseClient();
  let leadId = input.id;
  if (leadId) {
    const { error } = await supabase.from("leads").update(databaseLead(input)).eq("workspace_id", context.workspaceId).eq("id", leadId);
    if (error) return { ok: false, message: "Lead could not be updated." };
  } else {
    leadId = randomUUID();
    const { error } = await supabase.from("leads").insert({ id: leadId, workspace_id: context.workspaceId, created_by: context.userId, ...databaseLead(input) });
    if (error) return { ok: false, message: error.code === "23505" ? "A duplicate lead already exists." : "Lead could not be created." };
  }
  await Promise.all([
    syncTags(context.workspaceId, context.userId, leadId, input.tags),
    supabase.from("lead_activities").insert({ workspace_id: context.workspaceId, lead_id: leadId, actor_type: "user", actor_id: context.userId, event_type: input.id ? "lead.edited" : "lead.created", summary: input.id ? "Lead details updated" : "Lead created manually", metadata: {} }),
    writeAuditLog({ workspaceId: context.workspaceId, actorId: context.userId, action: input.id ? "lead.updated" : "lead.created", entityType: "lead", entityId: leadId, after: { businessName: input.businessName, duplicateOverride: input.duplicateOverride } }),
  ]);
  revalidatePath("/app/leads"); revalidatePath(`/app/leads/${leadId}`);
  return { ok: true, message: input.id ? "Lead updated." : "Lead created.", id: leadId };
}

export async function addLeadNoteAction(leadId: string, content: string): Promise<LeadActionResult> {
  const value = content.trim();
  if (!value || value.length > 10_000) return { ok: false, message: "Note must contain 1–10,000 characters." };
  const context = await mutationContext("lead:update");
  if (!context) return { ok: false, message: "You do not have permission to add notes." };
  if (context.demo) {
    const detail = demoPhase2Store().detail.get(leadId); if (!detail) return { ok: false, message: "Lead not found." };
    const now = new Date().toISOString(); detail.notes.unshift({ id: randomUUID(), authorId: context.userId, authorName: context.workspace?.user.fullName ?? "Demo user", content: value, pinned: false, createdAt: now, updatedAt: now }); addDemoActivity(leadId, "note.added", "Note added");
  } else {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("lead_notes").insert({ workspace_id: context.workspaceId, lead_id: leadId, author_id: context.userId, content: value, pinned: false, mentioned_user_ids: [] });
    if (error) return { ok: false, message: "Note could not be added." };
    await supabase.from("lead_activities").insert({ workspace_id: context.workspaceId, lead_id: leadId, actor_type: "user", actor_id: context.userId, event_type: "note.added", summary: "Note added", metadata: {} });
  }
  revalidatePath(`/app/leads/${leadId}`); return { ok: true, message: "Note added." };
}

export async function updateLeadNoteAction(leadId: string, noteId: string, operation: "pin" | "delete" | "edit", content?: string): Promise<LeadActionResult> {
  if (operation === "edit" && (!content?.trim() || content.trim().length > 10_000)) return { ok: false, message: "Note must contain 1–10,000 characters." };
  const context = await mutationContext("lead:update");
  if (!context) return { ok: false, message: "You do not have permission to update notes." };
  if (context.demo) {
    const detail = demoPhase2Store().detail.get(leadId); const note = detail?.notes.find((item) => item.id === noteId);
    if (!detail || !note) return { ok: false, message: "Note not found." };
    if (operation === "delete") detail.notes = detail.notes.filter((item) => item.id !== noteId);
    if (operation === "pin") note.pinned = !note.pinned;
    if (operation === "edit") { if (!content?.trim()) return { ok: false, message: "Note cannot be empty." }; note.content = content.trim(); note.updatedAt = new Date().toISOString(); }
  } else {
    const supabase = await createServerSupabaseClient();
    let nextPinned = true;
    if (operation === "pin") {
      const { data: current } = await supabase.from("lead_notes").select("pinned").eq("workspace_id", context.workspaceId).eq("lead_id", leadId).eq("id", noteId).single();
      nextPinned = !current?.pinned;
    }
    const mutation = operation === "delete" ? { deleted_at: new Date().toISOString() } : operation === "pin" ? { pinned: nextPinned } : { content: content?.trim() ?? "" };
    const { error } = await supabase.from("lead_notes").update(mutation).eq("workspace_id", context.workspaceId).eq("lead_id", leadId).eq("id", noteId);
    if (error) return { ok: false, message: "Note could not be updated. Only the author or an administrator may change it." };
  }
  revalidatePath(`/app/leads/${leadId}`); return { ok: true, message: operation === "delete" ? "Note deleted." : "Note updated." };
}

export async function verifyEvidenceAction(leadId: string, evidenceId: string): Promise<LeadActionResult> {
  const context = await mutationContext("lead:update"); if (!context) return { ok: false, message: "You do not have permission to verify evidence." };
  const now = new Date().toISOString();
  if (context.demo) {
    const evidence = demoPhase2Store().detail.get(leadId)?.evidence.find((item) => item.id === evidenceId); if (!evidence || !evidence.sourceId) return { ok: false, message: "A stored source is required before verification." };
    evidence.confidence = "verified"; evidence.verifiedAt = now; evidence.verificationMethod = "manual workspace review"; addDemoActivity(leadId, "field.verified", `${evidence.fieldName} manually verified`);
  } else {
    const supabase = await createServerSupabaseClient();
    const { data: evidence } = await supabase.from("lead_field_evidence").select("source_id, field_name").eq("workspace_id", context.workspaceId).eq("lead_id", leadId).eq("id", evidenceId).single();
    if (!evidence?.source_id) return { ok: false, message: "A stored source is required before verification." };
    const { error } = await supabase.from("lead_field_evidence").update({ confidence: "verified", verified_at: now, verification_method: "manual workspace review" }).eq("workspace_id", context.workspaceId).eq("id", evidenceId);
    if (error) return { ok: false, message: "Evidence could not be verified." };
    await writeAuditLog({ workspaceId: context.workspaceId, actorId: context.userId, action: "lead_field.verified", entityType: "lead", entityId: leadId, after: { evidenceId, fieldName: evidence.field_name } });
  }
  revalidatePath(`/app/leads/${leadId}`); return { ok: true, message: "Field marked verified with its stored source." };
}

export async function recalculateLeadAction(leadId: string): Promise<LeadActionResult> {
  const context = await mutationContext("lead:update"); if (!context) return { ok: false, message: "You do not have permission to recalculate scores." };
  if (context.demo) {
    const lead = demoPhase2Store().leads.get(context.workspaceId)?.find((item) => item.id === leadId); const detail = demoPhase2Store().detail.get(leadId);
    if (!lead || !detail) return { ok: false, message: "Lead not found." };
    detail.score = calculateLeadScore({ icpMatch: true, locationMatch: true, industryMatch: true, websiteOpportunity: lead.websiteStatus === "unknown" ? 2 : 10, socialActivity: lead.socialActivityScore, reviewCount: lead.reviewCount, hasEmail: Boolean(lead.email), hasPhone: Boolean(lead.phone), emailVerified: lead.emailVerification === "verified", phoneVerified: lead.phoneVerification === "verified", sizeFit: lead.employeeEstimate === null ? null : true, buyingSignal: lead.status === "interested", excluded: lead.status === "disqualified", evidenceCount: detail.evidence.length, populatedFieldCount: 15 });
    lead.qualificationScore = detail.score.total; lead.qualificationReason = detail.score.explanation; addDemoActivity(leadId, "lead.scored", `Score recalculated: ${detail.score.total}`);
  } else {
    const supabase = await createServerSupabaseClient();
    const [{ data: lead }, { count: evidenceCount }] = await Promise.all([supabase.from("leads").select("*").eq("workspace_id", context.workspaceId).eq("id", leadId).single(), supabase.from("lead_field_evidence").select("id", { count: "exact", head: true }).eq("workspace_id", context.workspaceId).eq("lead_id", leadId)]);
    if (!lead) return { ok: false, message: "Lead not found." };
    const score = calculateLeadScore({ icpMatch: true, locationMatch: true, industryMatch: true, websiteOpportunity: lead.website_status === "unknown" ? 2 : 10, socialActivity: lead.social_activity_score, reviewCount: lead.review_count, hasEmail: Boolean(lead.email), hasPhone: Boolean(lead.phone), emailVerified: lead.email_verification_status === "verified", phoneVerified: lead.phone_verification_status === "verified", sizeFit: lead.employee_estimate === null ? null : true, buyingSignal: lead.status === "interested", excluded: lead.status === "disqualified", evidenceCount: evidenceCount ?? 0, populatedFieldCount: Object.values(lead).filter(Boolean).length });
    await Promise.all([supabase.from("leads").update({ qualification_score: score.total, qualification_reason: score.explanation }).eq("id", leadId), supabase.from("lead_score_components").insert({ workspace_id: context.workspaceId, lead_id: leadId, campaign_id: null, icp_fit: score.icpFit, location_fit: score.locationFit, industry_fit: score.industryFit, website_opportunity: score.websiteOpportunity, social_activity: score.socialActivity, reviews: score.reviews, contact_availability: score.contactAvailability, verification: score.verification, size_fit: score.sizeFit, buying_signals: score.buyingSignals, exclusion_penalty: score.exclusionPenalty, confidence: score.confidence, total_score: score.total, explanation: score.explanation, model_version: "deterministic", rule_version: score.ruleVersion })]);
  }
  revalidatePath("/app/leads"); revalidatePath(`/app/leads/${leadId}`); return { ok: true, message: "Lead score recalculated with Phase 2 rules." };
}

export async function saveLeadViewAction(name: string, query: string): Promise<LeadActionResult> {
  const value = name.trim(); if (!value || value.length > 80) return { ok: false, message: "Enter a saved view name up to 80 characters." };
  const context = await mutationContext("lead:update"); if (!context) return { ok: false, message: "You do not have permission to save views." };
  if (context.demo) {
    const views = demoPhase2Store().savedViews.get(context.workspaceId) ?? []; views.push({ id: randomUUID(), name: value, query }); demoPhase2Store().savedViews.set(context.workspaceId, views);
  } else {
    const supabase = await createServerSupabaseClient(); const filters = Object.fromEntries(new URLSearchParams(query));
    const { error } = await supabase.from("saved_views").upsert({ workspace_id: context.workspaceId, owner_id: context.userId, entity_type: "leads", name: value, filters, sorting: [], visible_columns: [], shared: false }, { onConflict: "workspace_id,owner_id,entity_type,name" });
    if (error) return { ok: false, message: "Saved view could not be created." };
  }
  revalidatePath("/app/leads"); return { ok: true, message: "View saved." };
}

export async function suppressLeadAction(leadId: string, reason: string): Promise<LeadActionResult> {
  const context = await mutationContext("lead:update");
  if (!context) return { ok: false, message: "You do not have permission to suppress leads." };
  if (!reason.trim()) return { ok: false, message: "Choose or enter a suppression reason." };
  if (context.demo) {
    const lead = demoPhase2Store().leads.get(context.workspaceId)?.find((item) => item.id === leadId); if (!lead) return { ok: false, message: "Lead not found." };
    lead.doNotContact = true; lead.doNotContactReason = reason.trim(); lead.status = "do_not_contact"; lead.lastActivityAt = new Date().toISOString(); addDemoActivity(leadId, "lead.suppressed", `Lead suppressed: ${reason.trim()}`);
  } else {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("suppress_lead", { target_lead_id: leadId, suppression_reason: reason.trim(), suppression_origin: "user" });
    if (error || !data) return { ok: false, message: "Lead could not be suppressed." };
  }
  revalidatePath("/app/leads"); revalidatePath(`/app/leads/${leadId}`); return { ok: true, message: "Lead suppressed. Future campaign addition is blocked." };
}

export async function restoreLeadAction(leadId: string): Promise<LeadActionResult> {
  const context = await mutationContext("lead:delete");
  if (!context) return { ok: false, message: "Administrator permission is required to restore this lead." };
  if (context.demo) {
    const lead = demoPhase2Store().leads.get(context.workspaceId)?.find((item) => item.id === leadId); if (!lead) return { ok: false, message: "Lead not found." };
    lead.doNotContact = false; lead.doNotContactReason = ""; lead.status = "new"; addDemoActivity(leadId, "lead.restored", "Lead restored after confirmation");
  } else {
    const supabase = await createServerSupabaseClient(); const { data, error } = await supabase.rpc("restore_suppressed_lead", { target_lead_id: leadId });
    if (error || !data) return { ok: false, message: "Lead could not be restored." };
  }
  revalidatePath("/app/leads"); revalidatePath(`/app/leads/${leadId}`); return { ok: true, message: "Lead restored." };
}

export async function bulkLeadAction(input: { leadIds: string[]; action: "archive" | "suppress" | "assign" | "tag" | "recalculate"; value?: string }): Promise<LeadActionResult> {
  if (!input.leadIds.length || input.leadIds.length > 500) return { ok: false, message: "Select between 1 and 500 leads." };
  const context = await mutationContext("lead:update"); if (!context) return { ok: false, message: "You do not have permission to update leads." };
  if (context.demo) {
    const leads = demoPhase2Store().leads.get(context.workspaceId) ?? [];
    for (const lead of leads.filter((item) => input.leadIds.includes(item.id))) {
      if (input.action === "archive") lead.status = "archived";
      if (input.action === "suppress") { lead.status = "do_not_contact"; lead.doNotContact = true; lead.doNotContactReason = input.value || "Bulk suppression"; }
      if (input.action === "assign") { lead.assignedTo = input.value || ""; lead.assignedName = input.value ? "Assigned teammate" : "Unassigned"; }
      if (input.action === "tag" && input.value && !lead.tags.includes(input.value)) lead.tags.push(input.value);
      if (input.action === "recalculate") await recalculateLeadAction(lead.id);
      addDemoActivity(lead.id, `lead.bulk_${input.action}`, `Bulk ${input.action} applied`);
    }
  } else {
    const supabase = await createServerSupabaseClient();
    if (input.action === "archive") await supabase.from("leads").update({ status: "archived" }).eq("workspace_id", context.workspaceId).in("id", input.leadIds);
    if (input.action === "assign") await supabase.from("leads").update({ assigned_to: input.value || null }).eq("workspace_id", context.workspaceId).in("id", input.leadIds);
    if (input.action === "suppress") for (const leadId of input.leadIds) await supabase.rpc("suppress_lead", { target_lead_id: leadId, suppression_reason: input.value || "Bulk suppression", suppression_origin: "user" });
    if (input.action === "tag" && input.value) await addTag(context.workspaceId, context.userId, input.leadIds, input.value);
    if (input.action === "recalculate") for (const leadId of input.leadIds) await recalculateLeadAction(leadId);
  }
  revalidatePath("/app/leads"); return { ok: true, message: `Updated ${input.leadIds.length} leads.` };
}
