import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { WorkspaceContext } from "@/features/workspaces/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type NotificationSummary = {
  id: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
};

export const getUnreadNotifications = cache(
  async (context: WorkspaceContext): Promise<NotificationSummary[]> => {
    if (context.isDemo)
      return [
        {
          id: "demo-replies",
          title: "3 replies need review",
          body: "Synthetic demo inbox",
          href: "/app/inbox",
          createdAt: new Date().toISOString(),
        },
      ];
    const client = (await createServerSupabaseClient()) as unknown as SupabaseClient;
    const { data } = await client
      .from("notifications")
      .select("id,title,body,action_url,created_at")
      .eq("workspace_id", context.activeWorkspace.id)
      .eq("user_id", context.user.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(5);
    return (data ?? []).map((notification) => ({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      href:
        typeof notification.action_url === "string" &&
        /^\/app(?:\/|$)/.test(notification.action_url)
          ? notification.action_url
          : "/app/dashboard",
      createdAt: notification.created_at,
    }));
  },
);
