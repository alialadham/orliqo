import "server-only";

import { randomUUID } from "node:crypto";

import { fetchWithTimeout } from "@/lib/http";
import { validateWhatsAppSend } from "./whatsapp";
import type { ProviderHealth, ProviderMode } from "./types";

type WhatsAppSendInput = Parameters<typeof validateWhatsAppSend>[0];

export interface WhatsAppProviderAdapter {
  readonly mode: ProviderMode;
  send(input: WhatsAppSendInput): Promise<{
    ok: boolean;
    delivered: boolean;
    providerMessageId?: string;
    error?: string;
  }>;
  health(): Promise<ProviderHealth>;
}

export function createWhatsAppAdapter(configuration: {
  mode: ProviderMode;
  apiVersion?: string;
  phoneNumberId?: string;
  accessToken?: string;
  fetcher?: typeof fetch;
}): WhatsAppProviderAdapter {
  const fetcher = configuration.fetcher ?? fetch;
  return {
    mode: configuration.mode,
    async send(input) {
      const parsed = validateWhatsAppSend(input);
      if (!parsed.success)
        return {
          ok: false,
          delivered: false,
          error:
            parsed.error.issues[0]?.message ?? "WhatsApp validation failed.",
        };
      if (configuration.mode === "demo")
        return {
          ok: true,
          delivered: false,
          providerMessageId: `demo-wamid-${randomUUID()}`,
        };
      if (
        !configuration.phoneNumberId ||
        !configuration.accessToken ||
        !configuration.apiVersion
      )
        return {
          ok: false,
          delivered: false,
          error: "Official WhatsApp Cloud API credentials are incomplete.",
        };
      const message = parsed.data.sessionOpen
        ? {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: parsed.data.to,
            type: "text",
            text: { preview_url: false, body: parsed.data.body },
          }
        : {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: parsed.data.to,
            type: "template",
            template: {
              name: parsed.data.templateName,
              language: { code: "en_US" },
              components: [
                {
                  type: "body",
                  parameters: parsed.data.requiredVariables.map((name) => ({
                    type: "text",
                    text: parsed.data.variables[name],
                  })),
                },
              ],
            },
          };
      const response = await fetchWithTimeout(
        fetcher,
        `https://graph.facebook.com/${encodeURIComponent(configuration.apiVersion)}/${encodeURIComponent(configuration.phoneNumberId)}/messages`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${configuration.accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(message),
          cache: "no-store",
        },
        15_000,
      );
      const data = (await response.json().catch(() => null)) as {
        messages?: Array<{ id?: string }>;
        error?: { message?: string };
      } | null;
      const providerMessageId = data?.messages?.[0]?.id;
      if (!response.ok || !providerMessageId)
        return {
          ok: false,
          delivered: false,
          error:
            data?.error?.message ??
            `WhatsApp Cloud API request failed with ${response.status}.`,
        };
      return { ok: true, delivered: true, providerMessageId };
    },
    async health() {
      if (configuration.mode === "demo")
        return { ok: true, mode: "demo", checkedAt: new Date().toISOString() };
      if (
        !configuration.phoneNumberId ||
        !configuration.accessToken ||
        !configuration.apiVersion
      )
        return {
          ok: false,
          mode: configuration.mode,
          checkedAt: new Date().toISOString(),
          errorCode: "configuration_missing",
          retryable: false,
        };
      const response = await fetchWithTimeout(
        fetcher,
        `https://graph.facebook.com/${encodeURIComponent(configuration.apiVersion)}/${encodeURIComponent(configuration.phoneNumberId)}?fields=display_phone_number,quality_rating`,
        {
          headers: { authorization: `Bearer ${configuration.accessToken}` },
          cache: "no-store",
        },
        10_000,
      );
      return {
        ok: response.ok,
        mode: configuration.mode,
        checkedAt: new Date().toISOString(),
        ...(response.ok
          ? {}
          : {
              errorCode: "provider_unavailable",
              retryable: response.status >= 500,
            }),
      };
    },
  };
}
