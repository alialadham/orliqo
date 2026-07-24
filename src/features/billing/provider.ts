import type { BillingPlan } from "./plans";

export type BillingMode = "test" | "live";
export type BillingInterval = "month" | "year";
export type BillingProvider = "dodo";
export type InternalSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | "none"
  | "restricted";

export type BillingProviderError = {
  code:
    | "configuration_missing"
    | "invalid_request"
    | "provider_unavailable"
    | "live_mode_disabled";
  message: string;
  retryable: boolean;
};

export type BillingProviderResult<T> =
  | { ok: true; mode: BillingMode; data: T }
  | { ok: false; mode: BillingMode; error: BillingProviderError };

export type CheckoutRequest = {
  workspaceId: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  plan: BillingPlan;
  interval: BillingInterval;
  returnUrl: string;
  idempotencyKey: string;
  trialDays?: number;
};

export type CheckoutSession = {
  id: string;
  url: string;
  customerId: string | null;
  subscriptionId: string | null;
  mode: BillingMode;
};

export type PortalRequest = {
  customerId: string;
  returnUrl: string;
  idempotencyKey: string;
};

export type PortalSession = { url: string; mode: BillingMode };
export type SubscriptionMutation = {
  subscriptionId: string;
  status: InternalSubscriptionStatus;
  cancelAtPeriodEnd: boolean;
};

export type BillingWebhookEnvelope = {
  provider: BillingProvider;
  eventId: string;
  eventType: string;
  mode: BillingMode;
  payloadHash: string;
};

export interface BillingProviderAdapter {
  readonly provider: BillingProvider;
  readonly mode: BillingMode;
  createCheckout(
    request: CheckoutRequest,
  ): Promise<BillingProviderResult<CheckoutSession>>;
  createPortal(
    request: PortalRequest,
  ): Promise<BillingProviderResult<PortalSession>>;
  retrieveSubscription(
    subscriptionId: string,
  ): Promise<BillingProviderResult<unknown>>;
  cancelSubscription(
    subscriptionId: string,
    idempotencyKey: string,
  ): Promise<BillingProviderResult<SubscriptionMutation>>;
  listInvoices(
    customerId: string,
  ): Promise<BillingProviderResult<readonly unknown[]>>;
}

export interface BillingWebhookProcessor {
  readonly provider: BillingProvider;
  verify(rawBody: string, headers: Headers): boolean;
  process(rawBody: string, headers: Headers): Promise<BillingWebhookEnvelope>;
}

export function liveModeDisabled<T>(): BillingProviderResult<T> {
  return {
    ok: false,
    mode: "live",
    error: {
      code: "live_mode_disabled",
      message: "Live billing operations are not enabled in this build.",
      retryable: false,
    },
  };
}
