export type AnalyticsMetric =
  | "discovered"
  | "qualified"
  | "approved"
  | "contacted"
  | "sent"
  | "delivered"
  | "opened"
  | "read"
  | "replied"
  | "positive"
  | "meetings"
  | "conversions";

export type AnalyticsRow = Record<AnalyticsMetric, number> & {
  date: string;
  campaignId: string | null;
  campaignName: string;
  channel: "email" | "whatsapp" | "instagram" | "linkedin" | "all";
  industry: string;
  country: string;
  template: string;
  cta: string;
  sendHour: number | null;
  followUpStep: number;
  cost: number;
  revenue: number;
};

export type AnalyticsRecommendation = {
  id: string;
  category:
    "opener" | "send_time" | "industry" | "cta" | "follow_up" | "channel";
  title: string;
  evidence: string;
  confidence: "medium" | "high";
  sampleSize: number;
};

export type AnalyticsSummary = {
  rows: AnalyticsRow[];
  current: Record<AnalyticsMetric, number> & {
    cost: number;
    revenue: number;
    costPerLead: number | null;
  };
  previous: Record<AnalyticsMetric, number>;
  recommendations: AnalyticsRecommendation[];
  insufficientRecommendations: boolean;
};

export const FUNNEL_METRICS: readonly AnalyticsMetric[] = [
  "discovered",
  "qualified",
  "approved",
  "contacted",
  "replied",
  "positive",
  "meetings",
  "conversions",
];
