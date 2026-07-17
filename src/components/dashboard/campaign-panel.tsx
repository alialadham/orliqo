"use client";

import { Clock3, Eye, MapPin, Pause, Play, Sparkles, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function CampaignPanel() {
  const [running, setRunning] = useState(true);
  const toggleRunning = () => {
    setRunning((value) => !value);
    toast.success(running ? "Demo campaign paused" : "Demo campaign resumed", { description: "No messages are sent in demo mode." });
  };

  return (
    <section className="rounded-xl border bg-card" aria-labelledby="active-campaign-title">
      <div className="flex items-center justify-between border-b px-5 py-3"><h2 id="active-campaign-title" className="text-base font-bold">Active campaign</h2><Link href="/app/campaigns" className="text-xs font-medium text-primary hover:underline">View all campaigns</Link></div>
      <div className="p-5">
        <h3 className="text-[17px] font-bold">Amman Studios - Website Audit</h3>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><Badge variant="outline" className={running ? "border-success/35 bg-success/8 text-success" : "border-warning/35 bg-warning/10 text-foreground"}><span className={running ? "size-1.5 rounded-full bg-success" : "size-1.5 rounded-full bg-warning"} />{running ? "Running" : "Paused"}</Badge><span className="flex items-center gap-1"><MapPin className="size-3.5" />Amman</span></div>
        <div className="mt-5 grid grid-cols-4 divide-x text-center">
          {[ ["62", "Queued"], ["18", "Sent today"], [running ? "3:42 PM" : "Paused", "Next send"], ["40", "Daily limit"] ].map(([value, label]) => <div key={label} className="px-2"><p className="tabular-nums text-base font-semibold">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{label}</p></div>)}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs"><span className="text-muted-foreground">Reply rate</span><span className="font-semibold text-success">14.8%</span></div>
        <Progress value={15} className="mt-2 h-1.5" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/app/campaigns/campaign-1"><Eye data-icon="inline-start" />View</Link></Button>
          <Button type="button" variant="outline" size="sm" onClick={toggleRunning}>{running ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}{running ? "Pause" : "Resume"}</Button>
          <Button asChild size="sm"><Link href="/app/leads?campaign=campaign-1"><UserPlus data-icon="inline-start" />Add Leads</Link></Button>
        </div>
      </div>
    </section>
  );
}

export function RecommendationPanel() {
  const [visible, setVisible] = useState(true);
  if (!visible) {
    return (
      <section className="rounded-xl border bg-card p-5 text-center" aria-labelledby="recommendation-title">
        <h2 id="recommendation-title" className="text-base font-bold">AI Recommendations</h2>
        <p className="mt-2 text-xs text-muted-foreground">Recommendation dismissed for this demo session.</p>
        <Button type="button" variant="link" size="sm" onClick={() => setVisible(true)}>Undo</Button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-card" aria-labelledby="recommendation-title">
      <div className="flex items-center justify-between border-b px-5 py-3"><h2 id="recommendation-title" className="flex items-center gap-2 text-base font-bold"><Sparkles className="size-4 text-primary" />AI Recommendations</h2><Link href="/app/analytics" className="text-xs font-medium text-primary hover:underline">View all</Link></div>
      <div className="m-3 rounded-lg border border-primary/25 bg-primary/[0.025] p-3">
        <div className="flex items-start gap-3"><Clock3 className="mt-0.5 size-6 shrink-0" /><div className="min-w-0 flex-1"><p className="text-xs leading-4 font-semibold">Photography studios reply 22% more often between 10-11 AM</p><p className="mt-1 text-[11px] text-muted-foreground">Confidence: High · Synthetic demo analysis</p></div><Badge variant="outline" className="border-success/30 bg-success/8 text-success">High</Badge></div>
        <div className="mt-3 grid grid-cols-2 gap-2"><Button asChild size="sm"><Link href="/app/analytics?recommendation=review">Review</Link></Button><Button type="button" variant="outline" size="sm" onClick={() => { setVisible(false); toast("Demo recommendation dismissed"); }}>Dismiss</Button></div>
      </div>
    </section>
  );
}
