import { businessExtractionJsonSchema, businessExtractionSchema, type AiProvider, type AiProviderName } from "@/features/ai/providers/types";
import { fetchAiWithRetry } from "@/features/ai/providers/http";

type CompatibleConfig = {
  name: Extract<AiProviderName, "groq" | "openrouter">;
  baseUrl: string;
  apiKey: string;
  model: string;
};

type CompatibleResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export function createOpenAiCompatibleProvider(config: CompatibleConfig): AiProvider {
  const configured = Boolean(config.apiKey && config.model);
  return {
    name: config.name,
    configured,
    model: config.model || "unconfigured",
    async testConnection() {
      if (!configured) return { ok: false, checkedAt: new Date().toISOString(), errorCode: "NOT_CONFIGURED" };
      try {
        const response = await fetch(`${config.baseUrl}/models`, { headers: { Authorization: `Bearer ${config.apiKey}` }, signal: AbortSignal.timeout(5_000) });
        return { ok: response.ok, checkedAt: new Date().toISOString(), errorCode: response.ok ? undefined : `HTTP_${response.status}` };
      } catch {
        return { ok: false, checkedAt: new Date().toISOString(), errorCode: "CONNECTION_FAILED" };
      }
    },
    async extractBusinessContext(input) {
      if (!configured) throw new Error(`${config.name} is not configured.`);
      const response = await fetchAiWithRetry(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          temperature: 0,
          messages: [
            { role: "system", content: "Extract only facts supported by the supplied public website text. Use empty arrays rather than inventing details. Return JSON only." },
            { role: "user", content: `Source: ${input.sourceUrl}\n\n${input.content}` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "business_context", strict: false, schema: businessExtractionJsonSchema } },
        }),
      });
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        throw new Error(`${config.name} request failed (${response.status})${retryable ? " and may be retried" : ""}.`);
      }
      const payload = (await response.json()) as CompatibleResponse;
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error(`${config.name} returned no structured content.`);
      const data = businessExtractionSchema.parse(JSON.parse(content));
      return {
        data,
        provider: config.name,
        model: config.model,
        promptVersion: input.promptVersion,
        usage: { inputTokens: payload.usage?.prompt_tokens ?? null, outputTokens: payload.usage?.completion_tokens ?? null },
      };
    },
  };
}
