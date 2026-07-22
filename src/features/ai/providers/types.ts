import { z } from "zod";

export const businessExtractionSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  mainService: z.string().trim().min(1).max(300),
  additionalServices: z.array(z.string().trim().min(1).max(300)).max(12),
  brandTone: z.string().trim().min(1).max(100),
  targetIndustries: z.array(z.string().trim().min(1).max(150)).max(12),
  sellingPoints: z.array(z.string().trim().min(1).max(300)).max(12),
  defaultCta: z.string().trim().min(1).max(200),
});

export type BusinessExtraction = z.infer<typeof businessExtractionSchema>;
export type AiProviderName = "gemini" | "groq" | "openrouter" | "mock";

export type AiUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
};

export type AiExtractionResult = {
  data: BusinessExtraction;
  provider: AiProviderName;
  model: string;
  promptVersion: string;
  usage: AiUsage;
};

export type BusinessExtractionInput = {
  sourceUrl: string;
  content: string;
  promptVersion: string;
};

export type AiProvider = {
  name: AiProviderName;
  configured: boolean;
  model: string;
  testConnection(): Promise<{ ok: boolean; checkedAt: string; errorCode?: string }>;
  extractBusinessContext(input: BusinessExtractionInput): Promise<AiExtractionResult>;
};

export const businessExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    description: { type: "string" },
    mainService: { type: "string" },
    additionalServices: { type: "array", items: { type: "string" } },
    brandTone: { type: "string" },
    targetIndustries: { type: "array", items: { type: "string" } },
    sellingPoints: { type: "array", items: { type: "string" } },
    defaultCta: { type: "string" },
  },
  required: ["description", "mainService", "additionalServices", "brandTone", "targetIndustries", "sellingPoints", "defaultCta"],
} as const;
