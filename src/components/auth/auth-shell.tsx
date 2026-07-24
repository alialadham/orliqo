import { BarChart3, CheckCircle2, Link2, ShieldCheck, Target, UserRound } from "lucide-react";

import { BrandLockup } from "@/components/brand/brand-lockup";
import { cn } from "@/lib/utils";

function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/15 bg-[#f8f9fb] shadow-2xl shadow-black/50" aria-label="Orliqo dashboard preview">
      <div className="flex h-7 items-center gap-2 border-b border-white/10 bg-[#111216] px-2">
        <div className="h-2 w-14 rounded-sm bg-white/70" />
        <div className="h-3 flex-1 rounded-sm border border-white/10 bg-white/[0.04]" />
        <div className="h-3 w-16 rounded-sm bg-primary" />
      </div>
      <div className="flex h-52 sm:h-60 lg:h-64">
        <div className="w-[18%] bg-[#111216] p-2">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className={cn("mb-2 h-2.5 rounded-sm", index === 0 ? "bg-white/20" : "bg-white/8")} />
          ))}
        </div>
        <div className="flex-1 p-3">
          <div className="h-4 w-32 rounded-sm bg-slate-900/90" />
          <div className="mt-1 h-2 w-24 rounded-sm bg-slate-300" />
          <div className="mt-3 grid grid-cols-6 divide-x overflow-hidden rounded border bg-white">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="p-2">
                <div className="h-1.5 rounded bg-slate-300" />
                <div className="mt-2 h-3 w-2/3 rounded bg-slate-900" />
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-[1.55fr_1fr] gap-2">
            <div className="relative h-24 overflow-hidden rounded border bg-white p-2">
              <div className="h-2 w-20 rounded bg-slate-800" />
              <svg className="mt-3 h-14 w-full" viewBox="0 0 240 56" role="img" aria-label="Rising outreach performance lines">
                <polyline points="0,48 40,38 80,30 120,20 160,13 200,8 240,4" fill="none" stroke="#1557ff" strokeWidth="2" />
                <polyline points="0,52 40,44 80,35 120,29 160,21 200,17 240,13" fill="none" stroke="#8b3fe5" strokeWidth="2" />
              </svg>
            </div>
            <div className="space-y-2">
              <div className="h-[46px] rounded border bg-white p-2"><div className="h-2 w-20 rounded bg-slate-800" /><div className="mt-2 h-1.5 w-full rounded bg-slate-200" /></div>
              <div className="h-[46px] rounded border bg-white p-2"><div className="h-2 w-16 rounded bg-slate-800" /><div className="mt-2 h-1.5 w-4/5 rounded bg-primary/40" /></div>
            </div>
          </div>
          <div className="mt-2 h-8 rounded border bg-white" />
        </div>
      </div>
    </div>
  );
}

function TrustRow({ icon: Icon, title, description }: { icon: typeof BarChart3; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-white/20 text-white">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-white/55">{description}</p>
      </div>
    </div>
  );
}

function RegistrationSteps() {
  const steps = [
    { icon: UserRound, label: "1. Create workspace" },
    { icon: Target, label: "2. Define your ideal customer" },
    { icon: ShieldCheck, label: "3. Review before sending" },
  ];
  return (
    <div className="relative mt-12 space-y-16 before:absolute before:top-9 before:bottom-9 before:left-6 before:w-px before:bg-white/25">
      {steps.map(({ icon: Icon, label }) => (
        <div key={label} className="relative flex items-center gap-5">
          <span className="z-10 grid size-12 place-items-center rounded-full border border-white/50 bg-shell">
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function AuthShell({ variant, children }: { variant: "login" | "register"; children: React.ReactNode }) {
  const isLogin = variant === "login";
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background outline-none md:grid md:grid-cols-[minmax(410px,51%)_1fr] lg:grid-cols-[minmax(560px,51%)_1fr]">
      <section className={cn("shell-texture relative hidden min-h-dvh overflow-hidden px-10 py-9 text-white md:flex md:flex-col lg:px-14 lg:py-10", !isLogin && "md:px-12 lg:px-16")}>
        <BrandLockup />
        <div className={cn("flex flex-1 flex-col", isLogin ? "justify-center py-8" : "justify-start pt-20")}>
          <h1 className={cn("max-w-[590px] text-balance font-heading font-bold tracking-[-0.035em]", isLogin ? "text-[38px] leading-[1.08] lg:text-[42px]" : "max-w-[500px] text-[42px] leading-[1.12]")}>
            {isLogin ? "Find the right businesses. Reach them personally. Convert more clients." : "Build a safer outreach engine."}
          </h1>
          <p className="mt-3 max-w-[570px] text-[17px] leading-7 text-white/68">
            {isLogin
              ? "Personalized outreach at scale, backed by evidence and protected by design."
              : "Create your workspace, define who you serve, and keep every message grounded and approved."}
          </p>
          {isLogin ? <div className="mt-6"><DashboardPreview /></div> : <RegistrationSteps />}
          {isLogin ? (
            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <TrustRow icon={BarChart3} title="Evidence-backed research" description="Every suggestion is grounded in real data and proven patterns." />
              <TrustRow icon={CheckCircle2} title="Approval before sending" description="You stay in control with review and approval at every step." />
              <TrustRow icon={Link2} title="Official provider connections" description="We connect through verified channels and trusted providers." />
            </div>
          ) : null}
        </div>
      </section>
      <section className="flex min-h-dvh flex-col">
        <div className="shell-texture flex min-h-20 items-center px-5 md:hidden"><BrandLockup compact /></div>
        <div className={cn("mx-auto flex w-full flex-1 items-center px-5 py-10 sm:px-8", isLogin ? "max-w-[620px]" : "max-w-[860px]")}>
          {children}
        </div>
      </section>
    </main>
  );
}
