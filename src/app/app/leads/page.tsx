import { FileSpreadsheet, Filter, Search } from "lucide-react";
import Link from "next/link";

import { LeadsTable } from "@/components/leads/leads-table";
import { SaveViewButton } from "@/components/leads/save-view-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLeadList, type LeadQuery } from "@/features/leads/data";
import { hasPermission } from "@/features/permissions/permissions";
import { getWorkspaceContext } from "@/features/workspaces/data";

type SearchParams = Record<string, string | string[] | undefined>;
const value = (params: SearchParams, key: string) => typeof params[key] === "string" ? params[key] as string : "";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const context = await getWorkspaceContext();
  if (!context || !hasPermission(context.activeWorkspace.role, "lead:view")) return null;
  const query: LeadQuery = {
    q: value(params, "q") || undefined, status: value(params, "status") || undefined, industry: value(params, "industry") || undefined,
    country: value(params, "country") || undefined, city: value(params, "city") || undefined, websiteStatus: value(params, "websiteStatus") || undefined,
    minScore: value(params, "minScore") ? Number(value(params, "minScore")) : undefined, maxScore: value(params, "maxScore") ? Number(value(params, "maxScore")) : undefined,
    contact: (value(params, "contact") || undefined) as LeadQuery["contact"], doNotContact: value(params, "doNotContact") ? value(params, "doNotContact") === "true" : undefined,
    sort: (value(params, "sort") || "score") as LeadQuery["sort"], direction: (value(params, "direction") || "desc") as LeadQuery["direction"], page: Math.max(1, Number(value(params, "page") || 1)),
  };
  const data = await getLeadList(query);
  if (!data) return null;
  return <div className="mx-auto w-full min-w-0 max-w-[1600px] overflow-x-hidden space-y-5">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="flex items-center gap-2"><h1 className="text-3xl font-bold">Leads</h1>{context.isDemo ? <Badge variant="outline">Synthetic demo data</Badge> : null}</div><p className="mt-1 text-sm text-muted-foreground">Qualify, verify, assign, and protect every prospect before outreach.</p></div><Button asChild variant="outline"><Link href="/app/leads/import"><FileSpreadsheet />Import CSV/XLSX</Link></Button></div>
    <div className="flex flex-wrap items-center gap-2 text-sm"><span className="text-muted-foreground">Saved views</span>{data.savedViews.map((view) => <Button key={view.id} asChild size="sm" variant="outline"><Link href={`?${view.query}`}>{view.name}</Link></Button>)}<SaveViewButton canSave={hasPermission(context.activeWorkspace.role, "lead:update")} /></div>
    <form method="get" className="rounded-xl border bg-card p-3"><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_repeat(5,minmax(120px,1fr))_auto]"><label className="relative sm:col-span-2 xl:col-span-1"><Search className="absolute top-2 left-2.5 size-4 text-muted-foreground" /><Input name="q" defaultValue={query.q} className="pl-8" placeholder="Search business, email, or city" /></label><Input name="industry" defaultValue={query.industry} placeholder="Industry" /><Input name="country" defaultValue={query.country} placeholder="Country" /><Input name="city" defaultValue={query.city} placeholder="City" /><select name="status" defaultValue={query.status} className="h-8 rounded-lg border bg-transparent px-2 text-sm"><option value="">All statuses</option>{["new", "qualified", "contacted", "replied", "interested", "do_not_contact", "archived"].map((item) => <option key={item}>{item}</option>)}</select><Input name="minScore" type="number" min="0" max="100" defaultValue={query.minScore} placeholder="Min score" /><Button type="submit"><Filter />Filter</Button></div><details className="mt-3"><summary className="cursor-pointer text-xs font-medium text-muted-foreground">More filters</summary><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5"><select name="websiteStatus" defaultValue={query.websiteStatus} className="h-8 rounded-lg border bg-transparent px-2 text-sm"><option value="">Any website status</option>{["healthy", "unknown", "no_website", "outdated", "poor_mobile", "slow", "no_booking"].map((item) => <option key={item}>{item}</option>)}</select><select name="contact" defaultValue={query.contact} className="h-8 rounded-lg border bg-transparent px-2 text-sm"><option value="">Any contact</option><option value="email">Has email</option><option value="phone">Has phone</option><option value="instagram">Has Instagram</option></select><select name="doNotContact" defaultValue={query.doNotContact === undefined ? "" : String(query.doNotContact)} className="h-8 rounded-lg border bg-transparent px-2 text-sm"><option value="">Any suppression</option><option value="false">Contactable</option><option value="true">Do not contact</option></select><select name="sort" defaultValue={query.sort} className="h-8 rounded-lg border bg-transparent px-2 text-sm"><option value="score">Sort by score</option><option value="business">Sort by business</option><option value="activity">Sort by activity</option></select><Button asChild type="button" variant="ghost"><Link href="/app/leads">Clear filters</Link></Button></div></details></form>
    <LeadsTable data={data} canCreate={hasPermission(context.activeWorkspace.role, "lead:create")} canUpdate={hasPermission(context.activeWorkspace.role, "lead:update")} canExport={hasPermission(context.activeWorkspace.role, "lead:export")} />
  </div>;
}
