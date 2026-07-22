import type { AiExtractionResult, AiProvider, BusinessExtractionInput } from "@/features/ai/providers/types";

export async function runProviderFallback(registry: AiProvider[], input: BusinessExtractionInput): Promise<AiExtractionResult> {
  const errors: string[] = [];
  for (const provider of registry) {
    if (!provider.configured) continue;
    try { return await provider.extractBusinessContext(input); }
    catch (error) { errors.push(error instanceof Error ? error.message : `${provider.name} failed`); }
  }
  throw new Error(errors.at(-1) ?? "No AI provider is available.");
}
