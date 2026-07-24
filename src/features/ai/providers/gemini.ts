import { businessExtractionJsonSchema, businessExtractionSchema, type AiProvider } from "@/features/ai/providers/types";
import { fetchAiWithRetry } from "@/features/ai/providers/http";

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

export function createGeminiProvider(apiKey: string, model: string): AiProvider {
  const configured = Boolean(apiKey && model);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  return {
    name: "gemini",
    configured,
    model: model || "unconfigured",
    async testConnection() {
      if (!configured) return { ok: false, checkedAt: new Date().toISOString(), errorCode: "NOT_CONFIGURED" };
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}?key=${encodeURIComponent(apiKey)}`, { signal: AbortSignal.timeout(5_000) });
        return { ok: response.ok, checkedAt: new Date().toISOString(), errorCode: response.ok ? undefined : `HTTP_${response.status}` };
      } catch {
        return { ok: false, checkedAt: new Date().toISOString(), errorCode: "CONNECTION_FAILED" };
      }
    },
    async extractBusinessContext(input) {
      if (!configured) throw new Error("Gemini is not configured.");
      const response = await fetchAiWithRetry(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Extract only supported facts from ${input.sourceUrl}. Do not infer missing claims.\n\n${input.content}` }] }],
          generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: businessExtractionJsonSchema },
        }),
      });
      if (!response.ok) throw new Error(`Gemini request failed (${response.status}).`);
      const payload = (await response.json()) as GeminiResponse;
      const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
      if (!content) throw new Error("Gemini returned no structured content.");
      return {
        data: businessExtractionSchema.parse(JSON.parse(content)),
        provider: "gemini",
        model,
        promptVersion: input.promptVersion,
        usage: { inputTokens: payload.usageMetadata?.promptTokenCount ?? null, outputTokens: payload.usageMetadata?.candidatesTokenCount ?? null },
      };
    },
  };
}
