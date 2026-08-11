"use client";

import { Clock3, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AnalyticsRecommendation } from "@/features/analytics/types";

export function RecommendationPanel({ recommendations, insufficient }: { recommendations: readonly AnalyticsRecommendation[]; insufficient: boolean }) {
  const [visible, setVisible] = useState(true);
  const recommendation = recommendations[0];
  if (!recommendation || insufficient) {
    return <section className="rounded-xl border bg-card p-5" aria-labelledby="recommendation-title"><h2 id="recommendation-title" className="flex items-center gap-2 text-base font-bold"><Sparkles className="size-4 text-primary" />AI recommendations</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Recommendations appear after at least 12 attributed sends in a comparable segment.</p></section>;
  }
  if (!visible) {
    return <section className="rounded-xl border bg-card p-5 text-center" aria-labelledby="recommendation-title"><h2 id="recommendation-title" className="text-base font-bold">AI recommendations</h2><p className="mt-2 text-xs text-muted-foreground">Recommendation dismissed.</p><Button type="button" variant="link" size="sm" onClick={() => setVisible(true)}>Undo</Button></section>;
  }
  return <section className="rounded-xl border bg-card" aria-labelledby="recommendation-title"><div className="flex items-center justify-between border-b px-5 py-3"><h2 id="recommendation-title" className="flex items-center gap-2 text-base font-bold"><Sparkles className="size-4 text-primary" />AI recommendations</h2><Link href="/app/analytics" className="text-xs font-medium text-primary hover:underline">View all</Link></div><div className="m-3 rounded-lg border border-primary/25 bg-primary/[0.025] p-3"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 size-6 shrink-0" /><div className="min-w-0 flex-1"><p className="text-xs leading-4 font-semibold">{recommendation.title}</p><p className="mt-1 text-[11px] text-muted-foreground">{recommendation.evidence} · Sample {recommendation.sampleSize}</p></div><Badge variant="outline" className="border-success/30 bg-success/8 text-success">{recommendation.confidence === "high" ? "High" : "Medium"}</Badge></div><div className="mt-3 grid grid-cols-2 gap-2"><Button asChild size="sm"><Link href="/app/analytics?recommendation=review">Review</Link></Button><Button type="button" variant="outline" size="sm" onClick={() => setVisible(false)}>Dismiss</Button></div></div></section>;
}
