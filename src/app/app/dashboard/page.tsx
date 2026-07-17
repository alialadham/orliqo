import { Plus } from "lucide-react";
import Link from "next/link";

import { CampaignPanel, RecommendationPanel } from "@/components/dashboard/campaign-panel";
import { MetricRail } from "@/components/dashboard/metric-rail";
import { PerformancePanel } from "@/components/dashboard/performance-panel";
import { RecentReplies } from "@/components/dashboard/recent-replies";
import { StatePanel } from "@/components/feedback/state-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getWorkspaceContext } from "@/features/workspaces/data";

export default async function DashboardPage() {
  const context = await getWorkspaceContext();
  if (!context) return null;
  if (!context.isDemo) {
    return <StatePanel variant="empty" title="Your dashboard is ready" description="Complete onboarding and create a campaign to populate workspace metrics." action={{ label: "Continue onboarding", href: "/onboarding" }} />;
  }

  const firstName = context.user.fullName.split(" ")[0] || "there";
  return (
    <div className="mx-auto max-w-[1500px] space-y-3">
      <div className="flex items-start justify-between gap-5 pb-1">
        <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-[30px] leading-9 font-bold sm:text-[32px]">Good afternoon, {firstName}</h1><Badge variant="outline" className="border-success/35 bg-card text-muted-foreground"><span className="size-2 rounded-full bg-success" />Demo data</Badge></div><p className="mt-1 text-sm text-muted-foreground sm:text-base">Here is how your outreach is performing.</p><div className="mt-4 flex items-center gap-2 lg:hidden"><Badge variant="outline" className="h-10 bg-card px-4 text-sm"><span className="size-2 rounded-full bg-success" />Demo data</Badge><Badge variant="outline" className="h-10 bg-card px-4 text-sm">{context.activeWorkspace.credits} credits</Badge></div></div>
        <Button asChild size="lg" className="hidden h-12 rounded-full shadow-lg shadow-primary/20 sm:flex lg:hidden"><Link href="/app/campaigns/new"><Plus /><span className="sr-only">New Campaign</span></Link></Button>
      </div>
      <MetricRail />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.62fr)_minmax(390px,1fr)]">
        <PerformancePanel />
        <div className="grid content-start gap-3"><CampaignPanel /><RecommendationPanel /></div>
      </div>
      <RecentReplies />
    </div>
  );
}
