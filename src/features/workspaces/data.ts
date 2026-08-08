import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { readDemoSession } from "@/features/auth/demo-session";
import { getCurrentUser } from "@/features/auth/session";
import { DEMO_PROFILE, DEMO_WORKSPACES } from "@/features/demo/data";
import type { WorkspaceRole } from "@/features/permissions/permissions";
import type {
  WorkspaceContext,
  WorkspaceSummary,
} from "@/features/workspaces/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ACTIVE_WORKSPACE_COOKIE = "orliqo-active-workspace";

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export const getWorkspaceContext = cache(
  async (): Promise<WorkspaceContext | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    if (user.provider === "demo") {
      const session = await readDemoSession();
      if (!session || session.kind !== "workspace") return null;

      const activeWorkspace =
        DEMO_WORKSPACES.find(
          (workspace) => workspace.id === session.activeWorkspaceId,
        ) ?? DEMO_WORKSPACES[0];

      if (!activeWorkspace) return null;

      return {
        user: {
          id: DEMO_PROFILE.id,
          email: DEMO_PROFILE.email,
          fullName: DEMO_PROFILE.fullName,
          initials: DEMO_PROFILE.initials,
        },
        activeWorkspace,
        workspaces: DEMO_WORKSPACES,
        isDemo: true,
        onboardingComplete: true,
      };
    }

    const supabase = await createServerSupabaseClient();
    const [profileResult, membershipResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("workspace_members")
        .select("workspace_id, role, status")
        .eq("user_id", user.id)
        .eq("status", "active"),
    ]);

    if (membershipResult.error || !membershipResult.data?.length) return null;

    const workspaceIds = membershipResult.data.map(
      (membership) => membership.workspace_id,
    );
    const [workspaceResult, subscriptionResult, usageResult] =
      await Promise.all([
        supabase
          .from("workspaces")
          .select("id, name, slug, status")
          .in("id", workspaceIds)
          .eq("status", "active"),
        supabase
          .from("subscriptions")
          .select("workspace_id, plan, status")
          .in("workspace_id", workspaceIds),
        supabase
          .from("usage_counters")
          .select("workspace_id, metric, used, reserved, limit_value")
          .in("workspace_id", workspaceIds)
          .eq("metric", "ai_messages"),
      ]);
    const { data: workspaceRows, error: workspaceError } = workspaceResult;

    if (workspaceError || !workspaceRows?.length) return null;

    const subscriptions = subscriptionResult.data;
    const usageCounters = usageResult.data;

    const workspaces: WorkspaceSummary[] = workspaceRows.map((workspace) => {
      const membership = membershipResult.data.find(
        (row) => row.workspace_id === workspace.id,
      );
      const subscription = subscriptions?.find(
        (row) => row.workspace_id === workspace.id,
      );
      const usage = usageCounters?.find(
        (row) => row.workspace_id === workspace.id,
      );
      return {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        role: (membership?.role ?? "viewer") as WorkspaceRole,
        plan: subscription?.plan ?? "none",
        credits:
          usage?.limit_value === null || usage?.limit_value === undefined
            ? 0
            : Math.max(0, usage.limit_value - usage.used - usage.reserved),
      };
    });

    const cookieStore = await cookies();
    const requestedWorkspaceId = cookieStore.get(
      ACTIVE_WORKSPACE_COOKIE,
    )?.value;
    const activeWorkspace =
      workspaces.find((workspace) => workspace.id === requestedWorkspaceId) ??
      workspaces[0];

    if (!activeWorkspace) return null;

    const { data: businessProfile } = await supabase
      .from("business_profiles")
      .select("onboarding_completed")
      .eq("workspace_id", activeWorkspace.id)
      .maybeSingle();

    const fullName =
      profileResult.data?.full_name ||
      user.fullName ||
      user.email.split("@")[0] ||
      "Orliqo user";

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName,
        initials: initialsFor(fullName),
      },
      activeWorkspace,
      workspaces,
      isDemo: false,
      onboardingComplete: Boolean(businessProfile?.onboarding_completed),
    };
  },
);

export async function setActiveWorkspaceCookie(
  workspaceId: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
