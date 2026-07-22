import type { AiProvider } from "@/features/ai/providers/types";

export function createMockProvider(): AiProvider {
  return {
    name: "mock",
    configured: true,
    model: "deterministic-business-extractor-v1",
    async testConnection() {
      return { ok: true, checkedAt: new Date().toISOString() };
    },
    async extractBusinessContext(input) {
      const content = input.content.replace(/\s+/g, " ").trim();
      const unknown = "Not determined from the supplied website content.";
      const professionalServices = /\bprofessional services\b/i.test(content);
      return {
        provider: "mock",
        model: "deterministic-business-extractor-v1",
        promptVersion: input.promptVersion,
        usage: { inputTokens: null, outputTokens: null },
        data: {
          description: content ? content.slice(0, 1_200) : unknown,
          mainService: professionalServices ? "Professional services" : unknown,
          additionalServices: [],
          brandTone: unknown,
          targetIndustries: [],
          sellingPoints: [],
          defaultCta: unknown,
        },
      };
    },
  };
}
