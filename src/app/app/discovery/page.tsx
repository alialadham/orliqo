import { ExternalLink, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLeadList } from "@/features/leads/data";
import { hasPermission } from "@/features/permissions/permissions";
import { getWorkspaceContext } from "@/features/workspaces/data";

export default async function DiscoveryPage({ searchParams }: { searchParams: Promise<{ q?: string; industry?: string; city?: string; minScore?: string }> }) {
  const params = await searchParams; const context = await getWorkspaceContext();
  if (!context || !hasPermission(context.activeWorkspace.role, "lead:view")) return null;
  const result = await getLeadList({ q: params.q, industry: params.industry, city: params.city, minScore: params.minScore ? Number(params.minScore) : 60, pageSize: 30 });
  if (!result) return null;
  return <div className="mx-auto max-w-7xl space-y-5"><div><div className="flex items-center gap-2"><h1 className="text-3xl font-bold">Discovery</h1><Badge variant="outline">Evidence-backed</Badge></div><p className="mt-1 text-sm text-muted-foreground">Explore qualified records using deterministic scores and stored sources.{context.isDemo?" Demo mode never contacts external businesses.":""}</p></div>
    <form aria-label="Discovery filters" className="grid gap-2 rounded-xl border bg-card p-4 sm:grid-cols-[1.5fr_1fr_1fr_130px_auto]"><label className="relative"><span className="sr-only">Search opportunity</span><Search className="absolute top-2 left-2.5 size-4 text-muted-foreground" aria-hidden="true" /><Input name="q" defaultValue={params.q} className="pl-8" placeholder="Search opportunity" /></label><Input aria-label="Industry" name="industry" defaultValue={params.industry} placeholder="Industry" /><Input aria-label="City" name="city" defaultValue={params.city} placeholder="City" /><Input aria-label="Minimum qualification score" name="minScore" type="number" min="0" max="100" defaultValue={params.minScore ?? "60"} placeholder="Min score" /><Button type="submit"><SlidersHorizontal aria-hidden="true" />Research</Button></form>
    <div className="overflow-hidden rounded-xl border bg-card surface-shadow"><div className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-3">{result.leads.map((lead) => <article key={lead.id} className="bg-card p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{lead.businessName}</h2><p className="mt-1 text-xs text-muted-foreground">{lead.industry} · {lead.city}</p></div><Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">{lead.qualificationScore}</Badge></div><p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{lead.qualificationReason}</p><div className="mt-4 flex flex-wrap gap-1.5"><Badge variant="outline" className="capitalize">{lead.websiteStatus.replaceAll("_", " ")}</Badge><Badge variant="outline" className="capitalize">{lead.websiteConfidence}</Badge>{lead.email ? <Badge variant="outline">Has email</Badge> : null}</div><Button asChild className="mt-5" variant="outline"><Link href={`/app/leads/${lead.id}`}>Review evidence<ExternalLink /></Link></Button></article>)}</div>{!result.leads.length ? <div className="p-12 text-center"><h2 className="font-semibold">No qualified records found</h2><p className="mt-1 text-sm text-muted-foreground">Adjust filters or lower the score threshold.</p></div> : null}</div>
  </div>;
}
