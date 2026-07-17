import { CalendarDays, CircleDollarSign, MessageCircle, Send, ThumbsUp, UserRound } from "lucide-react";

import { DASHBOARD_METRICS } from "@/features/demo/data";

const icons = {
  leads: UserRound,
  sent: Send,
  replies: MessageCircle,
  positive: ThumbsUp,
  meetings: CalendarDays,
  pipeline: CircleDollarSign,
} as const;

function Sparkline() {
  return (
    <svg viewBox="0 0 58 22" className="h-5 w-14" aria-hidden="true">
      <polyline points="1,18 11,10 20,15 29,9 38,12 47,5 57,2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MetricRail() {
  return (
    <section aria-label="Outreach summary" className="overflow-x-auto rounded-xl border bg-card [scrollbar-width:thin]">
      <div className="grid min-w-[1060px] grid-cols-6 divide-x lg:min-w-0">
        {DASHBOARD_METRICS.map((metric) => {
          const Icon = icons[metric.key];
          return (
            <article key={metric.key} className="min-w-[176px] px-4 py-4 lg:min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground/74"><Icon className="size-[17px]" strokeWidth={1.75} aria-hidden="true" />{metric.label}</div>
              <p className="tabular-nums mt-2 text-[29px] leading-none font-bold tracking-[-0.035em]">{metric.value}</p>
              <div className="mt-4 flex items-end justify-between gap-2 text-[11px]"><span className="whitespace-nowrap text-success">↑ {metric.trend} <span className="text-muted-foreground">vs last 7 days</span></span><span className="shrink-0 text-primary"><Sparkline /></span></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
