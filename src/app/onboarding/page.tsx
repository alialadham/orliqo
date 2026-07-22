import { redirect } from "next/navigation";

import { BrandLockup } from "@/components/brand/brand-lockup";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/features/auth/session";
import { getOnboardingState } from "@/features/onboarding/data";
import { hasPermission } from "@/features/permissions/permissions";
import { getWorkspaceContext } from "@/features/workspaces/data";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const state = await getOnboardingState();
  if (!state) redirect("/login");
  const context = user.demoKind === "onboarding" ? null : await getWorkspaceContext();
  const canEdit = user.demoKind === "onboarding" || Boolean(context && hasPermission(context.activeWorkspace.role, "settings:manage"));

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex min-h-16 items-center justify-between bg-shell px-5 text-white sm:px-8"><BrandLockup compact /><form action={logoutAction}><Button type="submit" variant="ghost" className="text-white/75 hover:bg-white/10 hover:text-white">Sign out</Button></form></header>
      <OnboardingWizard initialState={state} canEdit={canEdit} />
    </div>
  );
}
