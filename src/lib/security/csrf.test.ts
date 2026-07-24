import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  bodyWithinLimit,
  isCsrfSafeRequest,
} from "@/lib/security/csrf";

describe("CSRF and request bounds", () => {
  it("accepts same-origin mutations", () => {
    const request = new Request("https://orliqo.example/api/imports/leads", {
      method: "POST",
      headers: {
        origin: "https://orliqo.example",
        "sec-fetch-site": "same-origin",
      },
    });
    expect(isCsrfSafeRequest(request)).toBe(true);
  });

  it("rejects cross-site and missing-origin mutations", () => {
    const crossSite = new Request(
      "https://orliqo.example/api/imports/leads",
      {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        },
      },
    );
    const missing = new Request(
      "https://orliqo.example/api/imports/leads",
      { method: "POST" },
    );
    expect(isCsrfSafeRequest(crossSite)).toBe(false);
    expect(isCsrfSafeRequest(missing)).toBe(false);
  });

  it("rejects declared request bodies above the route limit", () => {
    const request = new Request("https://orliqo.example/api", {
      method: "POST",
      headers: { "content-length": "1048577" },
    });
    expect(bodyWithinLimit(request, 1_048_576)).toBe(false);
  });
});
