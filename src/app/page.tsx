import { ArrowRight, CheckCircle2, Database, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

import { PublicFooter, PublicHeader } from "@/components/public/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="outline-none">
        <section className="shell-texture overflow-hidden text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-7 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:py-32">
            <div>
              <Badge variant="outline" className="border-white/20 bg-white/[0.05] text-white"><span className="size-2 rounded-full bg-success" />Demo mode ready</Badge>
              <h1 className="mt-6 max-w-3xl text-balance text-5xl leading-[1.02] font-bold tracking-[-0.05em] sm:text-6xl">Find the right businesses. Reach them personally.</h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/65">Evidence-backed prospect discovery, grounded messaging, approval controls, and authorized provider delivery in one workspace.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg" className="h-12 px-6"><Link href="/register">Create your workspace<ArrowRight data-icon="inline-end" /></Link></Button><Button asChild size="lg" variant="outline" className="h-12 border-white/20 bg-white/[0.04] px-6 text-white hover:bg-white/10 hover:text-white"><Link href="/login">Explore demo</Link></Button></div>
            </div>
            <div className="relative rounded-2xl border border-white/14 bg-white/[0.055] p-4 shadow-2xl shadow-black/40">
              <div className="rounded-xl border border-white/10 bg-[#f8f9fb] p-5 text-foreground"><div className="flex items-center justify-between"><div><p className="text-xl font-bold">Outreach review</p><p className="text-sm text-muted-foreground">Approval before any simulated send</p></div><ShieldCheck className="size-7 text-primary" /></div><div className="mt-6 grid grid-cols-3 divide-x rounded-lg border bg-card py-4 text-center"><div><p className="text-2xl font-bold">184</p><p className="text-xs text-muted-foreground">Qualified</p></div><div><p className="text-2xl font-bold">48</p><p className="text-xs text-muted-foreground">Replies</p></div><div><p className="text-2xl font-bold">7</p><p className="text-xs text-muted-foreground">Meetings</p></div></div><div className="mt-4 space-y-3">{["Sources attached to every claim", "Suppression checked before queueing", "Provider delivery disabled in demo"].map((item) => <div key={item} className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm"><CheckCircle2 className="size-4 text-success" />{item}</div>)}</div></div>
            </div>
          </div>
        </section>
        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 sm:px-7 md:grid-cols-3">
          {[{ icon: Database, title: "Grounded discovery", copy: "Research fixtures retain sources, verification state, and confidence instead of inventing contact data." }, { icon: Sparkles, title: "Controlled AI", copy: "Messages are structured, evidence-bound, and routed through review before any delivery action." }, { icon: ShieldCheck, title: "Tenant-safe foundation", copy: "Workspace roles, database isolation, explicit grants, and signed demo sessions are enforced server-side." }].map(({ icon: Icon, title, copy }) => <article key={title} className="border-t pt-6"><Icon className="size-6 text-primary" /><h2 className="mt-5 text-xl font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p></article>)}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
