"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SearchRecord = { id: string; type: string; title: string; href: string };

export function GlobalSearch({ records, mobile = false, onNavigate }: { records: readonly SearchRecord[]; mobile?: boolean; onNavigate?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const results = deferredQuery
    ? records.filter((record) => `${record.type} ${record.title}`.toLowerCase().includes(deferredQuery)).slice(0, 7)
    : [];

  useEffect(() => {
    if (mobile) return;
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, [mobile]);

  const finishNavigation = () => {
    setFocused(false);
    setQuery("");
    onNavigate?.();
  };

  return (
    <div className={cn("relative", mobile ? "w-full" : "w-[min(500px,42vw)]")}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 140)}
        placeholder="Search campaigns, leads, conversations..."
        aria-label="Search this workspace"
        className={cn("h-10 border-white/12 pl-9", mobile ? "border-input bg-card pr-10 text-base" : "bg-white/[0.055] text-shell-foreground placeholder:text-white/45 focus-visible:border-primary")}
      />
      {!mobile ? <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] text-white/45">⌘ K</kbd> : null}
      {mobile && query ? (
        <Button type="button" variant="ghost" size="icon-sm" className="absolute top-1/2 right-1 -translate-y-1/2" onClick={() => setQuery("")} aria-label="Clear search"><X /></Button>
      ) : null}
      {focused && deferredQuery ? (
        <div className={cn("absolute top-[calc(100%+8px)] z-50 overflow-hidden rounded-lg border bg-popover p-1 shadow-xl", mobile ? "inset-x-0" : "inset-x-0")}>
          {results.length ? results.map((record) => (
            <Link key={record.id} href={record.href} onClick={finishNavigation} className="flex min-h-11 items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent focus:bg-accent">
              <span className="truncate font-medium">{record.title}</span>
              <span className="ml-3 text-xs text-muted-foreground">{record.type}</span>
            </Link>
          )) : <p className="px-3 py-6 text-center text-sm text-muted-foreground">No results in this workspace.</p>}
        </div>
      ) : null}
    </div>
  );
}
