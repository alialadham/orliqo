import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { getCurrentUser } from "@/features/auth/session";
import { getWorkspaceSearchRecords } from "@/features/navigation/search";
import { getUnreadNotifications } from "@/features/notifications/data";
import { getWorkspaceContext } from "@/features/workspaces/data";

export default async function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=session_expired");

  const context = await getWorkspaceContext();
  if (!context || !context.onboardingComplete) redirect("/onboarding");
  const [searchRecords, notifications] = await Promise.all([
    getWorkspaceSearchRecords(context),
    getUnreadNotifications(context),
  ]);

  return <AppShell context={context} searchRecords={searchRecords} notifications={notifications}>{children}</AppShell>;
}
