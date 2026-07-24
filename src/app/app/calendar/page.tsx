import Link from "next/link";
import { Plug } from "lucide-react";

import { CalendarBoard } from "@/components/integrations/calendar-board";
import { CalendarSelector } from "@/components/integrations/calendar-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getCalendarEvents,
  getCalendarOptions,
  getIntegrations,
} from "@/features/integrations/data";

export default async function CalendarPage() {
  const [events, integrations, options] = await Promise.all([
    getCalendarEvents(),
    getIntegrations(),
    getCalendarOptions(),
  ]);
  const calendar = integrations.find(
    (item) => item.provider === "google_calendar",
  );
  const defaultStart =
    events.find((event) => event.orliqoOwned)?.startsAt.slice(0, 16) ?? "";
  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-3 flex gap-2">
            <Badge variant="outline">Month + week</Badge>
            <Badge
              variant={
                calendar?.status === "connected" ? "default" : "secondary"
              }
            >
              Google Calendar · {calendar?.status ?? "disconnected"}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Messages, follow-ups, meetings, campaign bounds, and manual calls in
            the workspace timezone.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/integrations">
            <Plug />
            Calendar connection
          </Link>
        </Button>
      </div>
      <div className="bg-card max-w-xl rounded-xl border p-4">
        <CalendarSelector options={options} />
      </div>
      <CalendarBoard events={events} defaultStart={defaultStart} />
    </div>
  );
}
