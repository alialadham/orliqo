import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/recovery-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return <AuthShell variant="login"><ResetPasswordForm /></AuthShell>;
}
