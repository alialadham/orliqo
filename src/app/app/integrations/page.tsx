import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Mail,
  MessageCircle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { EmailComposer } from "@/components/integrations/email-composer";
import { IntegrationControls } from "@/components/integrations/integration-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatePanel } from "@/components/feedback/state-panel";
import { getIntegrations } from "@/features/integrations/data";
import { requirePermission } from "@/features/permissions/server";

const EMAIL_PROVIDERS = new Set(["gmail", "outlook", "smtp", "resend", "ses"]);

function statusVariant(status: string) {
  return status === "connected"
    ? ("default" as const)
    : status === "expired" || status === "error"
      ? ("destructive" as const)
      : ("secondary" as const);
}

export default async function IntegrationsPage() {
  const context = await requirePermission("integrations:view");
  if (!context)
    return (
      <StatePanel
        variant="permission"
        title="Permission required"
        description="Your role cannot view provider integrations."
        action={{ label: "Back to dashboard", href: "/app/dashboard" }}
      />
    );
  const integrations = await getIntegrations();
  const email = integrations.filter((item) =>
    EMAIL_PROVIDERS.has(item.provider),
  );
  const whatsapp = integrations.find((item) => item.provider === "whatsapp");
  const calendar = integrations.find(
    (item) => item.provider === "google_calendar",
  );
  const demoOnly = integrations.every((item) => item.health.mode === "demo");

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-3">
            <ShieldCheck />
            {demoOnly ? "Deterministic sandbox" : "Server-validated providers"}
          </Badge>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
            Validate provider capabilities, health, limits, and official-channel
            safety{" "}
            {demoOnly
              ? "without live credentials or external delivery"
              : "before provider operations"}
            .
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/integrations/manual-social">
            Manual social workflow
          </Link>
        </Button>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Email accounts</h2>
          <p className="text-muted-foreground text-sm">
            Gmail, Microsoft Graph, SMTP, Resend, and SES share one normalized
            adapter contract.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {email.map((item) => (
            <Card key={item.id} size="sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <span className="bg-muted grid size-9 place-items-center rounded-lg border">
                    <Mail className="size-4" />
                  </span>
                  <Badge
                    variant={statusVariant(item.status)}
                    className="capitalize"
                  >
                    {item.status}
                  </Badge>
                </div>
                <CardTitle className="mt-2">{item.displayName}</CardTitle>
                <CardDescription>{item.accountLabel}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground min-h-10 text-xs leading-5">
                  {item.description}
                </p>
                {item.dailyLimit ? (
                  <dl className="bg-muted/50 grid grid-cols-2 gap-2 rounded-lg p-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Daily usage</dt>
                      <dd className="mt-1 font-semibold">
                        {item.sentToday}/{item.dailyLimit}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Health</dt>
                      <dd className="mt-1 font-semibold">
                        {item.health.ok
                          ? "Healthy"
                          : item.health.errorCode?.replaceAll("_", " ")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Bounce</dt>
                      <dd className="mt-1 font-semibold">
                        {((item.bounceRate ?? 0) * 100).toFixed(1)}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Reply</dt>
                      <dd className="mt-1 font-semibold">
                        {((item.replyRate ?? 0) * 100).toFixed(1)}%
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <div className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-xs">
                    Connect and validate before this provider can become ready.
                  </div>
                )}
                <IntegrationControls
                  id={item.id}
                  provider={item.provider}
                  status={item.status}
                  canPause={Boolean(item.dailyLimit)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        {whatsapp ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <span className="bg-muted grid size-10 place-items-center rounded-lg border">
                  <MessageCircle className="size-5" />
                </span>
                <Badge variant={statusVariant(whatsapp.status)}>
                  {whatsapp.status}
                </Badge>
              </div>
              <CardTitle className="mt-3">
                Official WhatsApp Cloud API
              </CardTitle>
              <CardDescription>
                {whatsapp.accountLabel} · No WhatsApp Web, QR sessions, or
                unofficial automation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="bg-muted/50 grid grid-cols-2 gap-3 rounded-lg p-4 text-xs">
                <div>
                  <dt className="text-muted-foreground">Business</dt>
                  <dd className="mt-1 font-semibold">
                    {String(whatsapp.configuration.waba)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Quality</dt>
                  <dd className="mt-1 font-semibold">
                    {String(whatsapp.configuration.quality)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Messaging limit</dt>
                  <dd className="mt-1 font-semibold">
                    {String(whatsapp.configuration.limit)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Webhook</dt>
                  <dd className="mt-1 font-semibold">
                    {String(whatsapp.configuration.webhook)}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href="/app/integrations/whatsapp/templates">
                    Manage templates
                  </Link>
                </Button>
                <IntegrationControls
                  id={whatsapp.id}
                  provider={whatsapp.provider}
                  status={whatsapp.status}
                  canPause
                />
              </div>
            </CardContent>
          </Card>
        ) : null}
        {calendar ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <span className="bg-muted grid size-10 place-items-center rounded-lg border">
                  <CalendarDays className="size-5" />
                </span>
                <Badge variant={statusVariant(calendar.status)}>
                  {calendar.status}
                </Badge>
              </div>
              <CardTitle className="mt-3">Google Calendar</CardTitle>
              <CardDescription>{calendar.accountLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Ownership guard active
                </div>
                <p className="text-muted-foreground mt-2 text-xs leading-5">
                  Only events created by Orliqo and carrying a known external ID
                  may be updated or deleted. Unrelated calendar events remain
                  read-only.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href="/app/calendar">Open calendar</Link>
                </Button>
                <IntegrationControls
                  id={calendar.id}
                  provider={calendar.provider}
                  status={calendar.status}
                  canPause={false}
                />
              </div>
            </CardContent>
          </Card>
        ) : null}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Test email composer</CardTitle>
          <CardDescription>
            Validates sender, one recipient, subject, HTML/text parity, limits,
            threading fields, idempotency, signature, and follow-up settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailComposer
            accounts={email
              .filter((item) => item.status === "connected" && !item.paused)
              .map((item) => ({
                provider: item.provider,
                label: `${item.displayName} · ${item.accountLabel}`,
              }))}
            noSend={email.every((item) => item.health.mode === "demo")}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
        <p>
          <strong>
            {demoOnly
              ? "Live delivery remains locked."
              : "Provider safety checks remain active."}
          </strong>{" "}
          A provider becomes live only after server-side credential validation,
          successful readiness checks, and explicit environment configuration.
          {demoOnly
            ? " This workspace has no live credentials."
            : " Connected status reflects a completed server check."}
        </p>
      </div>
    </div>
  );
}
