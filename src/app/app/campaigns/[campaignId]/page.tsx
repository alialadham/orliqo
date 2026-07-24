import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CampaignControls,
  MessageActions,
} from "@/components/campaigns/campaign-controls";
import { Badge } from "@/components/ui/badge";
import { getCampaignDetail } from "@/features/campaigns/data";
import { getWorkspaceContext } from "@/features/workspaces/data";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const [data, context] = await Promise.all([
    getCampaignDetail(campaignId),
    getWorkspaceContext(),
  ]);
  if (!data) notFound();
  const navigation = [
    ["Overview", "#overview"],
    ["Leads", "/app/leads"],
    ["Messages", "#messages"],
    ["Queue", "/app/queue"],
    ["Replies", "/app/inbox"],
    ["Analytics", "/app/analytics"],
    ["Settings", "/app/settings/workspace"],
    ["Activity", "#activity"],
  ] as const;
  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{data.campaign.name}</h1>
            <Badge variant="outline" className="capitalize">
              {data.campaign.status.replaceAll("_", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {data.campaign.description}
          </p>
        </div>
        <CampaignControls
          campaignId={campaignId}
          status={data.campaign.status}
        />
      </div>
      <section
        id="overview"
        aria-label="Campaign overview"
        className="grid gap-3 sm:grid-cols-4"
      >
        {[
          ["Messages", data.messages.length],
          ["Ready", data.queueHealth.ready],
          ["Reserved", data.queueHealth.reserved],
          ["Usage", `${data.queueHealth.used}/${data.queueHealth.limit}`],
        ].map(([label, value]) => (
          <div key={label} className="bg-card rounded-xl border p-4">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </section>
      <nav
        aria-label="Campaign sections"
        className="flex gap-4 overflow-x-auto border-b text-sm font-semibold"
      >
        {navigation.map(([label, href]) => (
          <Link
            key={label}
            href={href}
            className={`border-b-2 px-1 pb-3 whitespace-nowrap ${
              label === "Messages"
                ? "border-primary text-primary"
                : "text-muted-foreground border-transparent"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <section
        id="messages"
        aria-labelledby="messages-heading"
        className="space-y-3"
      >
        <h2 id="messages-heading" className="sr-only">
          Campaign messages
        </h2>
        {data.messages.map((message) => (
          <article key={message.id} className="bg-card rounded-xl border p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <strong>{message.businessName}</strong>
                  <Badge variant="outline" className="capitalize">
                    {message.channel}
                  </Badge>
                  <Badge variant="secondary" className="capitalize">
                    {message.approvalStatus.replaceAll("_", " ")}
                  </Badge>
                </div>
                {message.subject ? (
                  <p className="mt-2 text-sm font-semibold">
                    {message.subject}
                  </p>
                ) : null}
                <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-6">
                  {message.body}
                </p>
                <p className="text-primary mt-2 text-xs">
                  Grounded in {message.sourceIds.length} stored source ·{" "}
                  {Math.round(message.confidence * 100)}% confidence · v
                  {message.versions.length}
                </p>
              </div>
              <MessageActions
                id={message.id}
                canApprove={message.approvalStatus !== "approved"}
                canSend={message.approvalStatus === "approved"}
                demo={Boolean(context?.isDemo)}
              />
            </div>
          </article>
        ))}
        {!data.messages.length ? (
          <div className="bg-card text-muted-foreground rounded-xl border p-10 text-center text-sm">
            Generate messages after the audience is ready.
          </div>
        ) : null}
      </section>
      <section
        id="activity"
        aria-labelledby="activity-heading"
        className="bg-card rounded-xl border p-5"
      >
        <h2 id="activity-heading" className="font-bold">
          Activity
        </h2>
        {data.activity.length ? (
          <ol className="mt-3 space-y-2">
            {data.activity.map((activity) => (
              <li
                key={activity.id}
                className="flex justify-between gap-4 text-sm"
              >
                <span className="capitalize">{activity.summary}</span>
                <time className="text-muted-foreground text-xs">
                  {new Date(activity.createdAt).toLocaleString()}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground mt-2 text-sm">
            No campaign activity has been recorded.
          </p>
        )}
      </section>
    </div>
  );
}
