"use client";

import { Building2, ChevronDown, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLockup } from "@/components/brand/brand-lockup";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { logoutAction, switchWorkspaceAction } from "@/features/auth/actions";
import { APP_ROUTES, HELP_ROUTE } from "@/features/navigation/app-routes";
import { ROLE_LABELS } from "@/features/permissions/permissions";
import type { WorkspaceContext } from "@/features/workspaces/types";
import { cn } from "@/lib/utils";

export function DesktopSidebar({ context }: { context: WorkspaceContext }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[228px] flex-col border-r border-white/10 bg-shell text-shell-foreground lg:flex">
      <div className="flex h-[68px] items-center px-5"><BrandLockup compact /></div>
      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-2.5 py-3">
        <ul className="space-y-0.5">
          {APP_ROUTES.map(({ label, href, icon: Icon, ...route }) => {
            const active = pathname === href || (href !== "/app/dashboard" && pathname.startsWith(`${href}/`));
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-white/76 transition-colors hover:bg-white/[0.07] hover:text-white", active && "bg-white/[0.09] text-white")}>
                  <Icon className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span className="flex-1 truncate">{label}</span>
                  {"badge" in route ? <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">{route.badge}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-left hover:bg-white/[0.08]">
            <Building2 className="size-4" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-xs font-medium">{context.activeWorkspace.name}</span>
            <ChevronDown className="size-4 text-white/55" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-64">
            <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {context.workspaces.map((workspace) => (
              <form action={switchWorkspaceAction} key={workspace.id}>
                <input type="hidden" name="workspaceId" value={workspace.id} />
                <button type="submit" className={cn("flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent", workspace.id === context.activeWorkspace.id && "bg-accent")}>
                  <span><span className="block font-medium">{workspace.name}</span><span className="block text-xs text-muted-foreground">{ROLE_LABELS[workspace.role]}</span></span>
                  <Badge variant="outline" className="capitalize">{workspace.plan}</Badge>
                </button>
              </form>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <a href={HELP_ROUTE.href} className="mt-1 flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] text-white/72 hover:bg-white/[0.07] hover:text-white">
          <HELP_ROUTE.icon className="size-[18px]" aria-hidden="true" />{HELP_ROUTE.label}
        </a>

        <div className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="size-8 border border-white/15"><AvatarFallback className="bg-white/12 text-xs text-white">{context.user.initials}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{context.user.fullName}</p><p className="truncate text-[11px] text-white/45">{context.activeWorkspace.plan === "growth" ? "Growth demo" : ROLE_LABELS[context.activeWorkspace.role]}</p></div>
        </div>

        <form action={logoutAction} className="mt-1">
          <button type="submit" className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] text-white/72 hover:bg-white/[0.07] hover:text-white">
            <LogOut className="size-[18px]" aria-hidden="true" />Logout
          </button>
        </form>
      </div>
    </aside>
  );
}
