import { describe, expect, it } from "vitest";

import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
} from "@/lib/security/headers";

describe("security headers", () => {
  it("uses a nonce and production-only HTTPS enforcement", () => {
    const policy = buildContentSecurityPolicy("phase8-nonce", true);
    expect(policy).toContain("script-src 'self' 'nonce-phase8-nonce'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("applies the complete response header set", () => {
    const headers = new Headers();
    applySecurityHeaders(headers, "default-src 'self'", true);
    expect(headers.get("content-security-policy")).toBe("default-src 'self'");
    expect(headers.get("strict-transport-security")).toContain(
      "includeSubDomains",
    );
    expect(headers.get("cross-origin-opener-policy")).toBe("same-origin");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
  });
});
