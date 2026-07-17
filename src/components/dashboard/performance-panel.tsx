"use client";

import dynamic from "next/dynamic";
import { CalendarDays, Info } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardRange } from "@/components/dashboard/dashboard-chart";
import { cn } from "@/lib/utils";

const DashboardChart = dynamic(
  () => import("@/components/dashboard/dashboard-chart").then((module) => module.DashboardChart),
  { loading: () => <Skeleton className="h-[300px] w-full" /> },
);

const ranges: readonly DashboardRange[] = ["7D", "30D", "90D"];
const legend = [
  ["Sent", "bg-chart-1"],
  ["Delivered", "bg-chart-2"],
  ["Replied", "bg-chart-3"],
  ["Positive", "bg-chart-4"],
] as const;

export function PerformancePanel() {
  const [range, setRange] = useState<DashboardRange>("7D");
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="performance-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="performance-title" className="flex items-center gap-2 text-lg font-bold">Outreach performance <Info className="size-4 text-muted-foreground" aria-label="Synthetic activity in the workspace time zone" /></h2>
        <div className="flex items-center self-start overflow-hidden rounded-lg border" aria-label="Chart date range">
          {ranges.map((item) => <Button key={item} type="button" variant="ghost" size="sm" aria-pressed={range === item} onClick={() => setRange(item)} className={cn("rounded-none border-r px-4 last:border-r-0", range === item && "bg-card ring-1 ring-inset ring-primary text-primary hover:bg-card")}>{item}</Button>)}
          <Button type="button" variant="ghost" size="icon-sm" className="rounded-none" aria-label="Custom range is available in analytics"><CalendarDays /></Button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {legend.map(([label, color]) => <span key={label} className="flex items-center gap-2"><span className={cn("size-2.5 rounded-full", color)} />{label}</span>)}
      </div>
      <DashboardChart range={range} />
      <p className="mt-1 text-[11px] text-muted-foreground">All times shown in your local time (GMT+3). Chart uses synthetic demo events.</p>
      <p className="sr-only" aria-live="polite">Showing {range} outreach performance. Sent and delivered trend upward, with 45 replies in the latest seven-day fixture.</p>
    </section>
  );
}
