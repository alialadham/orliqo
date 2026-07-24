import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { SearchRecord } from "@/components/app/global-search";
import { DEMO_SEARCH_RECORDS } from "@/features/demo/data";
import type { WorkspaceContext } from "@/features/workspaces/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getWorkspaceSearchRecords(
  context: WorkspaceContext,
): Promise<readonly SearchRecord[]> {
  if (context.isDemo) return DEMO_SEARCH_RECORDS;

  const supabase =
    (await createServerSupabaseClient()) as unknown as SupabaseClient;
  const workspaceId = context.activeWorkspace.id;
  const [campaigns, leads] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id,name")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(12),
    supabase
      .from("leads")
      .select("id,business_name")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(18),
  ]);

  return [
    ...((campaigns.data ?? []) as Array<{ id: string; name: string }>).map((campaign) => ({
      id: campaign.id,
      type: "Campaign",
      title: campaign.name,
      href: `/app/campaigns/${campaign.id}`,
    })),
    ...((leads.data ?? []) as Array<{ id: string; business_name: string }>).map((lead) => ({
      id: lead.id,
      type: "Lead",
      title: lead.business_name,
      href: `/app/leads/${lead.id}`,
    })),
  ];
}
