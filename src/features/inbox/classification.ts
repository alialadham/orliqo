import type { InboxIntent } from "./types";

export type IntentEvidence = {
  intent: InboxIntent;
  confidence: number;
  evidence: string[];
  classifierVersion: string;
};

const rules: Array<{
  intent: Exclude<InboxIntent, "unknown">;
  patterns: RegExp[];
}> = [
  {
    intent: "stop_contact",
    patterns: [
      /\b(stop|unsubscribe|remove me|do not contact|don't contact)\b/i,
      /لا (تتواصل|تراسل)|احذف رقمي/i,
    ],
  },
  {
    intent: "automatic_response",
    patterns: [/\b(automatic reply|auto-?reply|out of office|away from)\b/i],
  },
  {
    intent: "wrong_contact",
    patterns: [
      /\b(wrong (person|contact)|not (the person )?responsible|contact .+ instead)\b/i,
    ],
  },
  {
    intent: "not_interested",
    patterns: [/\b(not interested|no thank|not a priority|pass on this)\b/i],
  },
  {
    intent: "follow_up_later",
    patterns: [/\b(follow up|check back|reach out).+\b(later|next|after)\b/i],
  },
  {
    intent: "asking_price",
    patterns: [
      /\b(price|pricing|cost|quote|how much|budget)\b/i,
      /كم (السعر|التكلفة)/i,
    ],
  },
  {
    intent: "wants_information",
    patterns: [
      /\b(more information|more info|details|what does|what is included)\b/i,
    ],
  },
  {
    intent: "interested",
    patterns: [
      /\b(interested|next steps|book|schedule|let'?s talk|sounds good)\b/i,
    ],
  },
];

export function classifyInboundMessage(body: string): IntentEvidence {
  const normalized = body.trim().replace(/\s+/g, " ");
  for (const rule of rules) {
    const matches = rule.patterns
      .map((pattern) => normalized.match(pattern)?.[0])
      .filter((value): value is string => Boolean(value));
    if (matches.length)
      return {
        intent: rule.intent,
        confidence: Math.min(0.98, 0.82 + (matches.length - 1) * 0.08),
        evidence: [...new Set(matches.map((value) => value.toLowerCase()))],
        classifierVersion: "rules-2026-07-23",
      };
  }
  return {
    intent: "unknown",
    confidence: 0.4,
    evidence: [],
    classifierVersion: "rules-2026-07-23",
  };
}
