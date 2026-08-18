import { describe, expect, it } from "vitest";

import { registrationSchema } from "@/features/auth/schemas";

const validRegistration = {
  fullName: "Ali Haddad",
  email: "ali@example.invalid",
  password: "at-least-ten-characters",
  termsAccepted: true,
  marketingConsent: false,
} as const;

describe("registration validation", () => {
  it("accepts separate required terms and optional marketing consent", () => {
    expect(registrationSchema.safeParse(validRegistration).success).toBe(true);
  });

  it("rejects missing terms and short passwords", () => {
    expect(registrationSchema.safeParse({ ...validRegistration, termsAccepted: false }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validRegistration, password: "short" }).success).toBe(false);
  });

  it("rejects a common password without imposing composition rules", () => {
    expect(registrationSchema.safeParse({ ...validRegistration, password: "passwordpassword" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validRegistration, password: "a long passphrase made only of words" }).success).toBe(true);
  });
});
