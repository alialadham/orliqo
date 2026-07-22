import "server-only";

import { createGeminiProvider } from "@/features/ai/providers/gemini";
import { runProviderFallback } from "@/features/ai/providers/fallback";
import { createMockProvider } from "@/features/ai/providers/mock";
import { createOpenAiCompatibleProvider } from "@/features/ai/providers/openai-compatible";
import type { AiExtractionResult, AiProvider, AiProviderName, BusinessExtractionInput } from "@/features/ai/providers/types";
import { getServerEnvironment } from "@/lib/env";

function providers(): Record<AiProviderName, AiProvider> {
  const environment = getServerEnvironment();
  return {
    gemini: createGeminiProvider(environment.GEMINI_API_KEY ?? "", environment.GEMINI_MODEL ?? ""),
    groq: createOpenAiCompatibleProvider({ name: "groq", baseUrl: "https://api.groq.com/openai/v1", apiKey: environment.GROQ_API_KEY ?? "", model: environment.GROQ_MODEL ?? "" }),
    openrouter: createOpenAiCompatibleProvider({ name: "openrouter", baseUrl: "https://openrouter.ai/api/v1", apiKey: environment.OPENROUTER_API_KEY ?? "", model: environment.OPENROUTER_MODEL ?? "" }),
    mock: createMockProvider(),
  };
}

export async function extractBusinessContextWithFallback(input: Omit<BusinessExtractionInput, "promptVersion">): Promise<AiExtractionResult> {
  const environment = getServerEnvironment();
  const registry = providers();
  const configuredOrder = [environment.AI_PRIMARY_PROVIDER, ...environment.AI_FALLBACK_PROVIDERS.split(",").map((value) => value.trim())]
    .filter((value): value is AiProviderName => value in registry);
  const order = [...new Set([...configuredOrder, "mock" as const])];
  return runProviderFallback(order.map((name) => registry[name]), { ...input, promptVersion: environment.AI_PROMPT_VERSION });
}

export function getAiProviderReadiness(): Array<{ provider: AiProviderName; configured: boolean; model: string }> {
  return Object.values(providers()).map((provider) => ({ provider: provider.name, configured: provider.configured, model: provider.model }));
}
