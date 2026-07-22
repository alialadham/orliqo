export const ONBOARDING_STEPS = [
  "Business",
  "Offer",
  "Audience",
  "Channels",
  "Goals",
  "Review",
] as const;

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;
export type Confidence = "verified" | "likely" | "unverified" | "missing";

export type BusinessProfileInput = {
  companyName: string;
  websiteUrl: string;
  industry: string;
  country: string;
  city: string;
  companySize: string;
  employeeRange: string;
  description: string;
  logoUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  whatsappNumber: string;
};

export type OfferInput = {
  mainService: string;
  additionalServices: string[];
  averageProjectValue: number;
  currency: string;
  pricingModel: string;
  salesCycle: string;
  mainCustomerProblem: string;
  competitiveAdvantage: string;
  defaultCta: string;
  customCta: string;
  brandTone: string;
  sellingPoints: string[];
};

export type IcpInput = {
  id: string;
  name: string;
  naturalLanguageDescription: string;
  summary: string;
  countries: string[];
  cities: string[];
  industries: string[];
  companySizes: string[];
  employeeMin: number | null;
  employeeMax: number | null;
  revenueMin: number | null;
  revenueMax: number | null;
  businessAgeMin: number | null;
  businessAgeMax: number | null;
  websiteStatuses: string[];
  socialActivityMin: number | null;
  reviewCountMin: number | null;
  keywords: string[];
  excludedIndustries: string[];
  excludedCompanies: string[];
  minimumScore: number;
  requiredContactMethods: string[];
  audienceBreadth: "narrow" | "balanced" | "broad";
  isDefault: boolean;
  archived: boolean;
};

export type ChannelPreference = {
  channel: "email" | "whatsapp" | "instagram" | "linkedin" | "manual_call";
  enabled: boolean;
  state: "connected" | "not_connected" | "demo" | "unavailable" | "setup_required";
};

export type GoalsInput = {
  leadsPerMonth: number;
  messagesPerDay: number;
  sendingDays: number[];
  startTime: string;
  endTime: string;
  conversionGoal: string;
  followUpCount: number;
  minimumScore: number;
  autoReplenish: boolean;
  timezone: string;
};

export type OnboardingState = {
  workspaceId: string;
  currentStep: OnboardingStep;
  completed: boolean;
  business: BusinessProfileInput;
  offer: OfferInput;
  icps: IcpInput[];
  channels: ChannelPreference[];
  goals: GoalsInput;
  updatedAt: string;
};

export type WebsiteSuggestion = {
  id: string;
  field: "description" | "mainService" | "additionalServices" | "brandTone" | "targetIndustries" | "sellingPoints" | "defaultCta";
  value: string | string[];
  sourceUrl: string;
  retrievedAt: string;
  confidence: Confidence;
  decision: "pending" | "accepted" | "rejected";
};

export type WebsiteImportResult = {
  id: string;
  normalizedUrl: string;
  provider: string;
  model: string;
  promptVersion: string;
  suggestions: WebsiteSuggestion[];
};
