"use client";

import { useState } from "react";
import { BookmarkPlus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { saveLeadViewAction } from "@/features/leads/actions";

export function SaveViewButton({ canSave }: { canSave: boolean }) {
  const [message, setMessage] = useState(""); const params = useSearchParams(); const pathname = usePathname(); const router = useRouter();
  async function save() { const name = window.prompt("Saved view name"); if (!name) return; const result = await saveLeadViewAction(name, params.toString()); setMessage(result.message); if (result.ok) router.replace(`${pathname}?${params.toString()}`); router.refresh(); }
  return <span className="inline-flex items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={!canSave} onClick={save}><BookmarkPlus />Save current view</Button>{message ? <span className="text-xs text-muted-foreground" role="status">{message}</span> : null}</span>;
}
