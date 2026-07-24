import {
  Archive,
  Bot,
  CalendarCheck,
  CircleStop,
  Inbox,
  Mail,
  MessageCircle,
  MessageSquareText,
  Send,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  addConversationNoteFormAction,
  generateReplySuggestionFormAction,
  recordMeetingOutcomeFormAction,
  reviewReplySuggestionFormAction,
  scheduleApprovedReplyFormAction,
  sendApprovedReplyFormAction,
  setConversationReadFormAction,
  stopContactFormAction,
  updateConversationIntentFormAction,
} from "@/features/inbox/actions";
import type {
  InboxChannel,
  InboxConversation,
  InboxFolder,
} from "@/features/inbox/types";

const folders: Array<{ value: InboxFolder; label: string }> = [
  { value: "all", label: "All" },
  { value: "interested", label: "Interested" },
  { value: "needs_response", label: "Needs response" },
  { value: "follow_up_later", label: "Follow up later" },
  { value: "not_interested", label: "Not interested" },
  { value: "meetings", label: "Meetings" },
  { value: "archived", label: "Archived" },
  { value: "spam", label: "Spam" },
];
const channels: Array<{ value: InboxChannel | "all"; label: string }> = [
  { value: "all", label: "All channels" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
];

const intentLabels: Record<InboxConversation["intent"], string> = {
  interested: "Interested",
  asking_price: "Asking price",
  wants_information: "Wants information",
  follow_up_later: "Follow up later",
  not_interested: "Not interested",
  wrong_contact: "Wrong contact",
  stop_contact: "Stop contact",
  automatic_response: "Automatic response",
  unknown: "Unknown",
};

function inboxHref(
  folder: InboxFolder,
  channel: InboxChannel | "all",
  conversation?: string,
) {
  const query = new URLSearchParams({ folder, channel });
  if (conversation) query.set("conversation", conversation);
  return `/app/inbox?${query}`;
}

function ChannelIcon({ channel }: { channel: InboxChannel }) {
  return channel === "email" ? (
    <Mail />
  ) : channel === "whatsapp" ? (
    <MessageCircle />
  ) : (
    <MessageSquareText />
  );
}

export function InboxView({
  conversations,
  selected,
  counts,
  folder,
  channel,
  canReply,
  demo,
}: {
  conversations: InboxConversation[];
  selected: InboxConversation | null;
  counts: Record<InboxFolder, number>;
  folder: InboxFolder;
  channel: InboxChannel | "all";
  canReply: boolean;
  demo: boolean;
}) {
  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 flex gap-2">
            {demo ? <Badge variant="secondary">Synthetic inbox</Badge> : null}
          </div>
          <h1 className="text-3xl font-bold">Unified inbox</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review inbound conversations, intent evidence, lead context, and
            suggestion-only replies.
          </p>
        </div>
        <Badge variant="outline">
          <Inbox />
          {conversations.reduce(
            (total, item) => total + item.unreadCount,
            0,
          )}{" "}
          unread
        </Badge>
      </div>
      <form className="flex max-w-xl gap-2" method="get">
        <input type="hidden" name="folder" value={folder} />
        <input type="hidden" name="channel" value={channel} />
        <input
          name="q"
          aria-label="Search conversations"
          placeholder="Search people, businesses, messages, or campaigns"
          className="bg-background min-h-10 flex-1 rounded-lg border px-3 text-sm"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      <div className="bg-card grid overflow-hidden rounded-xl border lg:min-h-[680px] lg:grid-cols-[220px_340px_minmax(0,1fr)]">
        <aside className="border-b p-3 lg:border-r lg:border-b-0">
          <p className="text-muted-foreground px-2 py-2 text-xs font-semibold tracking-wider uppercase">
            Folders
          </p>
          <nav className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">
            {folders.map((item) => (
              <Link
                key={item.value}
                href={inboxHref(item.value, channel)}
                className={`flex min-h-10 items-center justify-between rounded-lg px-3 text-sm ${folder === item.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <span>{item.label}</span>
                <span className="text-xs opacity-75">{counts[item.value]}</span>
              </Link>
            ))}
          </nav>
          <p className="text-muted-foreground mt-4 px-2 py-2 text-xs font-semibold tracking-wider uppercase">
            Channels
          </p>
          <nav className="flex flex-wrap gap-1 lg:grid">
            {channels.map((item) => (
              <Link
                key={item.value}
                href={inboxHref(folder, item.value)}
                className={`rounded-lg border px-3 py-2 text-xs ${channel === item.value ? "border-primary bg-primary/8 text-primary" : "hover:bg-muted"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <section className="border-b lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="font-semibold">Conversations</h2>
              <p className="text-muted-foreground text-xs">
                Newest inbound first
              </p>
            </div>
            <Badge variant="outline">{conversations.length}</Badge>
          </div>
          <div className="divide-y">
            {conversations.length ? (
              conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={inboxHref(folder, channel, conversation.id)}
                  className={`hover:bg-muted/50 grid grid-cols-[auto_1fr_auto] gap-3 p-4 ${selected?.id === conversation.id ? "bg-primary/5" : ""}`}
                >
                  <span className="text-muted-foreground grid size-9 place-items-center rounded-lg border">
                    <ChannelIcon channel={conversation.channel} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <strong className="truncate text-sm">
                        {conversation.businessName}
                      </strong>
                      {conversation.unreadCount ? (
                        <span
                          className="bg-primary size-2 rounded-full"
                          aria-label="Unread"
                        />
                      ) : null}
                    </span>
                    <span className="text-muted-foreground mt-1 block truncate text-xs">
                      {conversation.preview}
                    </span>
                    <Badge variant="outline" className="mt-2">
                      {intentLabels[conversation.intent]}
                    </Badge>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {conversation.relativeTime}
                  </span>
                </Link>
              ))
            ) : (
              <div className="text-muted-foreground p-8 text-center text-sm">
                No conversations match these filters.
              </div>
            )}
          </div>
        </section>
        <section className="min-w-0">
          {selected ? (
            <div className="flex h-full flex-col">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                <div>
                  <h2 className="font-semibold">
                    {selected.contactName} · {selected.businessName}
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    {selected.campaignName} · Assigned to{" "}
                    {selected.assignedName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">Score {selected.score}</Badge>
                  <Badge>
                    {intentLabels[selected.intent]} ·{" "}
                    {Math.round(selected.intentConfidence * 100)}%
                  </Badge>
                </div>
                {canReply ? (
                  <div className="flex flex-wrap gap-2">
                    <form
                      action={setConversationReadFormAction.bind(
                        null,
                        selected.id,
                        selected.unreadCount === 0,
                      )}
                    >
                      <Button size="sm" variant="outline" type="submit">
                        Mark {selected.unreadCount ? "read" : "unread"}
                      </Button>
                    </form>
                    <form
                      action={updateConversationIntentFormAction.bind(
                        null,
                        selected.id,
                        "interested",
                      )}
                    >
                      <Button size="sm" variant="outline" type="submit">
                        Set interested
                      </Button>
                    </form>
                  </div>
                ) : null}
              </header>
              <div className="grid flex-1 gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-4">
                  <div className="space-y-3">
                    {selected.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`max-w-[88%] rounded-xl border p-3 text-sm leading-6 ${message.direction === "outbound" ? "bg-primary text-primary-foreground ml-auto" : "bg-background"}`}
                      >
                        <p>{message.body}</p>
                        <p className="mt-2 text-[11px] opacity-70">
                          {message.direction} · {message.deliveryStatus}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="border-primary/20 bg-primary/5 rounded-xl border p-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-primary size-4" />
                      <strong className="text-sm">AI suggestion</strong>
                      <Badge variant="outline">Suggestion only</Badge>
                      {selected.replySuggestion ? (
                        <Badge variant="secondary">
                          {selected.replySuggestion.status}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6">
                      {selected.aiSuggestion}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <form
                        action={generateReplySuggestionFormAction.bind(
                          null,
                          selected.id,
                          "generate",
                        )}
                      >
                        <Button size="sm" disabled={!canReply} type="submit">
                          <Bot />
                          Generate reply
                        </Button>
                      </form>
                      {(["shorten", "friendlier", "translate"] as const).map(
                        (mode) => (
                          <form
                            key={mode}
                            action={generateReplySuggestionFormAction.bind(
                              null,
                              selected.id,
                              mode,
                            )}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canReply}
                              type="submit"
                            >
                              {mode}
                            </Button>
                          </form>
                        ),
                      )}
                    </div>
                    {selected.replySuggestion ? (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        <div className="flex flex-wrap gap-2">
                          <form
                            action={reviewReplySuggestionFormAction.bind(
                              null,
                              selected.id,
                              selected.replySuggestion.id,
                              "approve",
                            )}
                          >
                            <Button
                              size="sm"
                              type="submit"
                              disabled={!canReply}
                            >
                              Approve
                            </Button>
                          </form>
                          <form
                            action={reviewReplySuggestionFormAction.bind(
                              null,
                              selected.id,
                              selected.replySuggestion.id,
                              "reject",
                            )}
                          >
                            <Button
                              size="sm"
                              type="submit"
                              variant="outline"
                              disabled={!canReply}
                            >
                              Reject
                            </Button>
                          </form>
                          <form
                            action={generateReplySuggestionFormAction.bind(
                              null,
                              selected.id,
                              "regenerate",
                            )}
                          >
                            <Button
                              size="sm"
                              type="submit"
                              variant="outline"
                              disabled={!canReply}
                            >
                              Regenerate
                            </Button>
                          </form>
                        </div>
                        <form
                          action={reviewReplySuggestionFormAction.bind(
                            null,
                            selected.id,
                            selected.replySuggestion.id,
                            "edit",
                          )}
                          className="space-y-2"
                        >
                          <textarea
                            name="body"
                            defaultValue={selected.replySuggestion.body}
                            required
                            maxLength={10000}
                            aria-label="Edit reply suggestion"
                            className="bg-background min-h-24 w-full rounded-lg border p-2 text-sm"
                          />
                          <Button
                            size="sm"
                            type="submit"
                            variant="outline"
                            disabled={!canReply}
                          >
                            Save edited version
                          </Button>
                        </form>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <form
                            action={scheduleApprovedReplyFormAction.bind(
                              null,
                              selected.id,
                              selected.replySuggestion.id,
                            )}
                            className="flex gap-2"
                          >
                            <input
                              type="datetime-local"
                              name="scheduledAt"
                              required
                              aria-label="Schedule reply"
                              className="bg-background min-h-9 min-w-0 flex-1 rounded-md border px-2 text-xs"
                            />
                            <Button
                              size="sm"
                              type="submit"
                              variant="outline"
                              disabled={
                                !canReply ||
                                selected.replySuggestion.status !== "accepted"
                              }
                            >
                              Schedule
                            </Button>
                          </form>
                          <form
                            action={sendApprovedReplyFormAction.bind(
                              null,
                              selected.id,
                              selected.replySuggestion.id,
                            )}
                          >
                            <Button
                              size="sm"
                              type="submit"
                              className="w-full"
                              disabled={
                                !canReply ||
                                demo ||
                                selected.replySuggestion.status !== "accepted"
                              }
                            >
                              <Send />
                              Send approved reply
                            </Button>
                          </form>
                        </div>
                      </div>
                    ) : null}
                    <p className="text-muted-foreground mt-2 text-xs">
                      No reply is sent automatically. Every generated version
                      remains suggestion-only until explicitly approved. Demo
                      mode never sends.
                    </p>
                  </div>
                </div>
                <aside className="space-y-3">
                  <div className="rounded-xl border p-4">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      Business context
                    </p>
                    <dl className="mt-3 grid gap-3 text-sm">
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          Lead status
                        </dt>
                        <dd className="font-medium">{selected.leadStatus}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          Campaign
                        </dt>
                        <dd className="font-medium">{selected.campaignName}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          Channel
                        </dt>
                        <dd className="font-medium capitalize">
                          {selected.channel}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      Notes
                    </p>
                    <p className="text-muted-foreground mt-3 text-sm">
                      {selected.notes[0] ?? "No notes yet."}
                    </p>
                    {canReply ? (
                      <form
                        action={addConversationNoteFormAction.bind(
                          null,
                          selected.id,
                        )}
                        className="mt-3 space-y-2"
                      >
                        <textarea
                          name="body"
                          required
                          maxLength={5000}
                          aria-label="Internal note"
                          placeholder="Add an internal note"
                          className="bg-background min-h-20 w-full rounded-lg border p-2 text-sm"
                        />
                        <Button type="submit" size="sm" variant="outline">
                          Add note
                        </Button>
                      </form>
                    ) : null}
                  </div>
                  {selected.intent === "stop_contact" ? (
                    <div className="border-destructive/30 bg-destructive/5 rounded-xl border p-4">
                      <div className="text-destructive flex items-center gap-2">
                        <CircleStop className="size-4" />
                        <strong className="text-sm">
                          Stop-contact detected
                        </strong>
                      </div>
                      <p className="text-muted-foreground mt-2 text-xs leading-5">
                        Resolving applies DNC, suppression, queue cancellation,
                        sequence stop, audit, and administrator notification
                        atomically.
                      </p>
                      <form
                        action={stopContactFormAction.bind(null, selected.id)}
                        className="mt-3"
                      >
                        <Button
                          type="submit"
                          size="sm"
                          variant="destructive"
                          disabled={!canReply}
                        >
                          Confirm stop contact
                        </Button>
                      </form>
                    </div>
                  ) : selected.status === "meeting" ? (
                    <div className="border-success/30 bg-success/5 rounded-xl border p-4">
                      <div className="text-success flex items-center gap-2">
                        <CalendarCheck className="size-4" />
                        <strong className="text-sm">Meeting outcome</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border p-4">
                      <div className="text-muted-foreground flex items-center gap-2">
                        <Archive className="size-4" />
                        <strong className="text-sm">Outcome controls</strong>
                      </div>
                      <p className="text-muted-foreground mt-2 text-xs">
                        Read state, notes, intent review, and suggestion
                        controls are available above.
                      </p>
                      <form
                        action={recordMeetingOutcomeFormAction.bind(
                          null,
                          selected.id,
                        )}
                        className="mt-3 space-y-2"
                      >
                        <input
                          name="title"
                          required
                          maxLength={200}
                          defaultValue={`Discovery call · ${selected.businessName}`}
                          aria-label="Meeting title"
                          className="bg-background min-h-9 w-full rounded-md border px-2 text-xs"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="datetime-local"
                            name="startsAt"
                            required
                            aria-label="Meeting start"
                            className="bg-background min-h-9 min-w-0 rounded-md border px-2 text-xs"
                          />
                          <input
                            type="datetime-local"
                            name="endsAt"
                            required
                            aria-label="Meeting end"
                            className="bg-background min-h-9 min-w-0 rounded-md border px-2 text-xs"
                          />
                        </div>
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={!canReply}
                        >
                          Record meeting
                        </Button>
                      </form>
                    </div>
                  )}
                </aside>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground grid min-h-80 place-items-center p-8 text-center text-sm">
              Select a conversation to inspect its history and context.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
