import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <header className="border-b border-white/10 bg-shell text-white">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-5 sm:px-7">
        <Link href="/" aria-label="Orliqo home"><BrandLockup compact /></Link>
        <nav aria-label="Public navigation" className="flex items-center gap-1 sm:gap-3">
          <Button asChild variant="ghost" className="hidden text-white/75 hover:bg-white/10 hover:text-white sm:inline-flex"><Link href="/pricing">Pricing</Link></Button>
          <Button asChild variant="ghost" className="text-white/75 hover:bg-white/10 hover:text-white"><Link href="/login">Sign in</Link></Button>
          <Button asChild><Link href="/register">Create workspace<ArrowRight data-icon="inline-end" /></Link></Button>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p>© 2026 Orliqo. Evidence-backed outreach.</p>
        <nav className="flex flex-wrap gap-5"><Link href="/privacy" className="hover:text-foreground">Privacy</Link><Link href="/terms" className="hover:text-foreground">Terms</Link><Link href="/acceptable-use" className="hover:text-foreground">Acceptable use</Link></nav>
      </div>
    </footer>
  );
}

export function PublicDocument({ eyebrow, title, summary, children }: { eyebrow: string; title: string; summary: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background"><PublicHeader /><main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-5 py-16 outline-none sm:px-7 sm:py-24"><p className="text-sm font-semibold tracking-[0.12em] text-primary uppercase">{eyebrow}</p><h1 className="mt-4 text-4xl font-bold sm:text-5xl">{title}</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{summary}</p><div className="mt-12 space-y-8 border-t pt-10 text-[15px] leading-7 text-foreground/80 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_p]:text-muted-foreground">{children}</div></main><PublicFooter /></div>
  );
}
