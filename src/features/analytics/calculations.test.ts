import { describe, expect, it } from "vitest";

import {
  analyticsSummary,
  buildRecommendations,
  conversionRate,
  sumAnalytics,
} from "./calculations";
import type { AnalyticsRow } from "./types";

function row(overrides: Partial<AnalyticsRow> = {}): AnalyticsRow {
  return {
    date: "2026-07-23",
    campaignId: "campaign-1",
    campaignName: "Campaign",
    channel: "email",
    industry: "Photography",
    country: "Jordan",
    template: "Audit opener",
    cta: "Reply for audit",
    sendHour: 10,
    followUpStep: 1,
    discovered: 20,
    qualified: 16,
    approved: 14,
    contacted: 12,
    sent: 12,
    delivered: 11,
    opened: 8,
    read: 0,
    replied: 4,
    positive: 3,
    meetings: 1,
    conversions: 0,
    cost: 24,
    revenue: 0,
    ...overrides,
  };
}

describe("analytics calculations", () => {
  it("sums records once and calculates rates safely", () => {
    expect(sumAnalytics([row(), row({ sent: 8 })])).toMatchObject({
      discovered: 40,
      sent: 20,
      positive: 6,
      cost: 48,
    });
    expect(conversionRate(3, 12)).toBe(25);
    expect(conversionRate(0, 0)).toBe(0);
  });

  it("withholds recommendations below the sample threshold", () => {
    expect(buildRecommendations([row({ sent: 5 })])).toEqual([]);
  });

  it("returns evidence and confidence for supported recommendations", () => {
    const recommendations = buildRecommendations([row()]);
    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "opener",
          sampleSize: 12,
          confidence: "medium",
        }),
      ]),
    );
    expect(recommendations[0]?.evidence).toContain("from 12 sent");
  });

  it("compares current and previous periods without mixing boundaries", () => {
    const summary = analyticsSummary(
      [
        row({ date: "2026-07-23", sent: 12 }),
        row({ date: "2026-07-15", sent: 7 }),
      ],
      "2026-07-20",
      "2026-07-13",
    );
    expect(summary.current.sent).toBe(12);
    expect(summary.previous.sent).toBe(7);
  });
});
