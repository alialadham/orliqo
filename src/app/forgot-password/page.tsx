import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/recovery-form";

export const metadata: Metadata = { title: "Forgot password", referrer: "no-referrer" };

export default function ForgotPasswordPage() {
  return <AuthShell variant="login"><ForgotPasswordForm /></AuthShell>;
}
