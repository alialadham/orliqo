import "server-only";

import { demoPhase2Store } from "@/features/demo/phase2-store";
import { demoPhase3Store } from "@/features/demo/phase3-store";
import { demoPhase5Conversations } from "@/features/demo/phase5-store";
import type { AnalyticsRow } from "./types";

function dateAtOffset(days: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function historicalRows(workspaceId: string): AnalyticsRow[] {
  const campaign = demoPhase3Store().campaigns.get(workspaceId)?.[0] ?? null;
  return Array.from({ length: 28 }, (_, index) => {
    const day = -13 + Math.floor(index / 2);
    const primary = index % 2 === 0;
    const sent = primary ? 10 + (index % 4) : 7 + (index % 3);
    const replied = primary ? 4 : 2;
    return {
      date: dateAtOffset(day),
      campaignId: campaign?.id ?? null,
      campaignName: campaign?.name ?? "Demo campaign",
      channel: primary ? "email" : "linkedin",
      industry: primary ? "Photography studios" : "Creative services",
      country: "Jordan",
      template: primary ? "Evidence-led audit" : "Concise opportunity",
      cta: primary ? "Reply for the audit" : "Book a short call",
      sendHour: primary ? 10 : 14,
      followUpStep: index % 4 === 3 ? 2 : index % 4 === 1 ? 1 : 0,
      discovered: primary ? 12 : 8,
      qualified: primary ? 9 : 6,
      approved: primary ? 8 : 5,
      contacted: sent,
      sent,
      delivered: Math.max(0, sent - 1),
      opened: primary ? 7 : 0,
      read: primary ? 0 : 5,
      replied,
      positive: primary ? 3 : 1,
      meetings: primary && index % 6 === 0 ? 1 : 0,
      conversions: index === 4 || index === 18 ? 1 : 0,
      cost: primary ? 12 : 8,
      revenue: index === 4 ? 2400 : index === 18 ? 1800 : 0,
    };
  });
}

export function demoAnalyticsRows(workspaceId: string): AnalyticsRow[] {
  const phase2 = demoPhase2Store();
  const phase3 = demoPhase3Store();
  const conversations = demoPhase5Conversations(workspaceId);
  const campaigns = phase3.campaigns.get(workspaceId) ?? [];
  const messages = campaigns.flatMap(
    (campaign) => phase3.messages.get(campaign.id) ?? [],
  );
  const leads = phase2.leads.get(workspaceId) ?? [];
  const sent = messages.filter((message) =>
    ["sent", "delivered", "read", "replied"].includes(message.sendStatus),
  ).length;
  const delivered = messages.filter((message) =>
    ["delivered", "read", "replied"].includes(message.sendStatus),
  ).length;
  const read = messages.filter((message) =>
    ["read", "replied"].includes(message.sendStatus),
  ).length;
  const replied = conversations.filter((conversation) =>
    conversation.messages.some((message) => message.direction === "inbound"),
  ).length;
  const positive = conversations.filter((conversation) =>
    ["interested", "asking_price", "wants_information"].includes(
      conversation.intent,
    ),
  ).length;
  const meetings = conversations.filter(
    (conversation) => conversation.status === "meeting",
  ).length;
  const attributedSent = Math.max(sent, replied);
  const attributedDelivered = Math.max(delivered, replied);
  const campaign = campaigns[0] ?? null;
  return [
    ...historicalRows(workspaceId),
    {
      date: dateAtOffset(0),
      campaignId: campaign?.id ?? null,
      campaignName: campaign?.name ?? "Demo campaign",
      channel: "all",
      industry: "Mixed",
      country: "Jordan",
      template: "Current workspace records",
      cta: "Mixed",
      sendHour: null,
      followUpStep: 0,
      discovered: leads.length,
      qualified: leads.filter((lead) => lead.qualificationScore >= 70).length,
      approved: messages.filter(
        (message) => message.approvalStatus === "approved",
      ).length,
      contacted: attributedSent,
      sent: attributedSent,
      delivered: attributedDelivered,
      opened: 0,
      read,
      replied,
      positive,
      meetings,
      conversions: meetings > 0 ? 1 : 0,
      cost: 0,
      revenue: meetings > 0 ? 1200 : 0,
    },
  ];
}
