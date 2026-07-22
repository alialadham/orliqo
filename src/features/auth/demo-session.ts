import "server-only";

import { cookies } from "next/headers";

import {
  signDemoSessionValue,
  verifyDemoSessionValue,
  type DemoSession,
} from "@/features/auth/demo-session-codec";
import { DEMO_USER_ID, DEMO_WORKSPACE_ID } from "@/features/demo/data";
import { resetDemoOnboarding } from "@/features/demo/phase2-store";
import { getServerEnvironment } from "@/lib/env";

export const DEMO_SESSION_COOKIE = "orliqo-demo-session";

function sessionSecret(): string {
  const environment = getServerEnvironment();
  return (
    environment.DEMO_SESSION_SECRET ||
    "orliqo-local-demo-session-secret-change-before-production"
  );
}

async function writeDemoSession(session: DemoSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEMO_SESSION_COOKIE, signDemoSessionValue(session, sessionSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function createDemoWorkspaceSession(): Promise<void> {
  await writeDemoSession({
    version: 1,
    kind: "workspace",
    userId: DEMO_USER_ID,
    activeWorkspaceId: DEMO_WORKSPACE_ID,
    fullName: "Ali Haddad",
    companyName: "Orliqo Demo",
    email: "ali.haddad@example.invalid",
    issuedAt: Date.now(),
  });
}

export async function createDemoOnboardingSession(input: {
  fullName: string;
  companyName: string;
  email: string;
}): Promise<void> {
  resetDemoOnboarding(DEMO_WORKSPACE_ID, input.companyName);
  await writeDemoSession({
    version: 1,
    kind: "onboarding",
    userId: DEMO_USER_ID,
    activeWorkspaceId: DEMO_WORKSPACE_ID,
    fullName: input.fullName,
    companyName: input.companyName,
    email: input.email,
    issuedAt: Date.now(),
  });
}

export async function readDemoSession(): Promise<DemoSession | null> {
  const cookieStore = await cookies();
  return verifyDemoSessionValue(cookieStore.get(DEMO_SESSION_COOKIE)?.value, sessionSecret());
}

export function readDemoSessionFromRequest(request: Request): DemoSession | null {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${DEMO_SESSION_COOKIE}=`));
  return verifyDemoSessionValue(cookie ? decodeURIComponent(cookie.slice(DEMO_SESSION_COOKIE.length + 1)) : undefined, sessionSecret());
}

export async function setDemoActiveWorkspace(workspaceId: string): Promise<void> {
  const current = await readDemoSession();
  if (!current || current.kind !== "workspace") return;
  await writeDemoSession({ ...current, activeWorkspaceId: workspaceId, issuedAt: Date.now() });
}

export async function clearDemoSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_SESSION_COOKIE);
}
