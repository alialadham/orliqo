export const campaignStatuses = ["draft", "researching", "awaiting_approval", "scheduled", "running", "paused", "completed", "killed", "failed"] as const;
export type CampaignStatus = (typeof campaignStatuses)[number];
export const outreachChannels = ["email", "whatsapp", "instagram", "linkedin"] as const;
export type OutreachChannel = (typeof outreachChannels)[number];
export type Campaign = {
  id: string; workspaceId: string; name: string; description: string; goal: string; audienceSource: string;
  status: CampaignStatus; targetProspectCount: number; channels: OutreachChannel[]; mainOffer: string; mainCta: string;
  tone: string; language: string; personalizationDepth: "light" | "standard" | "deep"; followUpCount: number;
  startAt: string; sendingDays: number[]; sendWindowStart: string; sendWindowEnd: string; timezone: string;
  dailyLimit: number; monthlyLimit: number; minIntervalMinutes: number; maxIntervalMinutes: number; stopOnReply: boolean;
  autoReplenish: boolean; replenishThreshold: number; replenishCount: number; replenishMinimumScore: number;
  replenishRequireApproval: boolean; createdAt: string; updatedAt: string; pausedAt: string | null; killedAt: string | null;
};
export type MessageVersion = { id: string; number: number; subject: string | null; body: string; sourceIds: string[]; facts: string[]; riskFlags: string[]; unsupportedClaims: string[]; model: string; promptVersion: string; createdAt: string };
export type CampaignMessage = { id: string; campaignId: string; leadId: string; businessName: string; channel: OutreachChannel; sequenceStep: number; subject: string | null; body: string; sourceIds: string[]; facts: string[]; confidence: number; approvalStatus: "needs_review" | "approved" | "rejected" | "revision_requested"; sendStatus: "draft" | "queued" | "scheduled" | "sending" | "sent" | "delivered" | "read" | "replied" | "failed" | "paused" | "cancelled" | "suppressed"; scheduledAt: string | null; idempotencyKey: string; versions: MessageVersion[]; attempts: Array<{ number: number; result: string; at: string; error?: string }> };
export type CampaignActivity = { id: string; summary: string; createdAt: string };
export type CampaignDetail = { campaign: Campaign; messages: CampaignMessage[]; activity: CampaignActivity[]; queueHealth: { ready: number; threshold: number; reserved: number; used: number; limit: number } };
