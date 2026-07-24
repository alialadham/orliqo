import {
  CalendarDays,
  CircleDollarSign,
  Info,
  MessageCircle,
  Send,
  ThumbsUp,
  UserRound,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AnalyticsMetric, AnalyticsRow } from "@/features/analytics/types";

const definitions = [
  {
    key: "qualified",
    label: "Qualified leads",
    icon: UserRound,
    description: "Leads meeting the workspace qualification threshold.",
  },
  {
    key: "sent",
    label: "Sent",
    icon: Send,
    description: "Outbound messages accepted by a provider or demo simulator.",
  },
  {
    key: "replied",
    label: "Replies",
    icon: MessageCircle,
    description: "Unique inbound replies attributed to outreach.",
  },
  {
    key: "positive",
    label: "Positive replies",
    icon: ThumbsUp,
    description:
      "Replies classified as interested, pricing, or information intent.",
  },
  {
    key: "meetings",
    label: "Meetings",
    icon: CalendarDays,
    description: "Meetings attributed to outreach conversations.",
  },
  {
    key: "revenue",
    label: "Estimated pipeline",
    icon: CircleDollarSign,
    description: "Revenue attributed to won or active outreach opportunities.",
  },
] as const;

function Sparkline({
  rows,
  metric,
}: {
  rows: readonly AnalyticsRow[];
  metric: AnalyticsMetric | "revenue";
}) {
  const values = rows.slice(-7).map((row) => row[metric]);
  const max = Math.max(1, ...values);
  const points = values
    .map((value, index) => {
      const x = values.length > 1 ? (index / (values.length - 1)) * 56 + 1 : 1;
      const y = 20 - (value / max) * 18;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 58 22" className="h-5 w-14" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MetricRail({
  current,
  previous,
  rows,
}: {
  current: Record<AnalyticsMetric, number> & { revenue: number };
  previous: Record<AnalyticsMetric, number>;
  rows: readonly AnalyticsRow[];
}) {
  return (
    <TooltipProvider>
      <section
        aria-label="Outreach summary"
        className="bg-card [scrollbar-width:thin] overflow-x-auto rounded-xl border"
      >
        <div className="grid min-w-[1060px] grid-cols-6 divide-x lg:min-w-0">
          {definitions.map((metric) => {
            const Icon = metric.icon;
            const value = current[metric.key];
            const previousValue =
              metric.key === "revenue" ? 0 : previous[metric.key];
            const change =
              previousValue > 0
                ? ((value - previousValue) / previousValue) * 100
                : null;
            return (
              <article
                key={metric.key}
                className="min-w-[176px] px-4 py-4 lg:min-w-0"
              >
                <div className="text-foreground/74 flex items-center gap-2 text-xs font-medium">
                  <Icon
                    className="size-[17px]"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  {metric.label}
                  <Tooltip>
                    <TooltipTrigger
                      aria-label={`About ${metric.label}`}
                      className="focus-visible:ring-ring rounded-sm focus-visible:ring-2"
                    >
                      <Info className="text-muted-foreground size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent>{metric.description}</TooltipContent>
                  </Tooltip>
                </div>
                <p className="mt-2 text-[29px] leading-none font-bold tracking-[-0.035em] tabular-nums">
                  {metric.key === "revenue"
                    ? `$${value.toLocaleString()}`
                    : value.toLocaleString()}
                </p>
                <div className="mt-4 flex items-end justify-between gap-2 text-[11px]">
                  <span
                    className={
                      change === null
                        ? "text-muted-foreground"
                        : change >= 0
                          ? "text-success"
                          : "text-destructive"
                    }
                  >
                    {change === null
                      ? "No prior baseline"
                      : `${change >= 0 ? "↑" : "↓"} ${Math.abs(change).toFixed(1)}%`}{" "}
                    <span className="text-muted-foreground">
                      vs previous period
                    </span>
                  </span>
                  <span className="text-primary shrink-0">
                    <Sparkline rows={rows} metric={metric.key} />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </TooltipProvider>
  );
}
