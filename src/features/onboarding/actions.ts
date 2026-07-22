"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeAuditLog } from "@/features/audit/server";
import { createDemoWorkspaceSession, readDemoSession } from "@/features/auth/demo-session";
import { getCurrentUser } from "@/features/auth/session";
import { cloneOnboarding, demoPhase2Store, ensureDemoOnboarding } from "@/features/demo/phase2-store";
import { normalizePhone, normalizeUrl } from "@/features/leads/normalization";
import { businessSchema, goalsSchema, icpSchema, offerSchema, type OnboardingActionResult } from "@/features/onboarding/schemas";
import { getOnboardingState } from "@/features/onboarding/data";
import type { BusinessProfileInput, ChannelPreference, GoalsInput, IcpInput, OfferInput, OnboardingStep } from "@/features/onboarding/types";
import { requirePermission } from "@/features/permissions/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function failure(message: string, fieldErrors?: Record<string, string[]>): OnboardingActionResult {
  return { ok: false, message, fieldErrors };
}

async function mutationContext(): Promise<{ workspaceId: string; userId: string; demo: boolean } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.provider === "demo") {
    const session = await readDemoSession();
    if (!session) return null;
    if (session.kind === "workspace") {
      const context = await requirePermission("settings:manage");
      if (!context) return null;
    }
    return { workspaceId: session.activeWorkspaceId, userId: user.id, demo: true };
  }
  const context = await requirePermission("settings:manage");
  return context ? { workspaceId: context.activeWorkspace.id, userId: context.user.id, demo: false } : null;
}

function zodFailure(error: { flatten(): { fieldErrors: Record<string, string[]> } }): OnboardingActionResult {
  return failure("Check the highlighted fields and try again.", error.flatten().fieldErrors);
}

export async function saveBusinessAction(input: BusinessProfileInput): Promise<OnboardingActionResult> {
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) return zodFailure(parsed.error);
  const context = await mutationContext();
  if (!context) return failure("You do not have permission to edit onboarding.");
  const business = { ...parsed.data, websiteUrl: parsed.data.websiteUrl ? normalizeUrl(parsed.data.websiteUrl) : "", whatsappNumber: parsed.data.whatsappNumber ? normalizePhone(parsed.data.whatsappNumber) : "" };
  if (context.demo) {
    const state = ensureDemoOnboarding(context.workspaceId, business.companyName);
    state.business = business;
    state.currentStep = Math.max(state.currentStep, 2) as OnboardingStep;
    state.updatedAt = new Date().toISOString();
  } else {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("business_profiles").update({
      company_name: business.companyName, website_url: business.websiteUrl || null, industry: business.industry,
      country: business.country, city: business.city, company_size: business.companySize, employee_range: business.employeeRange,
      description: business.description, logo_url: business.logoUrl || null, instagram_url: business.instagramUrl || null,
      linkedin_url: business.linkedinUrl || null, whatsapp_number: business.whatsappNumber || null, onboarding_step: 2,
    }).eq("workspace_id", context.workspaceId);
    if (error) return failure("Business information could not be saved. Your input is still available.");
    await writeAuditLog({ workspaceId: context.workspaceId, actorId: context.userId, action: "onboarding.business_updated", entityType: "business_profile", after: { companyName: business.companyName } });
  }
  revalidatePath("/onboarding");
  return { ok: true, message: "Business information saved." };
}

export async function saveOfferAction(input: OfferInput): Promise<OnboardingActionResult> {
  const parsed = offerSchema.safeParse(input);
  if (!parsed.success) return zodFailure(parsed.error);
  const context = await mutationContext();
  if (!context) return failure("You do not have permission to edit onboarding.");
  if (context.demo) {
    const state = ensureDemoOnboarding(context.workspaceId); state.offer = parsed.data; state.currentStep = Math.max(state.currentStep, 3) as OnboardingStep; state.updatedAt = new Date().toISOString();
  } else {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("business_profiles").update({
      main_service: parsed.data.mainService, additional_services: parsed.data.additionalServices, average_project_value: parsed.data.averageProjectValue,
      currency: parsed.data.currency, pricing_model: parsed.data.pricingModel, sales_cycle: parsed.data.salesCycle,
      main_customer_problem: parsed.data.mainCustomerProblem, competitive_advantage: parsed.data.competitiveAdvantage,
      default_cta: parsed.data.defaultCta, custom_cta: parsed.data.customCta || null, brand_tone: parsed.data.brandTone,
      selling_points: parsed.data.sellingPoints, onboarding_step: 3,
    }).eq("workspace_id", context.workspaceId);
    if (error) return failure("Offer information could not be saved. Your input is still available.");
    await writeAuditLog({ workspaceId: context.workspaceId, actorId: context.userId, action: "onboarding.offer_updated", entityType: "business_profile" });
  }
  revalidatePath("/onboarding");
  return { ok: true, message: "Offer saved." };
}

export async function saveIcpAction(input: IcpInput): Promise<OnboardingActionResult & { id?: string }> {
  const parsed = icpSchema.safeParse(input);
  if (!parsed.success) return zodFailure(parsed.error);
  const context = await mutationContext();
  if (!context) return failure("You do not have permission to manage ideal customer profiles.");
  const id = parsed.data.id || randomUUID();
  if (context.demo) {
    const state = ensureDemoOnboarding(context.workspaceId); const next = { ...parsed.data, id };
    if (next.isDefault) state.icps = state.icps.map((icp) => ({ ...icp, isDefault: false }));
    const existing = state.icps.findIndex((icp) => icp.id === id);
    if (existing >= 0) state.icps[existing] = next; else state.icps.push(next);
    state.currentStep = Math.max(state.currentStep, 4) as OnboardingStep; state.updatedAt = new Date().toISOString();
  } else {
    const supabase = await createServerSupabaseClient();
    if (parsed.data.isDefault) await supabase.from("ideal_customer_profiles").update({ is_default: false }).eq("workspace_id", context.workspaceId);
    const { error } = await supabase.from("ideal_customer_profiles").upsert({
      id, workspace_id: context.workspaceId, name: parsed.data.name, natural_language_description: parsed.data.naturalLanguageDescription,
      summary: parsed.data.summary, countries: parsed.data.countries, cities: parsed.data.cities, industries: parsed.data.industries,
      company_sizes: parsed.data.companySizes, employee_min: parsed.data.employeeMin, employee_max: parsed.data.employeeMax,
      revenue_min: parsed.data.revenueMin, revenue_max: parsed.data.revenueMax, business_age_min: parsed.data.businessAgeMin,
      business_age_max: parsed.data.businessAgeMax, website_statuses: parsed.data.websiteStatuses,
      social_activity_min: parsed.data.socialActivityMin, review_count_min: parsed.data.reviewCountMin, keywords: parsed.data.keywords,
      excluded_industries: parsed.data.excludedIndustries, excluded_companies: parsed.data.excludedCompanies,
      contact_requirements: { methods: parsed.data.requiredContactMethods }, minimum_score: parsed.data.minimumScore,
      audience_breadth: parsed.data.audienceBreadth, is_default: parsed.data.isDefault, active: !parsed.data.archived,
      archived_at: parsed.data.archived ? new Date().toISOString() : null,
    }, { onConflict: "id" });
    if (error) return failure("The ideal customer profile could not be saved.");
    await supabase.from("business_profiles").update({ onboarding_step: 4, target_industry_summary: parsed.data.summary }).eq("workspace_id", context.workspaceId);
    await writeAuditLog({ workspaceId: context.workspaceId, actorId: context.userId, action: "icp.saved", entityType: "ideal_customer_profile", entityId: id });
  }
  revalidatePath("/onboarding");
  return { ok: true, message: "Ideal customer profile saved.", id };
}

export async function duplicateIcpAction(icpId: string): Promise<OnboardingActionResult> {
  const context = await mutationContext();
  if (!context) return failure("You do not have permission to manage ideal customer profiles.");
  if (context.demo) {
    const state = ensureDemoOnboarding(context.workspaceId); const source = state.icps.find((icp) => icp.id === icpId);
    if (!source) return failure("Ideal customer profile not found.");
    state.icps.push({ ...cloneOnboarding(state).icps.find((icp) => icp.id === icpId)!, id: randomUUID(), name: `${source.name} copy`, isDefault: false, archived: false });
  } else {
    const supabase = await createServerSupabaseClient();
    const { data: source } = await supabase.from("ideal_customer_profiles").select("*").eq("workspace_id", context.workspaceId).eq("id", icpId).single();
    if (!source) return failure("Ideal customer profile not found.");
    const { id: _id, created_at: _created, updated_at: _updated, ...copy } = source;
    void _id; void _created; void _updated;
    const { error } = await supabase.from("ideal_customer_profiles").insert({ ...copy, id: randomUUID(), name: `${source.name} copy`, is_default: false, archived_at: null, duplicated_from_id: source.id });
    if (error) return failure("Ideal customer profile could not be duplicated.");
  }
  revalidatePath("/onboarding");
  return { ok: true, message: "Ideal customer profile duplicated." };
}

export async function saveChannelsAction(channels: ChannelPreference[]): Promise<OnboardingActionResult> {
  const context = await mutationContext();
  if (!context) return failure("You do not have permission to edit channel preferences.");
  const payload = Object.fromEntries(channels.map((channel) => [channel.channel, { enabled: channel.enabled, state: channel.state }]));
  if (context.demo) {
    const state = ensureDemoOnboarding(context.workspaceId); state.channels = channels; state.currentStep = Math.max(state.currentStep, 5) as OnboardingStep; state.updatedAt = new Date().toISOString();
  } else {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("business_profiles").update({ channel_preferences: payload, onboarding_step: 5 }).eq("workspace_id", context.workspaceId);
    if (error) return failure("Channel preferences could not be saved.");
    await writeAuditLog({ workspaceId: context.workspaceId, actorId: context.userId, action: "onboarding.channels_updated", entityType: "business_profile" });
  }
  revalidatePath("/onboarding"); return { ok: true, message: "Channel preferences saved." };
}

export async function saveGoalsAction(input: GoalsInput): Promise<OnboardingActionResult> {
  const parsed = goalsSchema.safeParse(input);
  if (!parsed.success) return zodFailure(parsed.error);
  const context = await mutationContext(); if (!context) return failure("You do not have permission to edit campaign defaults.");
  if (context.demo) {
    const state = ensureDemoOnboarding(context.workspaceId); state.goals = parsed.data; state.currentStep = 6; state.updatedAt = new Date().toISOString();
  } else {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("business_profiles").update({ campaign_defaults: parsed.data, onboarding_step: 6 }).eq("workspace_id", context.workspaceId);
    if (error) return failure("Campaign defaults could not be saved.");
    await writeAuditLog({ workspaceId: context.workspaceId, actorId: context.userId, action: "onboarding.goals_updated", entityType: "business_profile" });
  }
  revalidatePath("/onboarding"); return { ok: true, message: "Campaign defaults saved." };
}

export async function completeOnboardingAction(): Promise<void> {
  const context = await mutationContext();
  if (!context) redirect("/onboarding?error=permission");
  const state = await getOnboardingState();
  if (!state || !businessSchema.safeParse(state.business).success || !offerSchema.safeParse(state.offer).success || !goalsSchema.safeParse(state.goals).success || !state.icps.some((icp) => !icp.archived && icpSchema.safeParse(icp).success) || !state.channels.some((channel) => channel.enabled)) redirect("/onboarding?error=incomplete");
  if (context.demo) {
    const state = ensureDemoOnboarding(context.workspaceId); state.completed = true; state.currentStep = 6; state.updatedAt = new Date().toISOString();
    await createDemoWorkspaceSession();
  } else {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("business_profiles").update({ onboarding_completed: true, onboarding_step: 6 }).eq("workspace_id", context.workspaceId);
    if (error) redirect("/onboarding?error=completion");
    await writeAuditLog({ workspaceId: context.workspaceId, actorId: context.userId, action: "onboarding.completed", entityType: "business_profile" });
  }
  revalidatePath("/app", "layout"); redirect("/app/dashboard?onboarding=complete");
}

export async function completeOnboardingAndStartCampaignAction(): Promise<void> {
  const context = await mutationContext();
  if (!context) redirect("/onboarding?error=permission");
  const state = await getOnboardingState();
  if (!state || !businessSchema.safeParse(state.business).success || !offerSchema.safeParse(state.offer).success || !goalsSchema.safeParse(state.goals).success || !state.icps.some((icp) => !icp.archived && icpSchema.safeParse(icp).success) || !state.channels.some((channel) => channel.enabled)) redirect("/onboarding?error=incomplete");
  if (context.demo) {
    const demoState = ensureDemoOnboarding(context.workspaceId); demoState.completed = true; demoState.currentStep = 6; demoState.updatedAt = new Date().toISOString(); await createDemoWorkspaceSession();
  } else {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("business_profiles").update({ onboarding_completed: true, onboarding_step: 6 }).eq("workspace_id", context.workspaceId);
    if (error) redirect("/onboarding?error=completion");
    await writeAuditLog({ workspaceId: context.workspaceId, actorId: context.userId, action: "onboarding.completed", entityType: "business_profile" });
  }
  revalidatePath("/app", "layout"); redirect("/app/campaigns/new?source=onboarding");
}

export async function saveOnboardingDraftAction(): Promise<void> {
  revalidatePath("/onboarding"); redirect("/?onboarding=draft");
}

export async function decideWebsiteSuggestionsAction(input: { importId: string; acceptedIds: string[]; rejectedIds: string[] }): Promise<OnboardingActionResult> {
  const context = await mutationContext();
  if (!context) return failure("You do not have permission to review website suggestions.");
  if (context.demo) {
    const history = demoPhase2Store().imports.get(context.workspaceId) ?? [];
    const item = history.find((entry) => entry.id === input.importId);
    if (!item) return failure("Website import was not found.");
    item.suggestions = item.suggestions.map((suggestion) => ({
      ...suggestion,
      decision: input.acceptedIds.includes(suggestion.id) ? "accepted" : input.rejectedIds.includes(suggestion.id) ? "rejected" : suggestion.decision,
    }));
  } else {
    const supabase = await createServerSupabaseClient();
    const decidedAt = new Date().toISOString();
    const updates = [
      input.acceptedIds.length ? supabase.from("website_import_suggestions").update({ decision: "accepted", decided_by: context.userId, decided_at: decidedAt }).eq("workspace_id", context.workspaceId).eq("website_import_id", input.importId).in("id", input.acceptedIds) : null,
      input.rejectedIds.length ? supabase.from("website_import_suggestions").update({ decision: "rejected", decided_by: context.userId, decided_at: decidedAt }).eq("workspace_id", context.workspaceId).eq("website_import_id", input.importId).in("id", input.rejectedIds) : null,
    ].filter((value) => value !== null);
    const results = await Promise.all(updates);
    if (results.some((result) => result.error)) return failure("Suggestion decisions could not be saved.");
    await writeAuditLog({ workspaceId: context.workspaceId, actorId: context.userId, action: "website_import.reviewed", entityType: "website_import", entityId: input.importId, after: { accepted: input.acceptedIds.length, rejected: input.rejectedIds.length } });
  }
  return { ok: true, message: "Website suggestions reviewed." };
}
