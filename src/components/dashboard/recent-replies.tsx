import { Mail } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InboxConversation } from "@/features/inbox/types";
import { cn } from "@/lib/utils";

function IntentBadge({ intent }: { intent: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        intent === "Positive" && "border-success/35 bg-success/8 text-success",
        intent === "Neutral" && "border-warning/45 bg-warning/8 text-amber-700",
        intent === "Negative" &&
          "border-destructive/35 bg-destructive/5 text-destructive",
      )}
    >
      {intent}
    </Badge>
  );
}

function displayIntent(intent: InboxConversation["intent"]) {
  if (["interested", "asking_price", "wants_information"].includes(intent))
    return "Positive";
  if (["not_interested", "stop_contact"].includes(intent)) return "Negative";
  return "Neutral";
}

export function RecentReplies({
  replies,
}: {
  replies: readonly InboxConversation[];
}) {
  return (
    <section
      className="bg-card overflow-hidden rounded-xl border"
      aria-labelledby="recent-replies-title"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 id="recent-replies-title" className="text-base font-bold">
          Recent replies
        </h2>
        <Link
          href="/app/inbox"
          className="text-primary text-xs font-medium hover:underline"
        >
          View all replies
        </Link>
      </div>
      <div className="hidden md:block">
        <Table aria-label="Recent demo replies">
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead className="w-[36%]">Preview</TableHead>
              <TableHead>Intent</TableHead>
              <TableHead>Time ↓</TableHead>
              <TableHead>
                <span className="sr-only">Action</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {replies.map((reply) => (
              <TableRow key={reply.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {reply.contactName
                          .split(" ")
                          .map((word) => word[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium whitespace-nowrap">
                      {reply.contactName}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {reply.businessName}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5">
                    {reply.channel === "linkedin" ? (
                      <span
                        className="bg-foreground text-background grid size-3.5 place-items-center rounded-[2px] text-[8px] font-bold"
                        aria-hidden="true"
                      >
                        in
                      </span>
                    ) : (
                      <Mail className="size-3.5" />
                    )}
                    {reply.channel}
                  </span>
                </TableCell>
                <TableCell className="max-w-0 truncate">
                  {reply.preview}
                </TableCell>
                <TableCell>
                  <IntentBadge intent={displayIntent(reply.intent)} />
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {reply.relativeTime}
                </TableCell>
                <TableCell>
                  <Button asChild variant="outline" size="xs">
                    <Link href={`/app/inbox?conversation=${reply.id}`}>
                      Open
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="divide-y md:hidden">
        {replies.slice(0, 3).map((reply) => (
          <Link
            key={reply.id}
            href={`/app/inbox?conversation=${reply.id}`}
            className="grid min-h-20 grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3"
          >
            <Avatar className="size-10">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {reply.businessName
                  .split(" ")
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {reply.businessName}
              </span>
              <span className="text-muted-foreground mt-1 block truncate text-xs">
                {reply.preview}
              </span>
              <span className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                <Mail className="size-3" />
                {reply.channel}
              </span>
            </span>
            <span className="text-right">
              <IntentBadge intent={displayIntent(reply.intent)} />
              <span className="text-muted-foreground mt-2 block text-xs">
                {reply.relativeTime}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
