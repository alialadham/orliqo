import { describe, expect, it } from "vitest";

import {
  simulateAiMessage,
  simulateEmailPreview,
  simulateInboundReply,
  simulateResearch,
  simulateStripeTestUpgrade,
  simulateWhatsAppNoSend,
} from "@/features/providers/demo-simulators";

describe("provider simulators", () => {
  it("never reports delivery", () => {
    const results = [
      simulateResearch(5),
      simulateAiMessage({ company: "Demo Studio", evidence: "the fixture website is slow" }),
      simulateEmailPreview({ to: "contact@example.invalid", subject: "Preview", body: "No send" }),
      simulateWhatsAppNoSend({ template: "demo_intro", consent: "unknown" }),
      simulateStripeTestUpgrade("growth"),
      simulateInboundReply("We are interested"),
    ];
    expect(results.every((entry) => entry.mode === "demo" && entry.delivered === false)).toBe(true);
  });

  it("classifies deterministic inbound fixtures", () => {
    expect(simulateInboundReply("Please stop contacting us").data.intent).toBe("stop_contact");
    expect(simulateInboundReply("Interested in more details").data.intent).toBe("interested");
  });
});
