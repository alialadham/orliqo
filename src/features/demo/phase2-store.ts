import "server-only";

import { randomUUID } from "node:crypto";

import { DEMO_LEADS, DEMO_PROFILE, DEMO_WORKSPACE_ID, VIEWER_WORKSPACE_ID } from "@/features/demo/data";
import { calculateLeadScore } from "@/features/leads/scoring";
import type { Lead, LeadActivity, LeadDetailData, LeadEvidence, LeadNote, LeadSource } from "@/features/leads/types";
import type { IcpInput, OnboardingState, WebsiteImportResult } from "@/features/onboarding/types";

type DemoPhase2Store = {
  onboarding: Map<string, OnboardingState>;
  leads: Map<string, Lead[]>;
  detail: Map<string, Omit<LeadDetailData, "lead">>;
  imports: Map<string, WebsiteImportResult[]>;
  savedViews: Map<string, Array<{ id: string; name: string; query: string }>>;
  leadImports: Map<string, DemoLeadImport>;
};

export type DemoLeadImport = {
  id: string;
  workspaceId: string;
  status: "ready" | "completed" | "cancelled";
  headers: string[];
  mapping: Record<string, string>;
  rows: Array<{ rowNumber: number; raw: Record<string, string>; mapped: Record<string, string>; errors: string[]; duplicateId?: string; suppressed: boolean }>;
};

declare global {
  var __orliqoPhase2DemoStore: DemoPhase2Store | undefined;
}

const defaultIcp: IcpInput = {
  id: "icp-demo-default",
  name: "Jordan growth businesses",
  naturalLanguageDescription: "Service businesses in Jordan that rely on referrals and have a clear website or lead-generation opportunity.",
  summary: "Jordan-based service businesses with 2-50 employees, active public profiles, and an identifiable digital growth opportunity.",
  countries: ["Jordan"],
  cities: ["Amman", "Aqaba", "Zarqa"],
  industries: ["Photography", "Wellness", "Professional services"],
  companySizes: ["2-10", "11-50"],
  employeeMin: 2,
  employeeMax: 50,
  revenueMin: null,
  revenueMax: null,
  businessAgeMin: 1,
  businessAgeMax: null,
  websiteStatuses: ["outdated", "poor_mobile", "no_booking"],
  socialActivityMin: 35,
  reviewCountMin: 5,
  keywords: ["booking", "portfolio", "consultation"],
  excludedIndustries: ["Gambling"],
  excludedCompanies: [],
  minimumScore: 65,
  requiredContactMethods: ["email"],
  audienceBreadth: "balanced",
  isDefault: true,
  archived: false,
};

function onboardingState(workspaceId: string, completed: boolean): OnboardingState {
  return {
    workspaceId,
    currentStep: completed ? 6 : 1,
    completed,
    business: {
      companyName: workspaceId === VIEWER_WORKSPACE_ID ? "Northstar Demo" : "Orliqo Demo",
      websiteUrl: "https://orliqo.example.test",
      industry: "Digital services",
      country: "Jordan",
      city: "Amman",
      companySize: "2-10",
      employeeRange: "2-10",
      description: "Orliqo Demo provides evidence-backed growth and outreach services for small businesses.",
      logoUrl: "",
      instagramUrl: "https://instagram.com/orliqo_demo",
      linkedinUrl: "https://linkedin.com/company/orliqo-demo",
      whatsappNumber: "+962790000000",
    },
    offer: {
      mainService: "Evidence-backed outreach strategy",
      additionalServices: ["Website audits", "Lead research", "Campaign planning"],
      averageProjectValue: 2500,
      currency: "USD",
      pricingModel: "Project-based",
      salesCycle: "2-4 weeks",
      mainCustomerProblem: "Small businesses struggle to identify and reach qualified prospects consistently.",
      competitiveAdvantage: "Every recommendation is grounded in visible evidence and kept under human review.",
      defaultCta: "book_call",
      customCta: "",
      brandTone: "Professional and approachable",
      sellingPoints: ["Evidence-backed", "Human approval", "Safe demo mode"],
    },
    icps: [defaultIcp, { ...defaultIcp, id: "icp-demo-secondary", name: "Levant creative studios", cities: ["Amman", "Beirut"], industries: ["Photography", "Creative services"], minimumScore: 70, audienceBreadth: "narrow", isDefault: false }],
    channels: [
      { channel: "email", enabled: true, state: "demo" },
      { channel: "whatsapp", enabled: false, state: "setup_required" },
      { channel: "instagram", enabled: true, state: "demo" },
      { channel: "linkedin", enabled: true, state: "demo" },
      { channel: "manual_call", enabled: true, state: "demo" },
    ],
    goals: {
      leadsPerMonth: 250,
      messagesPerDay: 35,
      sendingDays: [1, 2, 3, 4, 5],
      startTime: "09:00",
      endTime: "16:00",
      conversionGoal: "Book qualified meetings",
      followUpCount: 2,
      minimumScore: 65,
      autoReplenish: false,
      timezone: "Asia/Amman",
    },
    updatedAt: new Date().toISOString(),
  };
}

function leadFor(workspaceId: string, index: number): Lead {
  const source = DEMO_LEADS[index % DEMO_LEADS.length]!;
  const emailVerification = source.verification === "verified" ? "verified" : source.verification === "likely" ? "unverified" : "missing";
  const status = index === 4 ? "do_not_contact" : index % 7 === 0 ? "qualified" : "new";
  return {
    id: workspaceId === DEMO_WORKSPACE_ID ? source.id : source.id.replace("20000000", "21000000"),
    workspaceId,
    businessName: source.company,
    legalName: `${source.company} LLC`,
    industry: index % 3 === 0 ? "Photography" : index % 3 === 1 ? "Wellness" : "Professional services",
    category: "Local business",
    description: `${source.company} is a synthetic company used only to verify Orliqo workflows.`,
    country: "Jordan",
    city: source.city,
    address: `${10 + index} Demo Street`,
    websiteUrl: source.website,
    websiteStatus: index % 4 === 0 ? "poor_mobile" : index % 4 === 1 ? "outdated" : "unknown",
    websiteConfidence: source.verification === "verified" ? "verified" : source.verification === "likely" ? "likely" : "unverified",
    email: source.email,
    emailVerification,
    phone: index % 5 === 0 ? "" : `+96279000${String(index + 1).padStart(4, "0")}`,
    phoneVerification: index % 5 === 0 ? "missing" : index % 3 === 0 ? "verified" : "unverified",
    whatsappAvailable: index % 2 === 0,
    whatsappConsent: "unknown",
    instagramUrl: `https://instagram.com/demo_business_${index + 1}`,
    facebookUrl: "",
    linkedinUrl: index % 3 === 0 ? `https://linkedin.com/company/demo-${index + 1}` : "",
    reviewCount: 8 + index * 3,
    averageRating: 3.8 + (index % 5) * 0.2,
    socialActivityScore: 35 + (index * 7) % 60,
    employeeEstimate: 3 + (index % 25),
    revenueEstimate: 80_000 + index * 15_000,
    services: ["Consultation", "Project delivery"],
    qualificationScore: source.score,
    qualificationReason: "Matches the demo ICP and has a visible digital opportunity.",
    suggestedOpportunity: "Offer a concise website and conversion review.",
    recommendedChannel: index % 3 === 0 ? "instagram" : "email",
    personalizationAngle: "Reference the public service portfolio and booking path.",
    status,
    doNotContact: status === "do_not_contact",
    doNotContactReason: status === "do_not_contact" ? "Synthetic opted-out example" : "",
    assignedTo: index % 4 === 0 ? "00000000-0000-4000-8000-000000000004" : DEMO_PROFILE.id,
    assignedName: index % 4 === 0 ? "Rana Saleh" : DEMO_PROFILE.fullName,
    tags: index % 3 === 0 ? ["High intent", "Amman"] : ["Research"],
    lastActivityAt: new Date(Date.now() - index * 3_600_000).toISOString(),
    createdAt: new Date(Date.now() - (index + 2) * 86_400_000).toISOString(),
  };
}

function detailFor(lead: Lead): Omit<LeadDetailData, "lead"> {
  const source: LeadSource = {
    id: `source-${lead.id}`,
    title: `${lead.businessName} public website`,
    url: lead.websiteUrl,
    domain: new URL(lead.websiteUrl).hostname,
    retrievedAt: new Date(Date.now() - 86_400_000).toISOString(),
    citation: "Synthetic public-source fixture. No live request was made.",
    confidence: lead.websiteConfidence,
    allowedForAutomatedUse: true,
  };
  const evidence: LeadEvidence[] = [
    { id: `evidence-industry-${lead.id}`, fieldName: "industry", value: lead.industry, confidence: "likely", verificationMethod: "demo fixture", verifiedAt: null, sourceId: source.id },
    { id: `evidence-website-${lead.id}`, fieldName: "websiteStatus", value: lead.websiteStatus, confidence: lead.websiteConfidence, verificationMethod: "deterministic website check", verifiedAt: lead.websiteConfidence === "verified" ? source.retrievedAt : null, sourceId: source.id },
    { id: `evidence-email-${lead.id}`, fieldName: "email", value: lead.email, confidence: lead.emailVerification === "verified" ? "verified" : "unverified", verificationMethod: "public source", verifiedAt: lead.emailVerification === "verified" ? source.retrievedAt : null, sourceId: lead.email ? source.id : null },
  ];
  const score = calculateLeadScore({
    icpMatch: true,
    locationMatch: true,
    industryMatch: true,
    websiteOpportunity: lead.websiteStatus === "unknown" ? 4 : 10,
    socialActivity: lead.socialActivityScore,
    reviewCount: lead.reviewCount,
    hasEmail: Boolean(lead.email),
    hasPhone: Boolean(lead.phone),
    emailVerified: lead.emailVerification === "verified",
    phoneVerified: lead.phoneVerification === "verified",
    sizeFit: true,
    buyingSignal: lead.qualificationScore >= 80,
    excluded: lead.status === "disqualified",
    evidenceCount: evidence.length,
    populatedFieldCount: 15,
  });
  const notes: LeadNote[] = [{ id: `note-${lead.id}`, authorId: DEMO_PROFILE.id, authorName: DEMO_PROFILE.fullName, content: "Review the public booking flow before drafting outreach.", pinned: true, createdAt: lead.createdAt, updatedAt: lead.createdAt }];
  const activities: LeadActivity[] = [
    { id: `activity-created-${lead.id}`, eventType: "lead.created", summary: "Lead created from synthetic demo data", actorName: "Orliqo Demo", createdAt: lead.createdAt },
    { id: `activity-scored-${lead.id}`, eventType: "lead.scored", summary: `Deterministic score calculated: ${score.total}`, actorName: "Orliqo rules", createdAt: lead.lastActivityAt },
  ];
  return { sources: [source], evidence, score, notes, activities };
}

function createStore(): DemoPhase2Store {
  const ownerLeads = Array.from({ length: 30 }, (_, index) => leadFor(DEMO_WORKSPACE_ID, index));
  const viewerLeads = Array.from({ length: 12 }, (_, index) => leadFor(VIEWER_WORKSPACE_ID, index));
  return {
    onboarding: new Map([[DEMO_WORKSPACE_ID, onboardingState(DEMO_WORKSPACE_ID, true)], [VIEWER_WORKSPACE_ID, onboardingState(VIEWER_WORKSPACE_ID, true)]]),
    leads: new Map([[DEMO_WORKSPACE_ID, ownerLeads], [VIEWER_WORKSPACE_ID, viewerLeads]]),
    detail: new Map([...ownerLeads, ...viewerLeads].map((lead) => [lead.id, detailFor(lead)])),
    imports: new Map(),
    savedViews: new Map([[DEMO_WORKSPACE_ID, [{ id: "view-high-score", name: "High score", query: "minScore=80" }]]]),
    leadImports: new Map(),
  };
}

export function demoPhase2Store(): DemoPhase2Store {
  globalThis.__orliqoPhase2DemoStore ??= createStore();
  return globalThis.__orliqoPhase2DemoStore;
}

export function ensureDemoOnboarding(workspaceId: string, companyName?: string): OnboardingState {
  const store = demoPhase2Store();
  const current = store.onboarding.get(workspaceId);
  if (current) return current;
  const created = onboardingState(workspaceId, false);
  if (companyName) created.business.companyName = companyName;
  store.onboarding.set(workspaceId, created);
  return created;
}

export function resetDemoOnboarding(workspaceId: string, companyName?: string): OnboardingState {
  const created = onboardingState(workspaceId, false);
  created.currentStep = 1;
  if (companyName) created.business.companyName = companyName;
  demoPhase2Store().onboarding.set(workspaceId, created);
  return created;
}

export function cloneOnboarding(state: OnboardingState): OnboardingState {
  return structuredClone(state);
}

export function addDemoActivity(leadId: string, eventType: string, summary: string): void {
  const detail = demoPhase2Store().detail.get(leadId);
  detail?.activities.unshift({ id: randomUUID(), eventType, summary, actorName: DEMO_PROFILE.fullName, createdAt: new Date().toISOString() });
}
