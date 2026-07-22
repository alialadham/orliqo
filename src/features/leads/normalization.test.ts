import { describe, expect, it } from "vitest";

import { leadFingerprints, normalizeEmail, normalizePhone, normalizeSuppressionValue, normalizeUrl } from "@/features/leads/normalization";

describe("lead normalization", () => {
  it("normalizes public URLs and contact values", () => {
    expect(normalizeUrl("WWW.Example.com/path/")).toBe("https://example.com/path");
    expect(normalizeEmail(" Sales@Example.COM ")).toBe("sales@example.com");
    expect(normalizePhone("079 123 4567")).toBe("+962791234567");
    expect(normalizeSuppressionValue("domain", "https://www.Example.com/about")).toBe("example.com");
  });

  it("creates matching fingerprints for equivalent leads", () => {
    const first = leadFingerprints({ businessName: "Cedar Studio", city: "Amman", websiteUrl: "https://www.example.com", email: "Hi@Example.com" });
    const second = leadFingerprints({ businessName: "cedar studio", city: "amman", websiteUrl: "example.com", email: "hi@example.com" });
    expect(first.domain).toBe(second.domain);
    expect(first.email).toBe(second.email);
    expect(first.businessCity).toBe(second.businessCity);
  });
});
