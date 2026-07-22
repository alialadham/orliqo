import { LeadImport } from "@/components/leads/lead-import";
import { StatePanel } from "@/components/feedback/state-panel";
import { hasPermission } from "@/features/permissions/permissions";
import { getWorkspaceContext } from "@/features/workspaces/data";

export default async function LeadImportPage() {
  const context = await getWorkspaceContext();
  if (!context) return null;
  if (!hasPermission(context.activeWorkspace.role, "lead:create")) return <StatePanel variant="permission" title="Import permission required" description="Your workspace role can view leads but cannot create or import them." action={{ label: "Return to leads", href: "/app/leads" }} />;
  return <LeadImport />;
}
