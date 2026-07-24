"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarPlus, LockKeyhole, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCalendarEventAction,
  deleteCalendarEventAction,
} from "@/features/integrations/actions";
import type {
  CalendarEvent,
  CalendarEventType,
} from "@/features/integrations/types";

const typeStyles: Record<CalendarEventType, string> = {
  message: "bg-blue-500/10 text-blue-700",
  follow_up: "bg-violet-500/10 text-violet-700",
  meeting: "bg-emerald-500/10 text-emerald-700",
  campaign: "bg-amber-500/10 text-amber-700",
  call: "bg-cyan-500/10 text-cyan-700",
};

export function CalendarBoard({
  events,
  defaultStart,
}: {
  events: CalendarEvent[];
  defaultStart: string;
}) {
  const [view, setView] = useState<"week" | "month">("week");
  const [type, setType] = useState<CalendarEventType>("meeting");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const visible = useMemo(
    () =>
      events
        .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt))
        .slice(0, view === "week" ? 7 : 31),
    [events, view],
  );
  const run = (action: () => Promise<{ message: string }>) =>
    startTransition(async () => {
      setMessage((await action()).message);
      router.refresh();
    });

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <section className="bg-card rounded-xl border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="font-semibold">Outreach schedule</h2>
            <p className="text-muted-foreground text-xs">
              Workspace timezone · Asia/Amman
            </p>
          </div>
          <div className="flex rounded-lg border p-1">
            <Button
              size="sm"
              variant={view === "week" ? "secondary" : "ghost"}
              onClick={() => setView("week")}
            >
              Week
            </Button>
            <Button
              size="sm"
              variant={view === "month" ? "secondary" : "ghost"}
              onClick={() => setView("month")}
            >
              Month
            </Button>
          </div>
        </div>
        <div className="divide-y">
          {visible.map((event) => (
            <div
              key={event.id}
              className="grid gap-3 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center"
            >
              <time className="text-muted-foreground text-xs">
                <strong className="text-foreground block text-sm">
                  {new Date(event.startsAt).toLocaleDateString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </strong>
                {new Date(event.startsAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm">{event.title}</strong>
                  <Badge variant="secondary" className={typeStyles[event.type]}>
                    {event.type.replace("_", " ")}
                  </Badge>
                  {!event.orliqoOwned ? (
                    <Badge variant="outline">
                      <LockKeyhole />
                      External · read-only
                    </Badge>
                  ) : null}
                </div>
                {event.leadName ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Lead · {event.leadName}
                  </p>
                ) : null}
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={pending || !event.orliqoOwned}
                aria-label={`Delete ${event.title}`}
                onClick={() => run(() => deleteCalendarEventAction(event.id))}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </section>
      <aside className="bg-card h-fit rounded-xl border p-4">
        <div className="flex items-center gap-2">
          <CalendarPlus className="size-4" />
          <h2 className="font-semibold">Schedule event</h2>
        </div>
        <form
          className="mt-4 grid gap-3"
          action={(formData) => {
            const startsAt = new Date(
              String(formData.get("startsAt")),
            ).toISOString();
            const duration = Number(formData.get("duration") ?? 30);
            run(() =>
              createCalendarEventAction({
                title: String(formData.get("title")),
                type,
                startsAt,
                endsAt: new Date(
                  new Date(startsAt).getTime() + duration * 60_000,
                ).toISOString(),
                leadName: String(formData.get("leadName") || "") || undefined,
              }),
            );
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              name="title"
              defaultValue="Discovery meeting"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="event-type">Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as CalendarEventType)}
            >
              <SelectTrigger id="event-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="campaign">Campaign</SelectItem>
                <SelectItem value="message">Message</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="event-start">Start</Label>
            <Input
              id="event-start"
              name="startsAt"
              type="datetime-local"
              defaultValue={defaultStart}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="event-duration">Duration</Label>
            <Select name="duration" defaultValue="30">
              <SelectTrigger id="event-duration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="event-lead">Lead (optional)</Label>
            <Input
              id="event-lead"
              name="leadName"
              placeholder="Business name"
            />
          </div>
          <Button disabled={pending}>
            {pending ? "Scheduling…" : "Schedule in sandbox"}
          </Button>
        </form>
        {message ? (
          <p
            role="status"
            className="text-muted-foreground mt-3 text-xs leading-5"
          >
            {message}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
