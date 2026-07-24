import { Plus } from "lucide-react";
import Link from "next/link";

import {
  CampaignPanel,
  RecommendationPanel,
} from "@/components/dashboard/campaign-panel";
import { MetricRail } from "@/components/dashboard/metric-rail";
import { PerformancePanel } from "@/components/dashboard/performance-panel";
import { RecentReplies } from "@/components/dashboard/recent-replies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getWorkspaceContext } from "@/features/workspaces/data";
import { getAnalyticsSummary } from "@/features/analytics/data";
import { getInboxData } from "@/features/inbox/data";

export default async function DashboardPage() {
  const context = await getWorkspaceContext();
  if (!context) return null;
  const [analytics, inbox] = await Promise.all([
    getAnalyticsSummary(90),
    getInboxData({ folder: "all", channel: "all" }),
  ]);
  if (!analytics) return null;
  const { summary } = analytics;

  const firstName = context.user.fullName.split(" ")[0] || "there";
  return (
    <div className="mx-auto max-w-[1500px] space-y-3">
      <div className="flex items-start justify-between gap-5 pb-1">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[30px] leading-9 font-bold sm:text-[32px]">
              Good afternoon, {firstName}
            </h1>
            <Badge
              variant="outline"
              className="border-success/35 bg-card text-muted-foreground"
            >
              <span className="bg-success size-2 rounded-full" />
              Demo data
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Here is how your outreach is performing.
          </p>
          <div className="mt-4 flex items-center gap-2 lg:hidden">
            <Badge variant="outline" className="bg-card h-10 px-4 text-sm">
              <span className="bg-success size-2 rounded-full" />
              Demo data
            </Badge>
            <Badge variant="outline" className="bg-card h-10 px-4 text-sm">
              {context.activeWorkspace.credits} credits
            </Badge>
          </div>
        </div>
        <Button
          asChild
          size="lg"
          className="shadow-primary/20 hidden h-12 rounded-full shadow-lg sm:flex lg:hidden"
        >
          <Link href="/app/campaigns/new">
            <Plus />
            <span className="sr-only">New Campaign</span>
          </Link>
        </Button>
      </div>
      <MetricRail
        current={summary.current}
        previous={summary.previous}
        rows={summary.rows}
      />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.62fr)_minmax(390px,1fr)]">
        <PerformancePanel
          rows={summary.rows}
          timezone={context.isDemo ? "Asia/Amman" : "UTC"}
          demo={context.isDemo}
        />
        <div className="grid content-start gap-3">
          <CampaignPanel />
          <RecommendationPanel
            recommendations={summary.recommendations.slice(0, 1)}
            insufficient={summary.insufficientRecommendations}
          />
        </div>
      </div>
      <RecentReplies replies={inbox.conversations.slice(0, 5)} />
    </div>
  );
}
