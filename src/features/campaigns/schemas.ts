import { z } from "zod";
import { outreachChannels } from "./types";

export const campaignInputSchema = z.object({
  name: z.string().trim().min(3).max(160), description: z.string().trim().max(1000).default(""),
  goal: z.enum(["sell_service", "appointments", "promote_product", "free_audit", "partnership", "custom"]),
  customGoal: z.string().trim().max(300).default(""),
  audienceSource: z.enum(["saved", "custom", "csv", "ai_recommended"]), targetProspectCount: z.coerce.number().int().min(1).max(5000),
  leadIds: z.array(z.string().uuid()).max(5000).default([]),
  channels: z.array(z.enum(outreachChannels)).min(1), mainOffer: z.string().trim().min(3).max(500), mainCta: z.string().trim().min(2).max(200),
  tone: z.enum(["professional", "friendly", "direct", "consultative", "luxury", "custom"]), language: z.string().trim().min(2).max(40),
  customTone: z.string().trim().max(200).default(""),
  personalizationDepth: z.enum(["light", "standard", "deep"]), followUpCount: z.coerce.number().int().min(0).max(10),
  startAt: z.string().datetime(), sendingDays: z.array(z.coerce.number().int().min(0).max(6)).min(1),
  sendWindowStart: z.string().regex(/^\d{2}:\d{2}$/), sendWindowEnd: z.string().regex(/^\d{2}:\d{2}$/), timezone: z.string().min(3).max(80),
  dailyLimit: z.coerce.number().int().min(1).max(1000), monthlyLimit: z.coerce.number().int().min(1).max(100000),
  minIntervalMinutes: z.coerce.number().int().min(1).max(1440), maxIntervalMinutes: z.coerce.number().int().min(1).max(1440),
  stopOnReply: z.boolean(), autoReplenish: z.boolean(), replenishThreshold: z.coerce.number().int().min(0).max(5000),
  replenishCount: z.coerce.number().int().min(0).max(1000), replenishMinimumScore: z.coerce.number().int().min(0).max(100), replenishRequireApproval: z.boolean(),
}).superRefine((value, ctx) => {
  if (value.maxIntervalMinutes < value.minIntervalMinutes) ctx.addIssue({ code: "custom", path: ["maxIntervalMinutes"], message: "Maximum interval must be at least the minimum." });
  if (value.sendWindowEnd <= value.sendWindowStart) ctx.addIssue({ code: "custom", path: ["sendWindowEnd"], message: "Send window must end after it starts." });
  if (value.goal === "custom" && value.customGoal.length < 3) ctx.addIssue({ code: "custom", path: ["customGoal"], message: "Describe the custom goal." });
  if (value.tone === "custom" && value.customTone.length < 3) ctx.addIssue({ code: "custom", path: ["customTone"], message: "Describe the custom tone." });
});
export type CampaignInput = z.infer<typeof campaignInputSchema>;

export const groundedMessageSchema = z.object({ subject: z.string().trim().max(200).nullable(), body: z.string().trim().min(1).max(4000), verifiedFactsUsed: z.array(z.string().min(1)).max(12), sourceIds: z.array(z.string().min(1)).max(12), personalizationSummary: z.string().min(1).max(500), riskFlags: z.array(z.string()).max(12), unsupportedClaims: z.array(z.string()).max(12), recommendedChannel: z.enum(outreachChannels), confidence: z.number().min(0).max(1) });
export type GroundedMessage = z.infer<typeof groundedMessageSchema>;
