import "server-only";

import { randomUUID } from "node:crypto";

import { fetchWithTimeout } from "@/lib/http";
import type { CalendarEvent, CalendarEventInput } from "./types";

type GoogleCalendarEvent = {
  id: string;
  summary: string;
  start: { dateTime: string };
  end?: { dateTime: string };
  extendedProperties?: { private?: Record<string, string> };
};

export interface CalendarProviderAdapter {
  create(
    input: CalendarEventInput,
  ): Promise<{ externalEventId: string; delivered: boolean }>;
  update(
    event: CalendarEvent,
    input: CalendarEventInput,
  ): Promise<{ externalEventId: string; delivered: boolean }>;
  delete(
    event: CalendarEvent,
  ): Promise<{ deleted: boolean; delivered: boolean }>;
}

function assertOwned(event: CalendarEvent): string {
  if (!event.orliqoOwned || !event.externalEventId)
    throw new Error("Only known Orliqo-owned external events may be changed.");
  return event.externalEventId;
}

export function createDemoCalendarAdapter(): CalendarProviderAdapter {
  return {
    async create() {
      return { externalEventId: `demo-${randomUUID()}`, delivered: false };
    },
    async update(event) {
      return { externalEventId: assertOwned(event), delivered: false };
    },
    async delete(event) {
      assertOwned(event);
      return { deleted: true, delivered: false };
    },
  };
}

export function createGoogleCalendarAdapter(input: {
  accessToken: string;
  calendarId: string;
  fetcher?: typeof fetch;
}): CalendarProviderAdapter {
  const fetcher = input.fetcher ?? fetch;
  const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events`;
  const request = async (url: string, init: RequestInit) => {
    const response = await fetchWithTimeout(
      fetcher,
      url,
      {
        ...init,
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          "content-type": "application/json",
          ...init.headers,
        },
        cache: "no-store",
      },
      12_000,
    );
    if (!response.ok)
      throw new Error(
        `Google Calendar request failed with ${response.status}.`,
      );
    return response;
  };
  const payload = (
    event: CalendarEventInput,
  ): Omit<GoogleCalendarEvent, "id"> => ({
    summary: event.title,
    start: { dateTime: event.startsAt },
    ...(event.endsAt ? { end: { dateTime: event.endsAt } } : {}),
    extendedProperties: {
      private: { orliqoOwned: "true", orliqoEventType: event.type },
    },
  });
  return {
    async create(event) {
      const response = await request(baseUrl, {
        method: "POST",
        body: JSON.stringify(payload(event)),
      });
      const result = (await response.json()) as GoogleCalendarEvent;
      if (!result.id)
        throw new Error("Google Calendar did not return an event ID.");
      return { externalEventId: result.id, delivered: true };
    },
    async update(existing, event) {
      const id = assertOwned(existing);
      const response = await request(`${baseUrl}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload(event)),
      });
      const result = (await response.json()) as GoogleCalendarEvent;
      return { externalEventId: result.id || id, delivered: true };
    },
    async delete(existing) {
      const id = assertOwned(existing);
      await request(`${baseUrl}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      return { deleted: true, delivered: true };
    },
  };
}
