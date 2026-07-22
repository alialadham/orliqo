import type { Confidence } from "@/features/onboarding/types";
import type { ScoreBreakdown } from "@/features/leads/scoring";

export type LeadStatus = "new" | "qualified" | "disqualified" | "contacted" | "replied" | "interested" | "won" | "lost" | "do_not_contact" | "archived";

export type Lead = {
  id: string;
  workspaceId: string;
  businessName: string;
  legalName: string;
  industry: string;
  category: string;
  description: string;
  country: string;
  city: string;
  address: string;
  websiteUrl: string;
  websiteStatus: string;
  websiteConfidence: Confidence;
  email: string;
  emailVerification: "verified" | "risky" | "invalid" | "unverified" | "missing";
  phone: string;
  phoneVerification: "verified" | "risky" | "invalid" | "unverified" | "missing";
  whatsappAvailable: boolean;
  whatsappConsent: "opted_in" | "opted_out" | "unknown" | "not_required";
  instagramUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
  reviewCount: number | null;
  averageRating: number | null;
  socialActivityScore: number | null;
  employeeEstimate: number | null;
  revenueEstimate: number | null;
  services: string[];
  qualificationScore: number;
  qualificationReason: string;
  suggestedOpportunity: string;
  recommendedChannel: "email" | "whatsapp" | "instagram" | "linkedin" | "manual_call";
  personalizationAngle: string;
  status: LeadStatus;
  doNotContact: boolean;
  doNotContactReason: string;
  assignedTo: string;
  assignedName: string;
  tags: string[];
  lastActivityAt: string;
  createdAt: string;
};

export type LeadSource = {
  id: string;
  title: string;
  url: string;
  domain: string;
  retrievedAt: string;
  citation: string;
  confidence: Confidence;
  allowedForAutomatedUse: boolean;
};

export type LeadEvidence = {
  id: string;
  fieldName: string;
  value: string;
  confidence: Confidence;
  verificationMethod: string;
  verifiedAt: string | null;
  sourceId: string | null;
};

export type LeadNote = {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LeadActivity = {
  id: string;
  eventType: string;
  summary: string;
  actorName: string;
  createdAt: string;
};

export type LeadDetailData = {
  lead: Lead;
  sources: LeadSource[];
  evidence: LeadEvidence[];
  score: ScoreBreakdown;
  notes: LeadNote[];
  activities: LeadActivity[];
};
