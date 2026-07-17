import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

const errorMessages: Record<string, string> = {
  provider_not_configured: "Provider sign-in is not configured. Use the demo workspace or email sign-in after Supabase is connected.",
  oauth_start_failed: "Provider sign-in could not start. Try again or use email sign-in.",
  oauth_callback_failed: "Provider sign-in could not be verified. Start the connection again.",
  demo_disabled: "Demo mode is disabled in this environment.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const parameters = await searchParams;
  return (
    <AuthShell variant="login">
      <LoginForm next={parameters.next} initialError={parameters.error ? errorMessages[parameters.error] : undefined} />
    </AuthShell>
  );
}
