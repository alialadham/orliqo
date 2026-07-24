"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AnalyticsRow } from "@/features/analytics/types";

export type DashboardRange = "7D" | "30D" | "90D";

function groupedRows(rows: readonly AnalyticsRow[], range: DashboardRange) {
  const days = range === "7D" ? 7 : range === "30D" ? 30 : 90;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const startDate = start.toISOString().slice(0, 10);
  const grouped = new Map<
    string,
    {
      date: string;
      sent: number;
      delivered: number;
      opened: number;
      read: number;
      replied: number;
      positive: number;
    }
  >();
  for (const row of rows) {
    if (row.date < startDate) continue;
    const point = grouped.get(row.date) ?? {
      date: row.date,
      sent: 0,
      delivered: 0,
      opened: 0,
      read: 0,
      replied: 0,
      positive: 0,
    };
    for (const metric of [
      "sent",
      "delivered",
      "opened",
      "read",
      "replied",
      "positive",
    ] as const)
      point[metric] += row[metric];
    grouped.set(row.date, point);
  }
  return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function DashboardChart({
  range,
  rows,
}: {
  range: DashboardRange;
  rows: readonly AnalyticsRow[];
}) {
  const data = groupedRows(rows, range);
  return (
    <div className="h-[285px] w-full sm:h-[300px] lg:h-[290px]">
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 640, height: 290 }}
      >
        <LineChart
          data={data}
          margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
          accessibilityLayer
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) =>
              new Date(`${value}T00:00:00Z`).toLocaleDateString("en", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })
            }
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            dy={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            width={42}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--popover)",
              fontSize: 12,
            }}
          />
          {[
            ["sent", "Sent", "var(--chart-1)"],
            ["delivered", "Delivered", "var(--chart-2)"],
            ["opened", "Opened", "var(--chart-5)"],
            ["read", "Read", "var(--chart-6, var(--chart-2))"],
            ["replied", "Replied", "var(--chart-3)"],
            ["positive", "Positive", "var(--chart-4)"],
          ].map(([key, name, color]) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={name}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
