import {
  CampaignControls,
  MessageActions,
} from "@/components/campaigns/campaign-controls";
import { Badge } from "@/components/ui/badge";
import { getCampaigns, getCampaignDetail } from "@/features/campaigns/data";
import { getWorkspaceContext } from "@/features/workspaces/data";
import { StatePanel } from "@/components/feedback/state-panel";
export default async function QueuePage() {
  const [campaigns, context] = await Promise.all([
    getCampaigns(),
    getWorkspaceContext(),
  ]);
  const details = await Promise.all(
    campaigns.map((c) => getCampaignDetail(c.id)),
  );
  const rows = details.flatMap((d) => d?.messages ?? []);
  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Outreach queue</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Atomic claims, approvals, schedule windows, suppression, and provider
          safety gates.
        </p>
      </div>
      {campaigns[0] ? (
        <CampaignControls
          campaignId={campaigns[0].id}
          status={campaigns[0].status}
        />
      ) : null}
      <div className="space-y-2">
        {rows.map((m) => (
          <div
            key={m.id}
            className="bg-card grid gap-3 rounded-xl border p-4 lg:grid-cols-[160px_1fr_110px_110px_auto] lg:items-center"
          >
            <time className="text-muted-foreground text-xs">
              {m.scheduledAt
                ? new Date(m.scheduledAt).toLocaleString()
                : "Not scheduled"}
            </time>
            <div>
              <strong className="text-sm">{m.businessName}</strong>
              <p className="text-muted-foreground line-clamp-1 text-xs">
                {m.subject ?? m.body}
              </p>
            </div>
            <Badge variant="outline" className="w-fit capitalize">
              {m.channel}
            </Badge>
            <Badge variant="secondary" className="w-fit capitalize">
              {m.sendStatus}
            </Badge>
            <MessageActions
              id={m.id}
              demo={Boolean(context?.isDemo)}
              canApprove={m.approvalStatus !== "approved"}
              canSend={
                ["email", "whatsapp"].includes(m.channel) &&
                m.approvalStatus === "approved" &&
                ["scheduled", "queued"].includes(m.sendStatus)
              }
            />
          </div>
        ))}
        {!rows.length ? (
          <StatePanel
            variant="empty"
            title="The outreach queue is empty"
            description="Create a campaign, generate grounded messages, and approve them before launch."
            action={{ label: "Open campaigns", href: "/app/campaigns" }}
          />
        ) : null}
      </div>
    </div>
  );
}
