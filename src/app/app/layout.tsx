import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { getCurrentUser } from "@/features/auth/session";
import { getWorkspaceContext } from "@/features/workspaces/data";

export default async function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await getWorkspaceContext();
  if (!context || !context.onboardingComplete) redirect("/onboarding");

  return <AppShell context={context}>{children}</AppShell>;
}
