import { ArrowRight, Check, Circle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLockup } from "@/components/brand/brand-lockup";
import { DemoNotice } from "@/components/feedback/demo-notice";
import { Button } from "@/components/ui/button";
import { logoutAction, useDemoWorkspaceAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/features/auth/session";

const steps = ["Business", "Offer", "Audience", "Channels", "Goals", "Review"] as const;

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.provider === "demo" && user.demoKind === "workspace") redirect("/app/dashboard");

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex min-h-16 items-center justify-between bg-shell px-5 text-white sm:px-8"><BrandLockup compact /><form action={logoutAction}><Button type="submit" variant="ghost" className="text-white/75 hover:bg-white/10 hover:text-white">Sign out</Button></form></header>
      <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <DemoNotice compact />
        <div className="mt-10 max-w-2xl"><p className="text-sm font-semibold text-primary">Workspace created</p><h1 className="mt-3 text-4xl font-bold">Welcome, {user.fullName?.split(" ")[0] || "there"}</h1><p className="mt-3 text-base leading-7 text-muted-foreground">Your authenticated workspace foundation is ready. The resumable six-step business setup is the first deliverable in Phase 2.</p></div>
        <ol className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{steps.map((step, index) => <li key={step} className="rounded-lg border bg-card p-3"><span className="flex items-center gap-2 text-xs text-muted-foreground">{index === 0 ? <Check className="size-4 text-success" /> : <Circle className="size-4" />}Step {index + 1}</span><span className="mt-2 block text-sm font-semibold">{step}</span></li>)}</ol>
        <section className="mt-10 rounded-xl border bg-card p-6 sm:p-8"><h2 className="text-xl font-bold">Explore the complete Phase 1 demo</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Switch to the seeded workspace to test protected navigation, role switching, synthetic dashboard data, and no-send provider states. This does not persist the registration form as a production account.</p><div className="mt-6 flex flex-wrap gap-3"><form action={useDemoWorkspaceAction}><Button type="submit">Use demo workspace<ArrowRight data-icon="inline-end" /></Button></form><Button asChild variant="outline"><Link href="/">Return home</Link></Button></div></section>
      </main>
    </div>
  );
}
