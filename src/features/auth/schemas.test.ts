import { describe, expect, it } from "vitest";

import { registrationSchema } from "@/features/auth/schemas";

const validRegistration = {
  fullName: "Ali Haddad",
  email: "ali@example.invalid",
  password: "at-least-ten-characters",
  companyName: "Orliqo Demo",
  country: "Jordan",
  teamSize: "2-5",
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
});
