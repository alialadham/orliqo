import { ArrowLeft, Construction, FlaskConical } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { StatePanel } from "@/components/feedback/state-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPermission, type Permission } from "@/features/permissions/permissions";
import { getWorkspaceContext } from "@/features/workspaces/data";

type RouteDetail = { title: string; description: string; phase: string; permission?: Permission };

const routes: Record<string, RouteDetail> = {
  campaigns: { title: "Campaigns", description: "Campaign creation, approval, launch, pause, and kill controls are implemented in Phase 3.", phase: "Phase 3", permission: "campaign:view" },
  leads: { title: "Leads", description: "Qualified leads, evidence, notes, scoring, saved views, and imports are implemented in Phase 2.", phase: "Phase 2", permission: "lead:view" },
  discovery: { title: "Discovery", description: "Evidence-backed research and deterministic fixtures are connected to this route in Phase 2.", phase: "Phase 2", permission: "lead:view" },
  queue: { title: "Outreach Queue", description: "Approval, durable scheduling, suppression, and atomic send claims are implemented in Phase 3.", phase: "Phase 3", permission: "message:approve" },
  inbox: { title: "Inbox", description: "Provider sync, reply classification, suggestions, and response workflows are implemented in Phase 5.", phase: "Phase 5", permission: "inbox:view" },
  calendar: { title: "Calendar", description: "Meeting and Google Calendar workflows are implemented with provider adapters in Phases 4 and 5.", phase: "Phase 4", permission: "inbox:view" },
  analytics: { title: "Analytics", description: "Attribution, recommendations, and replenishment reporting are implemented in Phase 7.", phase: "Phase 7", permission: "analytics:view" },
  templates: { title: "Templates", description: "Grounded reusable email and WhatsApp templates are implemented in Phase 3.", phase: "Phase 3", permission: "message:generate" },
  integrations: { title: "Integrations", description: "Gmail, Microsoft Graph, WhatsApp Cloud API, Calendar, and optional email adapters remain in sandbox until Phase 4 validation.", phase: "Phase 4", permission: "integrations:view" },
  billing: { title: "Billing", description: "Stripe Checkout, Customer Portal, entitlements, and usage reconciliation are implemented in test mode in Phase 6.", phase: "Phase 6", permission: "billing:view" },
  settings: { title: "Settings", description: "Workspace, branding, AI, sending, compliance, team, and security settings are delivered across their dependent phases.", phase: "Phases 2-8", permission: "settings:manage" },
};

export default async function ProductPlaceholderPage({ params, searchParams }: { params: Promise<{ path?: string[] }>; searchParams: Promise<{ state?: string }> }) {
  const { path = [] } = await params;
  const query = await searchParams;
  if (!path.length) redirect("/app/dashboard");

  const context = await getWorkspaceContext();
  if (!context) return null;
  const section = path[0] ?? "";
  const detail = routes[section];
  if (!detail) return <StatePanel variant="missing" title="Page not found" description="This route is not part of the active Orliqo workspace." action={{ label: "Go to dashboard", href: "/app/dashboard" }} />;
  if (detail.permission && !hasPermission(context.activeWorkspace.role, detail.permission)) return <StatePanel variant="permission" title="Permission required" description={`Your ${context.activeWorkspace.role.replaceAll("_", " ")} role cannot access ${detail.title.toLowerCase()} in this workspace. Permission checks are enforced on the server.`} action={{ label: "Go to dashboard", href: "/app/dashboard" }} />;
  if (query.state === "plan-limit") return <StatePanel variant="plan" title="Plan limit reached" description="This simulated limit surface blocks the action until usage resets or an authorized owner upgrades the workspace." action={{ label: "View billing", href: "/app/billing" }} />;
  if (query.state === "error") return <StatePanel variant="error" title="This demo request failed safely" description="No provider action ran. Return to the dashboard and retry from a validated workflow." action={{ label: "Return to dashboard", href: "/app/dashboard" }} />;

  const isNewCampaign = section === "campaigns" && path[1] === "new";
  const title = isNewCampaign ? "New campaign" : detail.title;
  return (
    <div className="mx-auto max-w-4xl py-4 sm:py-8">
      <Badge variant="outline" className="bg-card"><FlaskConical className="size-3" />Sandbox foundation</Badge>
      <div className="mt-6 rounded-xl border bg-card p-7 sm:p-10"><span className="grid size-11 place-items-center rounded-lg border bg-muted"><Construction className="size-5 text-muted-foreground" /></span><p className="mt-8 text-sm font-semibold text-primary">{detail.phase}</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{detail.description}</p><p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">The protected route, workspace context, responsive shell, demo safety label, and server role gate are active now. No provider is presented as connected or live.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild><Link href="/app/dashboard"><ArrowLeft data-icon="inline-start" />Back to dashboard</Link></Button>{section !== "campaigns" ? <Button asChild variant="outline"><Link href="/app/campaigns">View campaign foundation</Link></Button> : null}</div></div>
    </div>
  );
}
