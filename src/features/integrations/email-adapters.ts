import "server-only";

import { randomUUID } from "node:crypto";

import { emailDraftSchema, type EmailDraft } from "./schemas";
import type {
  IntegrationProvider,
  ProviderHealth,
  ProviderMode,
} from "./types";

export type EmailProvider = Extract<
  IntegrationProvider,
  "gmail" | "outlook" | "smtp" | "resend" | "ses"
>;
export const EMAIL_PROVIDERS = [
  "gmail",
  "outlook",
  "smtp",
  "resend",
  "ses",
] as const satisfies readonly EmailProvider[];

export function isEmailProvider(value: string): value is EmailProvider {
  return (EMAIL_PROVIDERS as readonly string[]).includes(value);
}
export type NormalizedProviderError = {
  code:
    | "configuration_missing"
    | "invalid_recipient"
    | "suppressed"
    | "limit_reached"
    | "unauthorized"
    | "quota"
    | "provider_unavailable";
  message: string;
  retryable: boolean;
  providerRequestId?: string;
};
export type EmailOperationResult =
  | {
      ok: true;
      delivered: boolean;
      providerMessageId: string;
      threadId: string | null;
      requestId: string;
      mode: ProviderMode;
    }
  | {
      ok: false;
      error: NormalizedProviderError;
      requestId: string;
      mode: ProviderMode;
    };

export type SyncedInboundEmail = {
  providerMessageId: string;
  providerThreadId: string;
  senderAddress: string;
  senderName?: string;
  recipientAddress?: string;
  subject?: string;
  body: string;
  occurredAt: string;
};

export type EmailSyncResult =
  | {
      ok: true;
      cursor: string;
      received: number;
      messages?: SyncedInboundEmail[];
      mode: ProviderMode;
    }
  | { ok: false; error: NormalizedProviderError; mode: ProviderMode };

export interface EmailProviderAdapter {
  readonly provider: EmailProvider;
  readonly mode: ProviderMode;
  send(draft: EmailDraft): Promise<EmailOperationResult>;
  test(): Promise<ProviderHealth>;
  sync(cursor?: string): Promise<EmailSyncResult>;
  refresh(): Promise<ProviderHealth>;
  disconnect(): Promise<{ ok: true; revoked: boolean }>;
  health(): Promise<ProviderHealth>;
}

const PROVIDER_LABELS: Record<EmailProvider, string> = {
  gmail: "Gmail",
  outlook: "Microsoft Graph",
  smtp: "SMTP",
  resend: "Resend",
  ses: "Amazon SES",
};

class DeterministicEmailAdapter implements EmailProviderAdapter {
  readonly mode: ProviderMode;

  constructor(
    readonly provider: EmailProvider,
    mode: ProviderMode = "demo",
  ) {
    this.mode = mode;
  }

  async send(input: EmailDraft): Promise<EmailOperationResult> {
    const requestId = randomUUID();
    const parsed = emailDraftSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        mode: this.mode,
        requestId,
        error: {
          code: "invalid_recipient",
          message: "The email draft failed validation.",
          retryable: false,
        },
      };
    }
    return {
      ok: true,
      delivered: false,
      providerMessageId: `demo-${this.provider}-${parsed.data.idempotencyKey}`,
      threadId: parsed.data.threadId ?? `demo-thread-${this.provider}`,
      requestId,
      mode: this.mode,
    };
  }

  async test(): Promise<ProviderHealth> {
    return this.health();
  }

  async sync(cursor = "initial"): Promise<EmailSyncResult> {
    return {
      ok: true,
      cursor: `demo-${this.provider}-${cursor}`,
      received: 0,
      mode: this.mode,
    };
  }

  async refresh(): Promise<ProviderHealth> {
    return this.health();
  }

  async disconnect(): Promise<{ ok: true; revoked: boolean }> {
    return { ok: true, revoked: false };
  }

  async health(): Promise<ProviderHealth> {
    return { ok: true, mode: this.mode, checkedAt: new Date().toISOString() };
  }
}

export function createEmailAdapter(
  provider: EmailProvider,
  mode: ProviderMode = "demo",
): EmailProviderAdapter {
  return new DeterministicEmailAdapter(provider, mode);
}

export function emailProviderLabel(provider: EmailProvider): string {
  return PROVIDER_LABELS[provider];
}
