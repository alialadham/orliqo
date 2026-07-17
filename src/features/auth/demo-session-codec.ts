import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

export const demoSessionSchema = z.object({
  version: z.literal(1),
  kind: z.enum(["workspace", "onboarding"]),
  userId: z.string().uuid(),
  activeWorkspaceId: z.string().uuid(),
  fullName: z.string().min(1),
  companyName: z.string().min(1),
  email: z.string().email(),
  issuedAt: z.number().int().positive(),
});

export type DemoSession = z.infer<typeof demoSessionSchema>;

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signDemoSessionValue(session: DemoSession, secret: string): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyDemoSessionValue(value: string | undefined, secret: string): DemoSession | null {
  if (!value) return null;

  const [payload, suppliedSignature] = value.split(".");
  if (!payload || !suppliedSignature) return null;

  const expectedSignature = signature(payload, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);

  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    return demoSessionSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}
