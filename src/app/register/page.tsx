import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Create your workspace" };

const errorMessages: Record<string, string> = {
  provider_not_configured: "Google sign-up is temporarily unavailable. Use email or try again later.",
  oauth_start_failed: "We couldn't start Google sign-up. Please try again.",
  oauth_callback_failed: "We couldn't complete Google sign-up. Please try again.",
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const parameters = await searchParams;
  return <AuthShell variant="register"><RegisterForm initialError={parameters.error ? errorMessages[parameters.error] : undefined} /></AuthShell>;
}
