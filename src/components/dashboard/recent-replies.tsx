import { Mail } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEMO_RECENT_REPLIES } from "@/features/demo/data";
import { cn } from "@/lib/utils";

function IntentBadge({ intent }: { intent: string }) {
  return <Badge variant="outline" className={cn(intent === "Positive" && "border-success/35 bg-success/8 text-success", intent === "Neutral" && "border-warning/45 bg-warning/8 text-amber-700", intent === "Negative" && "border-destructive/35 bg-destructive/5 text-destructive")}>{intent}</Badge>;
}

export function RecentReplies() {
  return (
    <section className="overflow-hidden rounded-xl border bg-card" aria-labelledby="recent-replies-title">
      <div className="flex items-center justify-between border-b px-4 py-3"><h2 id="recent-replies-title" className="text-base font-bold">Recent replies</h2><Link href="/app/inbox" className="text-xs font-medium text-primary hover:underline">View all replies</Link></div>
      <div className="hidden md:block">
        <Table aria-label="Recent demo replies">
          <TableHeader><TableRow><TableHead>Contact</TableHead><TableHead>Company</TableHead><TableHead>Channel</TableHead><TableHead className="w-[36%]">Preview</TableHead><TableHead>Intent</TableHead><TableHead>Time ↓</TableHead><TableHead><span className="sr-only">Action</span></TableHead></TableRow></TableHeader>
          <TableBody>{DEMO_RECENT_REPLIES.map((reply) => <TableRow key={reply.id}><TableCell><div className="flex items-center gap-2"><Avatar className="size-7"><AvatarFallback className="bg-primary/10 text-[10px] text-primary">{reply.contact.split(" ").map((word) => word[0]).join("")}</AvatarFallback></Avatar><span className="whitespace-nowrap font-medium">{reply.contact}</span></div></TableCell><TableCell className="whitespace-nowrap">{reply.company}</TableCell><TableCell><span className="flex items-center gap-1.5">{reply.channel === "LinkedIn" ? <span className="grid size-3.5 place-items-center rounded-[2px] bg-foreground text-[8px] font-bold text-background" aria-hidden="true">in</span> : <Mail className="size-3.5" />}{reply.channel}</span></TableCell><TableCell className="max-w-0 truncate">{reply.preview}</TableCell><TableCell><IntentBadge intent={reply.intent} /></TableCell><TableCell className="whitespace-nowrap text-muted-foreground">{reply.time}</TableCell><TableCell><Button asChild variant="outline" size="xs"><Link href={`/app/inbox?conversation=${reply.id}`}>Open</Link></Button></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
      <div className="divide-y md:hidden">
        {DEMO_RECENT_REPLIES.slice(0, 3).map((reply) => <Link key={reply.id} href={`/app/inbox?conversation=${reply.id}`} className="grid min-h-20 grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3"><Avatar className="size-10"><AvatarFallback className="bg-primary/10 text-xs text-primary">{reply.company.split(" ").map((word) => word[0]).slice(0, 2).join("")}</AvatarFallback></Avatar><span className="min-w-0"><span className="block truncate text-sm font-semibold">{reply.company}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{reply.preview}</span><span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Mail className="size-3" />{reply.channel}</span></span><span className="text-right"><IntentBadge intent={reply.intent} /><span className="mt-2 block text-xs text-muted-foreground">{reply.time}</span></span></Link>)}
      </div>
    </section>
  );
}
