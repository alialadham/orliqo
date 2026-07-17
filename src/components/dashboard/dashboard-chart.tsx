"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DASHBOARD_CHART_DATA } from "@/features/demo/data";

export type DashboardRange = "7D" | "30D" | "90D";

export function DashboardChart({ range }: { range: DashboardRange }) {
  const multiplier = range === "7D" ? 1 : range === "30D" ? 1.36 : 1.82;
  const data = DASHBOARD_CHART_DATA.map((point) => ({
    ...point,
    sent: Math.round(point.sent * multiplier),
    delivered: Math.round(point.delivered * multiplier),
    replied: Math.round(point.replied * multiplier),
    positive: Math.round(point.positive * multiplier),
  }));

  return (
    <div className="h-[285px] w-full sm:h-[300px] lg:h-[290px]">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 290 }}>
        <LineChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: "var(--border)" }} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} dy={8} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={42} />
          <Tooltip cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--popover)", fontSize: 12 }} />
          <Line type="monotone" dataKey="sent" name="Sent" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3, fill: "var(--chart-1)" }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="delivered" name="Delivered" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3, fill: "var(--chart-2)" }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="replied" name="Replied" stroke="var(--chart-3)" strokeWidth={2} dot={{ r: 3, fill: "var(--chart-3)" }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="positive" name="Positive" stroke="var(--chart-4)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
