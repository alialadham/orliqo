import "server-only";

import { readDemoSession } from "@/features/auth/demo-session";
import { getCurrentUser } from "@/features/auth/session";
import { cloneOnboarding, ensureDemoOnboarding } from "@/features/demo/phase2-store";
import type { ChannelPreference, IcpInput, OnboardingState } from "@/features/onboarding/types";
import { demoPhase2Store } from "@/features/demo/phase2-store";
import { getWorkspaceContext } from "@/features/workspaces/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function textArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function mapIcp(row: Record<string, unknown>): IcpInput {
  const requirements = objectValue(row.contact_requirements);
  return {
    id: String(row.id),
    name: String(row.name ?? "Ideal customer"),
    naturalLanguageDescription: String(row.natural_language_description ?? ""),
    summary: String(row.summary ?? row.natural_language_description ?? ""),
    countries: textArray(row.countries), cities: textArray(row.cities), industries: textArray(row.industries),
    companySizes: textArray(row.company_sizes), employeeMin: typeof row.employee_min === "number" ? row.employee_min : null,
    employeeMax: typeof row.employee_max === "number" ? row.employee_max : null,
    revenueMin: typeof row.revenue_min === "number" ? row.revenue_min : null,
    revenueMax: typeof row.revenue_max === "number" ? row.revenue_max : null,
    businessAgeMin: typeof row.business_age_min === "number" ? row.business_age_min : null,
    businessAgeMax: typeof row.business_age_max === "number" ? row.business_age_max : null,
    websiteStatuses: textArray(row.website_statuses), socialActivityMin: typeof row.social_activity_min === "number" ? row.social_activity_min : null,
    reviewCountMin: typeof row.review_count_min === "number" ? row.review_count_min : null,
    keywords: textArray(row.keywords), excludedIndustries: textArray(row.excluded_industries),
    excludedCompanies: textArray(row.excluded_companies), minimumScore: Number(row.minimum_score ?? 60),
    requiredContactMethods: textArray(requirements.methods),
    audienceBreadth: row.audience_breadth === "narrow" || row.audience_breadth === "broad" ? row.audience_breadth : "balanced",
    isDefault: Boolean(row.is_default), archived: Boolean(row.archived_at),
  };
}

export async function getOnboardingState(): Promise<OnboardingState | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.provider === "demo") {
    const session = await readDemoSession();
    if (!session) return null;
    return cloneOnboarding(ensureDemoOnboarding(session.activeWorkspaceId, session.companyName));
  }

  const context = await getWorkspaceContext();
  if (!context) return null;
  const supabase = await createServerSupabaseClient();
  const workspaceId = context.activeWorkspace.id;
  const [profileResult, icpResult, workspaceResult] = await Promise.all([
    supabase.from("business_profiles").select("*").eq("workspace_id", workspaceId).single(),
    supabase.from("ideal_customer_profiles").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }),
    supabase.from("workspaces").select("currency, timezone").eq("id", workspaceId).single(),
  ]);
  if (profileResult.error || !profileResult.data) throw new Error("Business profile could not be loaded.");
  const profile = profileResult.data;
  const channels = objectValue(profile.channel_preferences);
  const defaults = objectValue(profile.campaign_defaults);
  const channelList = ["email", "whatsapp", "instagram", "linkedin", "manual_call"] as const;
  return {
    workspaceId,
    currentStep: Math.min(6, Math.max(1, profile.onboarding_step)) as OnboardingState["currentStep"],
    completed: profile.onboarding_completed,
    business: {
      companyName: profile.company_name, websiteUrl: profile.website_url ?? "", industry: profile.industry ?? "",
      country: profile.country ?? "", city: profile.city ?? "", companySize: profile.company_size ?? "",
      employeeRange: profile.employee_range ?? "", description: profile.description ?? "", logoUrl: profile.logo_url ?? "",
      instagramUrl: profile.instagram_url ?? "", linkedinUrl: profile.linkedin_url ?? "", whatsappNumber: profile.whatsapp_number ?? "",
    },
    offer: {
      mainService: profile.main_service ?? "", additionalServices: textArray(profile.additional_services),
      averageProjectValue: Number(profile.average_project_value ?? 0), currency: profile.currency || workspaceResult.data?.currency || "USD",
      pricingModel: profile.pricing_model ?? "", salesCycle: profile.sales_cycle ?? "", mainCustomerProblem: profile.main_customer_problem ?? "",
      competitiveAdvantage: profile.competitive_advantage ?? "", defaultCta: profile.default_cta ?? "book_call",
      customCta: profile.custom_cta ?? "", brandTone: profile.brand_tone ?? "", sellingPoints: textArray(profile.selling_points),
    },
    icps: (icpResult.data ?? []).map((row) => mapIcp(row as unknown as Record<string, unknown>)),
    channels: channelList.map((channel): ChannelPreference => {
      const saved = objectValue(channels[channel]);
      return { channel, enabled: Boolean(saved.enabled), state: typeof saved.state === "string" && ["connected", "not_connected", "demo", "unavailable", "setup_required"].includes(saved.state) ? saved.state as ChannelPreference["state"] : "not_connected" };
    }),
    goals: {
      leadsPerMonth: Number(defaults.leadsPerMonth ?? 100), messagesPerDay: Number(defaults.messagesPerDay ?? 20),
      sendingDays: Array.isArray(defaults.sendingDays) ? defaults.sendingDays.filter((day): day is number => typeof day === "number") : [1, 2, 3, 4, 5],
      startTime: String(defaults.startTime ?? "09:00"), endTime: String(defaults.endTime ?? "17:00"),
      conversionGoal: String(defaults.conversionGoal ?? "Book qualified meetings"), followUpCount: Number(defaults.followUpCount ?? 2),
      minimumScore: Number(defaults.minimumScore ?? 60), autoReplenish: Boolean(defaults.autoReplenish), timezone: workspaceResult.data?.timezone ?? "UTC",
    },
    updatedAt: profile.updated_at,
  };
}

export type WebsiteImportHistoryItem = { id: string; url: string; status: string; provider: string; model: string; createdAt: string; suggestions: Array<{ field: string; value: string; decision: string; sourceUrl: string }> };

export async function getWebsiteImportHistory(): Promise<WebsiteImportHistoryItem[]> {
  const user = await getCurrentUser(); if (!user) return [];
  if (user.provider === "demo") {
    const session = await readDemoSession(); if (!session) return [];
    return (demoPhase2Store().imports.get(session.activeWorkspaceId) ?? []).map((item) => ({ id: item.id, url: item.normalizedUrl, status: "succeeded", provider: item.provider, model: item.model, createdAt: item.suggestions[0]?.retrievedAt ?? new Date().toISOString(), suggestions: item.suggestions.map((suggestion) => ({ field: suggestion.field, value: Array.isArray(suggestion.value) ? suggestion.value.join(", ") : suggestion.value, decision: suggestion.decision, sourceUrl: suggestion.sourceUrl })) }));
  }
  const context = await getWorkspaceContext(); if (!context) return [];
  const supabase = await createServerSupabaseClient();
  const { data: imports } = await supabase.from("website_imports").select("id, normalized_url, status, provider, model, created_at").eq("workspace_id", context.activeWorkspace.id).order("created_at", { ascending: false }).limit(20);
  if (!imports?.length) return [];
  const { data: suggestions } = await supabase.from("website_import_suggestions").select("website_import_id, field_name, suggested_value, decision, source_url").eq("workspace_id", context.activeWorkspace.id).in("website_import_id", imports.map((item) => item.id));
  return imports.map((item) => ({ id: item.id, url: item.normalized_url, status: item.status, provider: item.provider, model: item.model, createdAt: item.created_at, suggestions: (suggestions ?? []).filter((suggestion) => suggestion.website_import_id === item.id).map((suggestion) => ({ field: suggestion.field_name, value: typeof suggestion.suggested_value === "string" ? suggestion.suggested_value : JSON.stringify(suggestion.suggested_value), decision: suggestion.decision, sourceUrl: suggestion.source_url })) }));
}
