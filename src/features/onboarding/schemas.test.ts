import { describe, expect, it } from "vitest";

import { goalsSchema, icpSchema } from "@/features/onboarding/schemas";

const icp = { id: "icp", name: "Jordan services", naturalLanguageDescription: "Service businesses in Jordan needing digital growth.", summary: "Jordan service businesses with a clear growth opportunity.", countries: ["Jordan"], cities: ["Amman"], industries: ["Services"], companySizes: ["2-10"], employeeMin: 2, employeeMax: 10, revenueMin: null, revenueMax: null, businessAgeMin: null, businessAgeMax: null, websiteStatuses: ["outdated"], socialActivityMin: null, reviewCountMin: null, keywords: [], excludedIndustries: [], excludedCompanies: [], minimumScore: 60, requiredContactMethods: ["email"], audienceBreadth: "balanced", isDefault: true, archived: false } as const;

describe("onboarding validation", () => {
  it("rejects inverted ICP ranges", () => {
    const result = icpSchema.safeParse({ ...icp, employeeMin: 20, employeeMax: 5 });
    expect(result.success).toBe(false);
  });

  it("rejects an end time before the start time", () => {
    const result = goalsSchema.safeParse({ leadsPerMonth: 100, messagesPerDay: 20, sendingDays: [1], startTime: "17:00", endTime: "09:00", conversionGoal: "Book calls", followUpCount: 2, minimumScore: 60, autoReplenish: false, timezone: "Asia/Amman" });
    expect(result.success).toBe(false);
  });
});
