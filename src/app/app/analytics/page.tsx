import { AnalyticsView } from "@/components/analytics/analytics-view";
import { StatePanel } from "@/components/feedback/state-panel";
import { getAnalyticsSummary } from "@/features/analytics/data";
import { hasPermission } from "@/features/permissions/permissions";
import { getWorkspaceContext } from "@/features/workspaces/data";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const context = await getWorkspaceContext();
  if (!context) return null;
  if (!hasPermission(context.activeWorkspace.role, "analytics:view"))
    return (
      <StatePanel
        variant="permission"
        title="Analytics permission required"
        description="Your workspace role cannot view analytics."
        action={{ label: "Go to dashboard", href: "/app/dashboard" }}
      />
    );
  const { range } = await searchParams;
  const rangeDays = range === "7" ? 7 : range === "90" ? 90 : 30;
  const data = await getAnalyticsSummary(rangeDays);
  if (!data) return null;
  return (
    <AnalyticsView
      summary={data.summary}
      rangeDays={rangeDays}
      demo={context.isDemo}
    />
  );
}
