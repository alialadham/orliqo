"use client";

import dynamic from "next/dynamic";
import { CalendarDays, Info } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { DashboardRange } from "@/components/dashboard/dashboard-chart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsRow } from "@/features/analytics/types";
import { cn } from "@/lib/utils";

const DashboardChart = dynamic(
  () =>
    import("@/components/dashboard/dashboard-chart").then(
      (module) => module.DashboardChart,
    ),
  { loading: () => <Skeleton className="h-[300px] w-full" /> },
);

const ranges: readonly DashboardRange[] = ["7D", "30D", "90D"];
const legend = [
  ["Sent", "bg-chart-1"],
  ["Delivered", "bg-chart-2"],
  ["Opened", "bg-chart-5"],
  ["Read", "bg-chart-2"],
  ["Replied", "bg-chart-3"],
  ["Positive", "bg-chart-4"],
] as const;

export function PerformancePanel({
  rows,
  timezone,
  demo,
}: {
  rows: readonly AnalyticsRow[];
  timezone: string;
  demo: boolean;
}) {
  const [range, setRange] = useState<DashboardRange>("7D");
  return (
    <section
      className="bg-card rounded-xl border p-4 sm:p-5"
      aria-labelledby="performance-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="performance-title"
          className="flex items-center gap-2 text-lg font-bold"
        >
          Outreach performance
          <Info
            className="text-muted-foreground size-4"
            aria-label="Aggregated workspace activity"
          />
        </h2>
        <div
          className="flex items-center self-start overflow-hidden rounded-lg border"
          aria-label="Chart date range"
        >
          {ranges.map((item) => (
            <Button
              key={item}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={range === item}
              onClick={() => setRange(item)}
              className={cn(
                "rounded-none border-r px-4 last:border-r-0",
                range === item &&
                  "bg-card text-primary ring-primary hover:bg-card ring-1 ring-inset",
              )}
            >
              {item}
            </Button>
          ))}
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="rounded-none"
          >
            <Link href="/app/analytics?range=custom" aria-label="Custom range">
              <CalendarDays />
            </Link>
          </Button>
        </div>
      </div>
      <div className="text-muted-foreground mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {legend.map(([label, color]) => (
          <span key={label} className="flex items-center gap-2">
            <span className={cn("size-2.5 rounded-full", color)} />
            {label}
          </span>
        ))}
      </div>
      <DashboardChart range={range} rows={rows} />
      <p className="text-muted-foreground mt-1 text-[11px]">
        Times use {timezone}.{" "}
        {demo ? "Synthetic demo records." : "Aggregated workspace records."}
      </p>
      <p className="sr-only" aria-live="polite">
        Showing {range} outreach performance across sent, delivered, opened,
        read, replied, and positive activity.
      </p>
    </section>
  );
}
