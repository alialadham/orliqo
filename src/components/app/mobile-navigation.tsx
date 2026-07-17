"use client";

import { Building2, ChevronRight, Coins, Ellipsis, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { logoutAction } from "@/features/auth/actions";
import { HELP_ROUTE, MOBILE_MORE_ROUTES, MOBILE_PRIMARY_ROUTES } from "@/features/navigation/app-routes";
import type { WorkspaceContext } from "@/features/workspaces/types";
import { cn } from "@/lib/utils";

function BottomItem({ href, label, icon: Icon, active, badge }: { href?: string; label: string; icon: typeof Ellipsis; active: boolean; badge?: number }) {
  const content = <><span className="relative"><Icon className="size-6" strokeWidth={1.8} aria-hidden="true" />{badge ? <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">{badge}</span> : null}</span><span className="text-[11px]">{label}</span></>;
  const classes = cn("flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-white/72", active && "text-primary");
  return href ? <Link href={href} className={classes} aria-current={active ? "page" : undefined}>{content}</Link> : <span className={classes}>{content}</span>;
}

export function MobileNavigation({ context }: { context: WorkspaceContext }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = MOBILE_MORE_ROUTES.some(({ href }) => pathname.startsWith(href));

  return (
    <div className="lg:hidden">
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 flex min-h-[76px] border-t border-white/10 bg-shell px-1 pb-[env(safe-area-inset-bottom)] text-white">
        {MOBILE_PRIMARY_ROUTES.map(({ label, href, icon, ...route }) => <BottomItem key={href} href={href} label={label} icon={icon} active={pathname === href || pathname.startsWith(`${href}/`)} badge={"badge" in route ? route.badge : undefined} />)}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild><button type="button" className={cn("flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-white/72", (open || moreActive) && "text-primary")}><Ellipsis className="size-6" aria-hidden="true" /><span className="text-[11px]">More</span></button></SheetTrigger>
          <SheetContent side="right" className="w-full max-w-none gap-0 border-0 bg-background p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:max-w-none" showCloseButton={false}>
            <div className="flex min-h-[72px] items-center justify-between bg-shell px-4 text-white">
              <Avatar className="size-9 border border-white/20"><AvatarFallback className="bg-white/12 text-xs text-white">{context.user.initials}</AvatarFallback></Avatar>
              <SheetTitle className="text-xl font-bold text-white">More</SheetTitle>
              <SheetClose className="grid size-11 place-items-center text-3xl" aria-label="Close menu">×</SheetClose>
              <SheetDescription className="sr-only">Workspace navigation and account actions</SheetDescription>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pt-5 pb-24">
              <Link href="/app/settings/workspace" onClick={() => setOpen(false)} className="flex min-h-20 items-center gap-3 rounded-xl border bg-card px-4">
                <span className="grid size-12 place-items-center rounded-xl bg-primary/10"><Building2 className="size-5 text-primary" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-lg font-semibold">{context.activeWorkspace.name}</span><span className="block text-sm text-muted-foreground capitalize">{context.activeWorkspace.plan} demo</span></span><ChevronRight className="size-5" />
              </Link>
              <Link href="/app/billing" onClick={() => setOpen(false)} className="mt-4 block rounded-xl border bg-card p-4">
                <span className="flex items-center gap-3 text-base font-semibold"><Coins className="size-6" />{context.activeWorkspace.credits} credits remaining</span>
                <Progress value={32} className="mt-3 h-1.5" />
              </Link>
              <nav aria-label="More navigation" className="mt-6 px-1">
                {MOBILE_MORE_ROUTES.map(({ label, href, icon: Icon }) => (
                  <SheetClose asChild key={href}><Link href={href} className="flex min-h-14 items-center gap-4 border-b px-2 text-base"><Icon className="size-5" strokeWidth={1.75} /><span className="flex-1">{label}</span><ChevronRight className="size-4" /></Link></SheetClose>
                ))}
              </nav>
              <div className="mt-6 overflow-hidden rounded-xl border bg-card">
                <a href={HELP_ROUTE.href} className="flex min-h-14 items-center gap-4 border-b px-4 text-base"><HELP_ROUTE.icon className="size-5" /><span className="flex-1">{HELP_ROUTE.label}</span><ChevronRight className="size-4" /></a>
                <form action={logoutAction}><button type="submit" className="flex min-h-14 w-full items-center gap-4 px-4 text-left text-base text-destructive"><LogOut className="size-5" /><span className="flex-1">Logout</span><ChevronRight className="size-4" /></button></form>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex min-h-[76px] border-t border-white/10 bg-shell px-1 pb-[env(safe-area-inset-bottom)] text-white">
              {MOBILE_PRIMARY_ROUTES.map(({ label, href, icon: Icon, ...route }) => <SheetClose asChild key={href}><Link href={href} className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-white/72"><span className="relative"><Icon className="size-6" />{"badge" in route ? <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-primary text-[10px]">{route.badge}</span> : null}</span><span className="text-[11px]">{label}</span></Link></SheetClose>)}
              <BottomItem label="More" icon={Ellipsis} active />
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
