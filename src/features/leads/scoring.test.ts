import { describe, expect, it } from "vitest";

import { calculateLeadScore } from "@/features/leads/scoring";

const baseline = { icpMatch: false, locationMatch: false, industryMatch: false, websiteOpportunity: 0, socialActivity: null, reviewCount: null, hasEmail: false, hasPhone: false, emailVerified: false, phoneVerified: false, sizeFit: null, buyingSignal: false, excluded: false, evidenceCount: 0, populatedFieldCount: 0 };

describe("lead scoring", () => {
  it("keeps scores within 0–100", () => {
    expect(calculateLeadScore(baseline).total).toBeGreaterThanOrEqual(0);
    expect(calculateLeadScore({ ...baseline, icpMatch: true, locationMatch: true, industryMatch: true, websiteOpportunity: 999, socialActivity: 999, reviewCount: 9999, hasEmail: true, hasPhone: true, emailVerified: true, phoneVerified: true, sizeFit: true, buyingSignal: true, evidenceCount: 99, populatedFieldCount: 99 }).total).toBe(100);
  });

  it("applies exclusions and lowers confidence for missing data", () => {
    const score = calculateLeadScore({ ...baseline, icpMatch: true, industryMatch: true, excluded: true });
    expect(score.exclusionPenalty).toBe(-40);
    expect(score.dataConfidence).toBe("low");
    expect(score.explanation).toContain("exclusion");
  });
});
