import { describe, expect, it } from "vitest";

import { signDemoSessionValue, verifyDemoSessionValue, type DemoSession } from "@/features/auth/demo-session-codec";

const secret = "test-secret-that-is-long-enough-for-hmac-signing";
const session: DemoSession = {
  version: 1,
  kind: "workspace",
  userId: "00000000-0000-4000-8000-000000000001",
  activeWorkspaceId: "10000000-0000-4000-8000-000000000001",
  fullName: "Ali Haddad",
  companyName: "Orliqo Demo",
  email: "ali@example.invalid",
  issuedAt: 1_700_000_000_000,
};

describe("demo session codec", () => {
  it("round-trips a signed session", () => {
    expect(verifyDemoSessionValue(signDemoSessionValue(session, secret), secret)).toEqual(session);
  });

  it("rejects tampering and the wrong key", () => {
    const signed = signDemoSessionValue(session, secret);
    expect(verifyDemoSessionValue(`${signed}x`, secret)).toBeNull();
    expect(verifyDemoSessionValue(signed, "different-secret")).toBeNull();
  });
});
