"use client";

import { Bell, ChevronDown, Coins, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { GlobalSearch, type SearchRecord } from "@/components/app/global-search";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { logoutAction } from "@/features/auth/actions";
import type { WorkspaceContext } from "@/features/workspaces/types";

export function DesktopTopBar({ context, searchRecords }: { context: WorkspaceContext; searchRecords: readonly SearchRecord[] }) {
  return (
    <header className="sticky top-0 z-30 hidden h-[68px] items-center justify-between gap-5 border-b border-white/10 bg-shell px-6 text-shell-foreground lg:flex">
      <GlobalSearch records={searchRecords} />
      <div className="flex items-center gap-2.5">
        <Button asChild variant="outline" className="border-white/12 bg-white/[0.045] text-white hover:bg-white/[0.09] hover:text-white">
          <Link href="/app/billing"><Coins data-icon="inline-start" />{context.activeWorkspace.credits} credits</Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/10 hover:text-white" aria-label="Notifications">
              <Bell /><span className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-shell" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel><DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/app/inbox" className="flex-col items-start"><span className="font-medium">3 replies need review</span><span className="text-xs text-muted-foreground">Demo inbox · 8 minutes ago</span></Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/app/integrations" className="flex-col items-start"><span className="font-medium">Outlook test connection expired</span><span className="text-xs text-muted-foreground">Reconnect before live use</span></Link></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button asChild className="shadow-lg shadow-primary/15"><Link href="/app/campaigns/new"><Plus data-icon="inline-start" />New Campaign</Link></Button>
        <DropdownMenu>
          <DropdownMenuTrigger className="ml-1 flex items-center gap-1 rounded-full p-1 hover:bg-white/10" aria-label="Open user menu">
            <Avatar className="size-8 border border-white/20"><AvatarFallback className="bg-white/12 text-xs text-white">{context.user.initials}</AvatarFallback></Avatar><ChevronDown className="size-4 text-white/60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel><span className="block">{context.user.fullName}</span><span className="block truncate text-xs font-normal text-muted-foreground">{context.user.email}</span></DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/app/settings/workspace">Workspace settings</Link></DropdownMenuItem>
            <form action={logoutAction}><DropdownMenuItem asChild><button type="submit" className="w-full">Logout</button></DropdownMenuItem></form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function MobileHeader({ context, searchRecords }: { context: WorkspaceContext; searchRecords: readonly SearchRecord[] }) {
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between bg-shell px-4 text-white lg:hidden">
      <BrandLockup compact />
      <div className="flex items-center gap-1">
        <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
          <SheetTrigger asChild><Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" aria-label="Search workspace"><Search /></Button></SheetTrigger>
          <SheetContent side="top" className="gap-3 px-4 pt-16 pb-7" showCloseButton>
            <SheetHeader className="p-0"><SheetTitle>Search workspace</SheetTitle></SheetHeader>
            <GlobalSearch records={searchRecords} mobile onNavigate={() => setSearchOpen(false)} />
          </SheetContent>
        </Sheet>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="relative text-white hover:bg-white/10 hover:text-white" aria-label="Notifications"><Bell /><span className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-shell" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72"><DropdownMenuLabel>Notifications</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/app/inbox">3 replies need review</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/app/integrations">Outlook test connection expired</Link></DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
        <Avatar className="ml-1 size-9 border border-white/20"><AvatarFallback className="bg-white/12 text-xs text-white">{context.user.initials}</AvatarFallback></Avatar>
      </div>
    </header>
  );
}
