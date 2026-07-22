import "server-only";

import { readDemoSession } from "@/features/auth/demo-session";
import { getCurrentUser } from "@/features/auth/session";
import { demoPhase2Store } from "@/features/demo/phase2-store";
import { calculateLeadScore } from "@/features/leads/scoring";
import type { Lead, LeadDetailData, LeadEvidence, LeadNote, LeadSource } from "@/features/leads/types";
import { getWorkspaceContext } from "@/features/workspaces/data";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

export type LeadQuery = {
  q?: string;
  status?: string;
  industry?: string;
  country?: string;
  city?: string;
  websiteStatus?: string;
  minScore?: number;
  maxScore?: number;
  contact?: "email" | "phone" | "instagram";
  doNotContact?: boolean;
  sort?: "score" | "business" | "activity";
  direction?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type LeadListData = {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
  savedViews: Array<{ id: string; name: string; query: string }>;
  teammates: Array<{ id: string; name: string }>;
};

function strings(value: Json | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapLead(row: LeadRow, teammateName = "Unassigned", tags: string[] = []): Lead {
  return {
    id: row.id, workspaceId: row.workspace_id, businessName: row.business_name, legalName: row.legal_name ?? "",
    industry: row.industry ?? "", category: row.category ?? "", description: row.description ?? "",
    country: row.country ?? "", city: row.city ?? "", address: row.address ?? "", websiteUrl: row.website_url ?? "",
    websiteStatus: row.website_status, websiteConfidence: row.website_status_confidence as Lead["websiteConfidence"],
    email: row.email ?? "", emailVerification: row.email_verification_status as Lead["emailVerification"],
    phone: row.phone ?? "", phoneVerification: row.phone_verification_status as Lead["phoneVerification"],
    whatsappAvailable: Boolean(row.whatsapp_available), whatsappConsent: row.whatsapp_consent_status as Lead["whatsappConsent"],
    instagramUrl: row.instagram_url ?? "", facebookUrl: row.facebook_url ?? "", linkedinUrl: row.linkedin_url ?? "",
    reviewCount: row.review_count, averageRating: row.average_rating, socialActivityScore: row.social_activity_score,
    employeeEstimate: row.employee_estimate, revenueEstimate: row.revenue_estimate, services: strings(row.services),
    qualificationScore: row.qualification_score ?? 0, qualificationReason: row.qualification_reason ?? "",
    suggestedOpportunity: row.suggested_opportunity ?? "", recommendedChannel: (row.recommended_channel ?? "email") as Lead["recommendedChannel"],
    personalizationAngle: row.personalization_angle ?? "", status: row.status as Lead["status"],
    doNotContact: row.do_not_contact, doNotContactReason: row.do_not_contact_reason ?? "", assignedTo: row.assigned_to ?? "",
    assignedName: teammateName, tags, lastActivityAt: row.last_contacted_at ?? row.updated_at, createdAt: row.created_at,
  };
}

function filterDemo(leads: Lead[], query: LeadQuery): Lead[] {
  const needle = query.q?.trim().toLowerCase();
  return leads.filter((lead) => {
    if (needle && ![lead.businessName, lead.email, lead.city, lead.industry].some((value) => value.toLowerCase().includes(needle))) return false;
    if (query.status && lead.status !== query.status) return false;
    if (query.industry && lead.industry !== query.industry) return false;
    if (query.country && lead.country !== query.country) return false;
    if (query.city && lead.city !== query.city) return false;
    if (query.websiteStatus && lead.websiteStatus !== query.websiteStatus) return false;
    if (query.minScore !== undefined && lead.qualificationScore < query.minScore) return false;
    if (query.maxScore !== undefined && lead.qualificationScore > query.maxScore) return false;
    if (query.contact === "email" && !lead.email) return false;
    if (query.contact === "phone" && !lead.phone) return false;
    if (query.contact === "instagram" && !lead.instagramUrl) return false;
    if (query.doNotContact !== undefined && lead.doNotContact !== query.doNotContact) return false;
    return true;
  }).sort((left, right) => {
    const multiplier = query.direction === "asc" ? 1 : -1;
    if (query.sort === "business") return left.businessName.localeCompare(right.businessName) * multiplier;
    if (query.sort === "activity") return left.lastActivityAt.localeCompare(right.lastActivityAt) * multiplier;
    return (left.qualificationScore - right.qualificationScore) * multiplier;
  });
}

export async function getLeadList(query: LeadQuery = {}): Promise<LeadListData | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, query.pageSize ?? 20));
  if (user.provider === "demo") {
    const session = await readDemoSession();
    if (!session || session.kind !== "workspace") return null;
    const filtered = filterDemo([...(demoPhase2Store().leads.get(session.activeWorkspaceId) ?? [])], query);
    return {
      leads: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize,
      savedViews: demoPhase2Store().savedViews.get(session.activeWorkspaceId) ?? [],
      teammates: [{ id: "00000000-0000-4000-8000-000000000001", name: "Ali Haddad" }, { id: "00000000-0000-4000-8000-000000000004", name: "Rana Saleh" }],
    };
  }

  const context = await getWorkspaceContext();
  if (!context) return null;
  const supabase = await createServerSupabaseClient();
  const workspaceId = context.activeWorkspace.id;
  let builder = supabase.from("leads").select("*", { count: "exact" }).eq("workspace_id", workspaceId);
  const safeSearch = query.q?.replace(/[(),%]/g, " ").trim();
  if (safeSearch) builder = builder.or(`business_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,city.ilike.%${safeSearch}%`);
  if (query.status) builder = builder.eq("status", query.status);
  if (query.industry) builder = builder.eq("industry", query.industry);
  if (query.country) builder = builder.eq("country", query.country);
  if (query.city) builder = builder.eq("city", query.city);
  if (query.websiteStatus) builder = builder.eq("website_status", query.websiteStatus);
  if (query.minScore !== undefined) builder = builder.gte("qualification_score", query.minScore);
  if (query.maxScore !== undefined) builder = builder.lte("qualification_score", query.maxScore);
  if (query.doNotContact !== undefined) builder = builder.eq("do_not_contact", query.doNotContact);
  if (query.contact) builder = builder.not(query.contact === "instagram" ? "instagram_url" : query.contact, "is", null);
  const orderField = query.sort === "business" ? "business_name" : query.sort === "activity" ? "updated_at" : "qualification_score";
  builder = builder.order(orderField, { ascending: query.direction === "asc", nullsFirst: false }).range((page - 1) * pageSize, page * pageSize - 1);
  const [leadResult, teammateResult, viewResult, tagResult] = await Promise.all([
    builder,
    supabase.from("workspace_teammates").select("user_id, full_name").eq("workspace_id", workspaceId),
    supabase.from("saved_views").select("id, name, filters").eq("workspace_id", workspaceId).eq("entity_type", "leads"),
    supabase.from("lead_tags").select("lead_id, tag_id").eq("workspace_id", workspaceId),
  ]);
  if (leadResult.error) throw new Error("Leads could not be loaded.");
  const tagIds = [...new Set((tagResult.data ?? []).map((item) => item.tag_id))];
  const tags = tagIds.length ? await supabase.from("tags").select("id, name").in("id", tagIds) : { data: [] as Array<{ id: string; name: string }> };
  const teammateMap = new Map((teammateResult.data ?? []).map((item) => [item.user_id, item.full_name]));
  const tagMap = new Map((tags.data ?? []).map((item) => [item.id, item.name]));
  const leadTags = new Map<string, string[]>();
  for (const item of tagResult.data ?? []) leadTags.set(item.lead_id, [...(leadTags.get(item.lead_id) ?? []), tagMap.get(item.tag_id) ?? ""]);
  return {
    leads: (leadResult.data ?? []).map((row) => mapLead(row, row.assigned_to ? teammateMap.get(row.assigned_to) ?? "Assigned" : "Unassigned", leadTags.get(row.id)?.filter(Boolean) ?? [])),
    total: leadResult.count ?? 0, page, pageSize,
    savedViews: (viewResult.data ?? []).map((view) => ({ id: view.id, name: view.name, query: new URLSearchParams((view.filters && typeof view.filters === "object" && !Array.isArray(view.filters) ? view.filters : {}) as Record<string, string>).toString() })),
    teammates: (teammateResult.data ?? []).map((item) => ({ id: item.user_id, name: item.full_name })),
  };
}

export async function getLeadDetail(leadId: string): Promise<LeadDetailData | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.provider === "demo") {
    const session = await readDemoSession();
    const lead = session ? demoPhase2Store().leads.get(session.activeWorkspaceId)?.find((item) => item.id === leadId) : null;
    const detail = lead ? demoPhase2Store().detail.get(leadId) : null;
    return lead && detail ? structuredClone({ lead, ...detail }) : null;
  }
  const context = await getWorkspaceContext();
  if (!context) return null;
  const supabase = await createServerSupabaseClient();
  const workspaceId = context.activeWorkspace.id;
  const [leadResult, sourceResult, evidenceResult, scoreResult, noteResult, activityResult, teammates] = await Promise.all([
    supabase.from("leads").select("*").eq("workspace_id", workspaceId).eq("id", leadId).maybeSingle(),
    supabase.from("lead_sources").select("*").eq("workspace_id", workspaceId).eq("lead_id", leadId).order("retrieved_at", { ascending: false }),
    supabase.from("lead_field_evidence").select("*").eq("workspace_id", workspaceId).eq("lead_id", leadId),
    supabase.from("lead_score_components").select("*").eq("workspace_id", workspaceId).eq("lead_id", leadId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lead_notes").select("*").eq("workspace_id", workspaceId).eq("lead_id", leadId).is("deleted_at", null).order("pinned", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("lead_activities").select("*").eq("workspace_id", workspaceId).eq("lead_id", leadId).order("created_at", { ascending: false }),
    supabase.from("workspace_teammates").select("user_id, full_name").eq("workspace_id", workspaceId),
  ]);
  if (!leadResult.data) return null;
  const people = new Map((teammates.data ?? []).map((item) => [item.user_id, item.full_name]));
  const row = leadResult.data;
  const sources: LeadSource[] = (sourceResult.data ?? []).map((item) => ({ id: item.id, title: item.source_title ?? item.source_domain ?? "Source", url: item.source_url, domain: item.source_domain ?? "", retrievedAt: item.retrieved_at, citation: item.citation_text ?? "", confidence: item.confidence as LeadSource["confidence"], allowedForAutomatedUse: item.allowed_for_automated_use }));
  const evidence: LeadEvidence[] = (evidenceResult.data ?? []).map((item) => ({ id: item.id, fieldName: item.field_name, value: typeof item.value === "string" ? item.value : JSON.stringify(item.value), confidence: item.confidence as LeadEvidence["confidence"], verificationMethod: item.verification_method ?? "", verifiedAt: item.verified_at, sourceId: item.source_id }));
  const notes: LeadNote[] = (noteResult.data ?? []).map((item) => ({ id: item.id, authorId: item.author_id, authorName: people.get(item.author_id) ?? "Workspace member", content: item.content, pinned: item.pinned, createdAt: item.created_at, updatedAt: item.updated_at }));
  const score = scoreResult.data;
  const fallbackScore = calculateLeadScore({ icpMatch: true, locationMatch: true, industryMatch: true, websiteOpportunity: row.website_status === "unknown" ? 2 : 10, socialActivity: row.social_activity_score, reviewCount: row.review_count, hasEmail: Boolean(row.email), hasPhone: Boolean(row.phone), emailVerified: row.email_verification_status === "verified", phoneVerified: row.phone_verification_status === "verified", sizeFit: row.employee_estimate === null ? null : true, buyingSignal: false, excluded: row.status === "disqualified", evidenceCount: evidence.length, populatedFieldCount: Object.values(row).filter(Boolean).length });
  return {
    lead: mapLead(row, row.assigned_to ? people.get(row.assigned_to) ?? "Assigned" : "Unassigned"), sources, evidence,
    score: score ? { icpFit: score.icp_fit, locationFit: score.location_fit, industryFit: score.industry_fit, websiteOpportunity: score.website_opportunity, socialActivity: score.social_activity, reviews: score.reviews, contactAvailability: score.contact_availability, verification: score.verification, sizeFit: score.size_fit, buyingSignals: score.buying_signals, exclusionPenalty: score.exclusion_penalty, confidence: score.confidence, total: score.total_score, dataConfidence: score.confidence >= 8 ? "high" : score.confidence >= 4 ? "medium" : "low", explanation: score.explanation, ruleVersion: "phase2-v1" } : fallbackScore,
    notes,
    activities: (activityResult.data ?? []).map((item) => ({ id: item.id, eventType: item.event_type, summary: item.summary, actorName: item.actor_id ? people.get(item.actor_id) ?? "Workspace member" : "Orliqo", createdAt: item.created_at })),
  };
}
