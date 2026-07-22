export type ScoreInput = {
  icpMatch: boolean;
  locationMatch: boolean;
  industryMatch: boolean;
  websiteOpportunity: number;
  socialActivity: number | null;
  reviewCount: number | null;
  hasEmail: boolean;
  hasPhone: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  sizeFit: boolean | null;
  buyingSignal: boolean;
  excluded: boolean;
  evidenceCount: number;
  populatedFieldCount: number;
};

export type ScoreBreakdown = {
  icpFit: number;
  locationFit: number;
  industryFit: number;
  websiteOpportunity: number;
  socialActivity: number;
  reviews: number;
  contactAvailability: number;
  verification: number;
  sizeFit: number;
  buyingSignals: number;
  exclusionPenalty: number;
  confidence: number;
  total: number;
  dataConfidence: "low" | "medium" | "high";
  explanation: string;
  ruleVersion: "phase2-v1";
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

export function calculateLeadScore(input: ScoreInput): ScoreBreakdown {
  const components = {
    icpFit: input.icpMatch ? 18 : 0,
    locationFit: input.locationMatch ? 10 : 0,
    industryFit: input.industryMatch ? 12 : 0,
    websiteOpportunity: clamp(input.websiteOpportunity, 0, 12),
    socialActivity: clamp((input.socialActivity ?? 0) / 10, 0, 8),
    reviews: clamp((input.reviewCount ?? 0) / 20, 0, 6),
    contactAvailability: (input.hasEmail ? 5 : 0) + (input.hasPhone ? 3 : 0),
    verification: (input.emailVerified ? 4 : 0) + (input.phoneVerified ? 2 : 0),
    sizeFit: input.sizeFit === true ? 8 : input.sizeFit === null ? 2 : 0,
    buyingSignals: input.buyingSignal ? 6 : 0,
    exclusionPenalty: input.excluded ? -40 : 0,
    confidence: clamp(input.evidenceCount * 2 + input.populatedFieldCount / 3, 0, 10),
  };
  const total = clamp(Object.values(components).reduce((sum, value) => sum + value, 0), 0, 100);
  const dataConfidence = components.confidence >= 8 ? "high" : components.confidence >= 4 ? "medium" : "low";
  const positive = Object.entries(components)
    .filter(([key, value]) => key !== "confidence" && key !== "exclusionPenalty" && value > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([key]) => key.replace(/([A-Z])/g, " $1").toLowerCase());

  return {
    ...components,
    total,
    dataConfidence,
    explanation: input.excluded
      ? "The lead matches an exclusion and is disqualified until reviewed."
      : `Score is driven by ${positive.join(", ") || "limited available data"}. Data confidence is ${dataConfidence}.`,
    ruleVersion: "phase2-v1",
  };
}
