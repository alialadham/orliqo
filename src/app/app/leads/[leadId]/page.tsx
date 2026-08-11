import { notFound } from "next/navigation";

import { LeadDetail } from "@/components/leads/lead-detail";
import { getLeadDetail } from "@/features/leads/data";
import { hasPermission } from "@/features/permissions/permissions";
import { getWorkspaceContext } from "@/features/workspaces/data";

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const context = await getWorkspaceContext();
  if (!context || !hasPermission(context.activeWorkspace.role, "lead:view")) return null;
  const data = await getLeadDetail(leadId);
  if (!data) notFound();
  const teammates = [{ id: context.user.id, name: context.user.fullName }];
  return <LeadDetail data={data} canUpdate={hasPermission(context.activeWorkspace.role, "lead:update")} canRestore={hasPermission(context.activeWorkspace.role, "lead:delete")} teammates={teammates} currentUserId={context.user.id} canManageAllNotes={["owner", "administrator"].includes(context.activeWorkspace.role)} />;
}
