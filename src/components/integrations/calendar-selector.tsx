"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { selectGoogleCalendarAction } from "@/features/integrations/actions";
import type { CalendarOption } from "@/features/integrations/types";

export function CalendarSelector({ options }: { options: CalendarOption[] }) {
  const initial =
    options.find((option) => option.selected)?.id ?? options[0]?.id ?? "";
  const [value, setValue] = useState(initial);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const selected = options.find((option) => option.id === value);
  if (!options.length)
    return (
      <p className="text-muted-foreground text-xs">
        Connect Google Calendar to select a writable calendar.
      </p>
    );
  return (
    <div className="grid gap-2">
      <Label htmlFor="calendar-selection">Google Calendar</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger id="calendar-selection" className="min-w-0 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
                {option.primary ? " · Primary" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !selected}
          onClick={() =>
            selected &&
            startTransition(async () => {
              setMessage(
                (await selectGoogleCalendarAction(selected.id, selected.label))
                  .message,
              );
              router.refresh();
            })
          }
        >
          Select
        </Button>
      </div>
      {message ? (
        <p role="status" className="text-muted-foreground text-xs">
          {message}
        </p>
      ) : null}
    </div>
  );
}
