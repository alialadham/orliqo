import { describe, expect, it, vi } from "vitest";

import { runProviderFallback } from "@/features/ai/providers/fallback";
import { createMockProvider } from "@/features/ai/providers/mock";
import { businessExtractionSchema, type AiProvider } from "@/features/ai/providers/types";

describe("AI provider contracts", () => {
  it("validates structured extraction output", () => {
    expect(businessExtractionSchema.safeParse({ description: "Supported summary", mainService: "Consulting", additionalServices: [], brandTone: "Professional", targetIndustries: [], sellingPoints: [], defaultCta: "Book a call" }).success).toBe(true);
    expect(businessExtractionSchema.safeParse({ description: "Missing fields" }).success).toBe(false);
  });

  it("falls back after a configured provider failure", async () => {
    const failing: AiProvider = { name: "gemini", configured: true, model: "test", testConnection: vi.fn(), extractBusinessContext: vi.fn().mockRejectedValue(new Error("rate limited")) };
    const result = await runProviderFallback([failing, createMockProvider()], { sourceUrl: "https://example.com", content: "Public service information", promptVersion: "phase2-v1" });
    expect(result.provider).toBe("mock");
    expect(failing.extractBusinessContext).toHaveBeenCalledOnce();
  });
});
