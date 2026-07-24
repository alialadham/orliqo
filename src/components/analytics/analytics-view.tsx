"use client";

import { BarChart3, CircleDollarSign, Target, UsersRound } from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { funnelRows } from "@/features/analytics/calculations";
import type { AnalyticsSummary } from "@/features/analytics/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function dimensionRows(
  rows: AnalyticsSummary["rows"],
  field: "channel" | "industry" | "country" | "campaignName",
) {
  const grouped = new Map<
    string,
    { name: string; sent: number; positive: number }
  >();
  for (const row of rows) {
    const name = row[field] || "Unattributed";
    const item = grouped.get(name) ?? { name, sent: 0, positive: 0 };
    item.sent += row.sent;
    item.positive += row.positive;
    grouped.set(name, item);
  }
  return [...grouped.values()].sort((a, b) => b.sent - a.sent).slice(0, 8);
}

export function AnalyticsView({
  summary,
  rangeDays,
  demo,
}: {
  summary: AnalyticsSummary;
  rangeDays: 7 | 30 | 90;
  demo: boolean;
}) {
  const funnel = funnelRows(summary);
  const cards = [
    ["Qualified leads", summary.current.qualified, UsersRound],
    ["Positive replies", summary.current.positive, Target],
    [
      "Attributed revenue",
      `$${summary.current.revenue.toLocaleString()}`,
      CircleDollarSign,
    ],
    [
      "Cost per qualified lead",
      summary.current.costPerLead === null
        ? "—"
        : `$${summary.current.costPerLead.toFixed(2)}`,
      BarChart3,
    ],
  ] as const;
  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Analytics</h1>
            {demo ? <Badge variant="outline">Demo data</Badge> : null}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Attributed outreach performance with evidence-gated recommendations.
          </p>
        </div>
        <nav
          className="bg-card flex rounded-lg border p-1"
          aria-label="Analytics period"
        >
          {[7, 30, 90].map((days) => (
            <Button
              key={days}
              asChild
              variant={rangeDays === days ? "secondary" : "ghost"}
              size="sm"
            >
              <Link href={`/app/analytics?range=${days}`}>{days}D</Link>
            </Button>
          ))}
        </nav>
      </header>

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Analytics summary"
      >
        {cards.map(([label, value, Icon]) => (
          <article key={label} className="bg-card rounded-xl border p-5">
            <Icon className="text-primary size-5" />
            <p className="mt-4 text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-muted-foreground mt-1 text-xs">{label}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <section
          className="bg-card rounded-xl border p-5"
          aria-labelledby="funnel-title"
        >
          <h2 id="funnel-title" className="text-lg font-bold">
            Full outreach funnel
          </h2>
          <div className="mt-5 h-[330px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
              initialDimension={{ width: 640, height: 330 }}
            >
              <BarChart
                data={funnel}
                layout="vertical"
                margin={{ left: 18, right: 24 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={82}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value, _name, item) => [
                    `${value} (${Number(item.payload.conversion).toFixed(1)}%)`,
                    "Count",
                  ]}
                />
                <Bar
                  dataKey="value"
                  fill="var(--chart-1)"
                  radius={[0, 5, 5, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section
          className="bg-card rounded-xl border p-5"
          aria-labelledby="recommendations-title"
        >
          <h2 id="recommendations-title" className="text-lg font-bold">
            Evidence-backed recommendations
          </h2>
          <div className="mt-4 space-y-3">
            {summary.recommendations.length ? (
              summary.recommendations.map((item) => (
                <article key={item.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <Badge variant="outline">{item.confidence}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs leading-5">
                    {item.evidence}
                  </p>
                  <p className="text-muted-foreground mt-2 text-[11px]">
                    Evidence sample: {item.sampleSize} sends
                  </p>
                </article>
              ))
            ) : (
              <p className="text-muted-foreground rounded-lg border border-dashed p-5 text-sm">
                Insufficient evidence. Each comparable segment needs at least 12
                attributed sends.
              </p>
            )}
          </div>
        </section>
      </div>

      <section
        className="bg-card rounded-xl border p-5"
        aria-labelledby="dimensions-title"
      >
        <h2 id="dimensions-title" className="text-lg font-bold">
          Performance dimensions
        </h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {(["channel", "industry", "country", "campaignName"] as const).map(
            (field) => (
              <div key={field}>
                <h3 className="text-sm font-semibold capitalize">
                  {field === "campaignName" ? "Campaign" : field}
                </h3>
                <div className="mt-2 divide-y rounded-lg border">
                  {dimensionRows(summary.rows, field).map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="text-muted-foreground shrink-0">
                        {item.sent} sent · {item.positive} positive
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
