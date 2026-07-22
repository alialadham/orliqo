import "server-only";

import { extractBusinessContextWithFallback } from "@/features/ai/providers";
import type { WebsiteImportResult, WebsiteSuggestion } from "@/features/onboarding/types";

export async function buildWebsiteImportResult(input: {
  importId: string;
  sourceUrl: string;
  content: string;
  retrievedAt: string;
}): Promise<{ result: WebsiteImportResult; usage: { inputTokens: number | null; outputTokens: number | null } }> {
  const extraction = await extractBusinessContextWithFallback({ sourceUrl: input.sourceUrl, content: input.content });
  const values: Array<[WebsiteSuggestion["field"], string | string[]]> = [
    ["description", extraction.data.description],
    ["mainService", extraction.data.mainService],
    ["additionalServices", extraction.data.additionalServices],
    ["brandTone", extraction.data.brandTone],
    ["targetIndustries", extraction.data.targetIndustries],
    ["sellingPoints", extraction.data.sellingPoints],
    ["defaultCta", extraction.data.defaultCta],
  ];
  const suggestions = values
    .filter(([, value]) => Array.isArray(value) ? value.length > 0 : !value.startsWith("Not determined"))
    .map(([field, value]): WebsiteSuggestion => ({
      id: crypto.randomUUID(),
      field,
      value,
      sourceUrl: input.sourceUrl,
      retrievedAt: input.retrievedAt,
      confidence: "likely",
      decision: "pending",
    }));

  return {
    result: {
      id: input.importId,
      normalizedUrl: input.sourceUrl,
      provider: extraction.provider,
      model: extraction.model,
      promptVersion: extraction.promptVersion,
      suggestions,
    },
    usage: extraction.usage,
  };
}
