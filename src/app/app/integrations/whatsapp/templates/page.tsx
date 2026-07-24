import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  MessageSquareText,
} from "lucide-react";

import { TemplateSyncButton } from "@/components/integrations/template-sync-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getWhatsAppTemplates } from "@/features/integrations/data";

export default async function WhatsAppTemplatesPage() {
  const templates = await getWhatsAppTemplates();
  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href="/app/integrations">
            <ArrowLeft />
            Integrations
          </Link>
        </Button>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">WhatsApp templates</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Official Meta Cloud API fixtures with language, quality,
              variables, approval, and rejection state.
            </p>
          </div>
          <TemplateSyncButton />
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {templates.map((template) => (
          <article key={template.id} className="bg-card rounded-xl border p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="bg-muted grid size-10 place-items-center rounded-lg border">
                <MessageSquareText className="size-5" />
              </span>
              <Badge
                variant={
                  template.status === "approved"
                    ? "default"
                    : template.status === "rejected"
                      ? "destructive"
                      : "secondary"
                }
              >
                {template.status}
              </Badge>
            </div>
            <h2 className="mt-4 text-lg font-semibold">{template.name}</h2>
            <div className="text-muted-foreground mt-1 flex flex-wrap gap-2 text-xs">
              <span>{template.language}</span>
              <span>·</span>
              <span className="capitalize">{template.category}</span>
              <span>·</span>
              <span className="capitalize">{template.quality} quality</span>
            </div>
            <div className="bg-muted/30 mt-4 rounded-lg border p-4 text-sm leading-6">
              {template.body}
            </div>
            <div className="text-muted-foreground mt-3 text-xs">
              Variables:{" "}
              {template.variables.length
                ? template.variables.join(", ")
                : "None"}
            </div>
            {template.rejectionReason ? (
              <div className="bg-destructive/8 text-destructive mt-3 flex gap-2 rounded-lg p-3 text-xs">
                <CircleAlert className="size-4 shrink-0" />
                {template.rejectionReason}
              </div>
            ) : (
              <div className="mt-3 flex gap-2 text-xs text-emerald-700">
                <CheckCircle2 className="size-4" />
                Approved templates may be selected outside the service window.
              </div>
            )}
          </article>
        ))}
      </div>
      <p className="bg-card text-muted-foreground rounded-xl border p-4 text-sm">
        Campaign launch is blocked whenever WhatsApp requires a template and the
        selected template is missing, paused, pending, rejected, or has
        incomplete variables.
      </p>
    </div>
  );
}
