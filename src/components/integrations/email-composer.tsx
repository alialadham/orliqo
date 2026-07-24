"use client";

import { useState, useTransition } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { sendTestEmailAction } from "@/features/integrations/actions";

export function EmailComposer({
  accounts,
  noSend,
}: {
  accounts: Array<{ provider: string; label: string }>;
  noSend: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [provider, setProvider] = useState(accounts[0]?.provider ?? "gmail");

  return (
    <form
      className="grid gap-4"
      action={(formData) => {
        formData.set("provider", provider);
        startTransition(async () =>
          setMessage((await sendTestEmailAction(formData)).message),
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="email-provider">From account</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger id="email-provider" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.provider} value={account.provider}>
                  {account.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            name="from"
            type="email"
            defaultValue="hello@northstar.demo"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            name="to"
            type="email"
            defaultValue="recipient@example.com"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            name="subject"
            defaultValue="Your requested website audit"
            required
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="body">Message</Label>
        <Textarea
          id="body"
          name="body"
          rows={5}
          defaultValue="Hello — this provider test validates configuration, recipient gates, and delivery mode."
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="signature">Signature</Label>
          <Input
            id="signature"
            name="signature"
            defaultValue="Northstar Growth"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="follow-up">Follow-up after</Label>
          <Select name="followUpDays" defaultValue="3">
            <SelectTrigger id="follow-up" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No follow-up</SelectItem>
              <SelectItem value="3">3 days</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          name="tracking"
          type="checkbox"
          className="accent-primary size-4"
        />
        Enable workspace-controlled open tracking for this test
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} type="submit">
          {pending
            ? "Validating…"
            : noSend
              ? "Validate test email"
              : "Send provider test email"}
        </Button>
        <span className="text-muted-foreground text-xs">
          One recipient · HTML + text · no BCC ·{" "}
          {noSend
            ? "no-send validation"
            : "uses the selected validated provider"}
        </span>
      </div>
      {message ? (
        <p role="status" className="bg-muted/40 rounded-lg border p-3 text-sm">
          {message}
        </p>
      ) : null}
    </form>
  );
}
