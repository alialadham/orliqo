import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

const errorMessages: Record<string, string> = {
  provider_not_configured: "Google sign-in is temporarily unavailable. Use email sign-in or try again later.",
  oauth_start_failed: "We couldn't start Google sign-in. Please try again.",
  oauth_callback_failed: "We couldn't complete Google sign-in. Please try again.",
  confirmation_failed: "This confirmation link is invalid or expired. Request a new one.",
  session_expired: "Your session expired. Sign in again to continue.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const parameters = await searchParams;
  return (
    <AuthShell variant="login">
      <LoginForm next={parameters.next} initialError={parameters.error ? errorMessages[parameters.error] : undefined} />
    </AuthShell>
  );
}
