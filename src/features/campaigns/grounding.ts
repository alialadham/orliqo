import type { LeadDetailData } from "@/features/leads/types";
import { groundedMessageSchema, type GroundedMessage } from "./schemas";

export function validateGroundedMessage(value: unknown, lead: LeadDetailData): GroundedMessage {
  const parsed = groundedMessageSchema.parse(value); const allowedSources = new Set(lead.sources.map((source) => source.id));
  if (parsed.unsupportedClaims.length) throw new Error("Message contains unsupported claims.");
  if (!parsed.sourceIds.length || parsed.sourceIds.some((id) => !allowedSources.has(id))) throw new Error("Every personalized claim must use stored lead sources.");
  return parsed;
}
