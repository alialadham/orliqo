import { z } from "zod";

import { DEMO_LEADS } from "@/features/demo/data";

export type SimulatorResult<T> = {
  mode: "demo";
  delivered: false;
  fixtureId: string;
  data: T;
};

function result<T>(fixtureId: string, data: T): SimulatorResult<T> {
  return { mode: "demo", delivered: false, fixtureId, data };
}

export function simulateResearch(limit = 10) {
  const boundedLimit = Math.max(1, Math.min(limit, DEMO_LEADS.length));
  return result("research-v1", DEMO_LEADS.slice(0, boundedLimit));
}

export function simulateAiMessage(input: { company: string; evidence: string }) {
  const parsed = z.object({ company: z.string().min(1), evidence: z.string().min(1) }).parse(input);
  return result("ai-message-v1", {
    subject: `${parsed.company} - a relevant website audit idea`,
    body: `I noticed ${parsed.evidence}. This deterministic preview requires approval and cannot be sent.`,
    groundedFacts: [parsed.evidence],
  });
}

export function simulateEmailPreview(input: { to: string; subject: string; body: string }) {
  const parsed = z.object({ to: z.string().email(), subject: z.string().min(1), body: z.string().min(1) }).parse(input);
  return result("email-preview-v1", { ...parsed, providerStatus: "PREVIEW_ONLY" as const });
}

export function simulateWhatsAppNoSend(input: { template: string; consent: "opted_in" | "unknown" }) {
  const parsed = z.object({ template: z.string().min(1), consent: z.enum(["opted_in", "unknown"]) }).parse(input);
  return result("whatsapp-no-send-v1", { ...parsed, providerStatus: "NO_SEND" as const });
}

export function simulateStripeTestUpgrade(plan: "starter" | "growth" | "agency") {
  return result("stripe-test-v1", { plan, livemode: false, status: "test_checkout_preview" as const });
}

export function simulateInboundReply(body: string) {
  const normalized = body.trim().toLowerCase();
  const intent = normalized.includes("stop")
    ? "stop_contact"
    : normalized.includes("interested")
      ? "interested"
      : normalized.includes("later")
        ? "follow_up_later"
        : "unknown";
  return result("inbound-reply-v1", { body, intent });
}
