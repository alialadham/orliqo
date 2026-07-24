import { describe, expect, it } from "vitest";

import { classifyInboundMessage } from "./classification";

describe("inbound intent classification", () => {
  it.each([
    ["Please remove me and do not contact us again.", "stop_contact"],
    ["Automatic reply: I am out of office.", "automatic_response"],
    ["I am not the person responsible for this.", "wrong_contact"],
    ["No thanks, this is not a priority.", "not_interested"],
    ["Please follow up after August.", "follow_up_later"],
    ["How much does this cost?", "asking_price"],
    ["Can you send more information?", "wants_information"],
    ["Sounds good. What are the next steps?", "interested"],
    ["Can you clarify?", "unknown"],
  ])("classifies %s", (body, intent) => {
    const result = classifyInboundMessage(body);
    expect(result.intent).toBe(intent);
    expect(result.classifierVersion).toBe("rules-2026-07-23");
    expect(result.confidence).toBeGreaterThanOrEqual(0.4);
  });

  it("gives stop-contact precedence over commercial intent", () => {
    expect(
      classifyInboundMessage("The price is fine, but do not contact me again.")
        .intent,
    ).toBe("stop_contact");
  });
});
