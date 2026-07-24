import {
  FUNNEL_METRICS,
  type AnalyticsMetric,
  type AnalyticsRecommendation,
  type AnalyticsRow,
  type AnalyticsSummary,
} from "./types";

const metrics: readonly AnalyticsMetric[] = [
  "discovered",
  "qualified",
  "approved",
  "contacted",
  "sent",
  "delivered",
  "opened",
  "read",
  "replied",
  "positive",
  "meetings",
  "conversions",
];

function emptyMetrics(): Record<AnalyticsMetric, number> {
  return Object.fromEntries(metrics.map((metric) => [metric, 0])) as Record<
    AnalyticsMetric,
    number
  >;
}

export function sumAnalytics(
  rows: readonly AnalyticsRow[],
): Record<AnalyticsMetric, number> & { cost: number; revenue: number } {
  const total = { ...emptyMetrics(), cost: 0, revenue: 0 };
  for (const row of rows) {
    for (const metric of metrics) total[metric] += row[metric];
    total.cost += row.cost;
    total.revenue += row.revenue;
  }
  return total;
}

export function conversionRate(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

export function funnelRows(summary: AnalyticsSummary) {
  return FUNNEL_METRICS.map((metric) => ({
    metric,
    label: metric.replaceAll("_", " "),
    value: summary.current[metric],
    conversion:
      metric === "discovered"
        ? 100
        : conversionRate(summary.current[metric], summary.current.discovered),
  }));
}

type RankedDimension = {
  name: string;
  sent: number;
  replied: number;
  positive: number;
};

function rankDimension(
  rows: readonly AnalyticsRow[],
  field: "template" | "industry" | "cta" | "channel" | "sendHour",
  minimumSample: number,
): RankedDimension[] {
  const groups = new Map<string, RankedDimension>();
  for (const row of rows) {
    const name = String(row[field] ?? "Unknown");
    if (!name || name === "Unknown" || name === "all") continue;
    const group = groups.get(name) ?? {
      name,
      sent: 0,
      replied: 0,
      positive: 0,
    };
    group.sent += row.sent;
    group.replied += row.replied;
    group.positive += row.positive;
    groups.set(name, group);
  }
  return [...groups.values()]
    .filter((group) => group.sent >= minimumSample)
    .sort(
      (a, b) =>
        conversionRate(b.positive, b.sent) -
          conversionRate(a.positive, a.sent) || b.sent - a.sent,
    );
}

function recommendation(
  id: string,
  category: AnalyticsRecommendation["category"],
  title: string,
  group: RankedDimension,
): AnalyticsRecommendation {
  const positiveRate = conversionRate(group.positive, group.sent);
  return {
    id,
    category,
    title,
    evidence: `${group.positive} positive replies from ${group.sent} sent (${positiveRate.toFixed(1)}%).`,
    confidence: group.sent >= 50 ? "high" : "medium",
    sampleSize: group.sent,
  };
}

export function buildRecommendations(
  rows: readonly AnalyticsRow[],
  minimumSample = 12,
): AnalyticsRecommendation[] {
  const output: AnalyticsRecommendation[] = [];
  const opener = rankDimension(rows, "template", minimumSample)[0];
  if (opener)
    output.push(
      recommendation(
        "best-opener",
        "opener",
        `${opener.name} is the strongest opener`,
        opener,
      ),
    );
  const sendTime = rankDimension(rows, "sendHour", minimumSample)[0];
  if (sendTime)
    output.push(
      recommendation(
        "best-send-time",
        "send_time",
        `${sendTime.name}:00 is the strongest send time`,
        sendTime,
      ),
    );
  const industry = rankDimension(rows, "industry", minimumSample)[0];
  if (industry)
    output.push(
      recommendation(
        "best-industry",
        "industry",
        `${industry.name} has the strongest positive response rate`,
        industry,
      ),
    );
  const cta = rankDimension(rows, "cta", minimumSample)[0];
  if (cta)
    output.push(
      recommendation(
        "best-cta",
        "cta",
        `${cta.name} is the strongest CTA`,
        cta,
      ),
    );
  const channel = rankDimension(rows, "channel", minimumSample)[0];
  if (channel)
    output.push(
      recommendation(
        "best-channel",
        "channel",
        `${channel.name} is the strongest channel`,
        channel,
      ),
    );

  const followUps = new Map<number, RankedDimension>();
  for (const row of rows) {
    if (row.followUpStep <= 0) continue;
    const group = followUps.get(row.followUpStep) ?? {
      name: `Follow-up ${row.followUpStep}`,
      sent: 0,
      replied: 0,
      positive: 0,
    };
    group.sent += row.sent;
    group.replied += row.replied;
    group.positive += row.positive;
    followUps.set(row.followUpStep, group);
  }
  const weakest = [...followUps.values()]
    .filter((group) => group.sent >= minimumSample)
    .sort(
      (a, b) =>
        conversionRate(a.positive, a.sent) - conversionRate(b.positive, b.sent),
    )[0];
  if (weakest)
    output.push(
      recommendation(
        "weakest-follow-up",
        "follow_up",
        `${weakest.name} is the weakest sequence step`,
        weakest,
      ),
    );
  return output;
}

export function analyticsSummary(
  rows: readonly AnalyticsRow[],
  currentStart: string,
  previousStart: string,
): AnalyticsSummary {
  const currentRows = rows.filter((row) => row.date >= currentStart);
  const previousRows = rows.filter(
    (row) => row.date >= previousStart && row.date < currentStart,
  );
  const current = sumAnalytics(currentRows);
  const previous = sumAnalytics(previousRows);
  const recommendations = buildRecommendations(currentRows);
  return {
    rows: [...rows],
    current: {
      ...current,
      costPerLead:
        current.qualified > 0 ? current.cost / current.qualified : null,
    },
    previous,
    recommendations,
    insufficientRecommendations: recommendations.length === 0,
  };
}
