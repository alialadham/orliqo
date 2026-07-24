import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { fetchWithTimeout } from "@/lib/http";
import {
  createGmailAdapter,
  createOutlookAdapter,
  createResendAdapter,
  createSesAdapter,
} from "./configured-email-adapters";
import {
  readIntegrationCredential,
  rotateIntegrationCredential,
} from "./credential-service";
import type { EmailProviderAdapter } from "./email-adapters";
import type {
  IntegrationProvider,
  ProviderHealth,
  ProviderMode,
} from "./types";
import {
  createWhatsAppAdapter,
  type WhatsAppProviderAdapter,
} from "./whatsapp-adapter";
import { validateSmtpConfiguration } from "./smtp";
import { createSmtpAdapter } from "./smtp-adapter";

export type RuntimeIntegration = {
  id: string;
  workspaceId: string;
  provider: IntegrationProvider;
  configuration: Record<string, unknown>;
};

function stringValue(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === "string" ? record[key] : "";
}

function mode(
  configuration: Record<string, unknown>,
): Exclude<ProviderMode, "demo"> {
  return configuration.mode === "live" ? "live" : "sandbox";
}

export async function configuredEmailAdapter(
  integration: RuntimeIntegration,
): Promise<EmailProviderAdapter | null> {
  const credential = await readIntegrationCredential<Record<string, unknown>>(
    integration.id,
    integration.workspaceId,
  );
  if (!credential) return null;
  const payload = credential.payload;
  const providerMode = mode(integration.configuration);
  const onTokenUpdate = async (tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }) => {
    await rotateIntegrationCredential(integration.id, integration.workspaceId, {
      ...payload,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken ?? payload.refresh_token,
      expires_in: tokens.expiresIn ?? payload.expires_in,
    });
    if (tokens.expiresIn)
      await createAdminSupabaseClient()
        .from("integrations")
        .update({
          token_expires_at: new Date(
            Date.now() + tokens.expiresIn * 1000,
          ).toISOString(),
          status: "connected",
          last_error_code: null,
          last_error: null,
        })
        .eq("id", integration.id)
        .eq("workspace_id", integration.workspaceId);
  };
  if (integration.provider === "gmail")
    return createGmailAdapter({
      mode: providerMode,
      accessToken: stringValue(payload, "access_token"),
      refreshToken: stringValue(payload, "refresh_token"),
      clientId: stringValue(payload, "client_id"),
      clientSecret: stringValue(payload, "client_secret"),
      onTokenUpdate,
    });
  if (integration.provider === "outlook")
    return createOutlookAdapter({
      mode: providerMode,
      accessToken: stringValue(payload, "access_token"),
      refreshToken: stringValue(payload, "refresh_token"),
      clientId: stringValue(payload, "client_id"),
      clientSecret: stringValue(payload, "client_secret"),
      tenantId: stringValue(payload, "tenant_id") || "common",
      onTokenUpdate,
    });
  if (integration.provider === "resend")
    return createResendAdapter({
      mode: providerMode,
      apiKey: stringValue(payload, "api_key"),
    });
  if (integration.provider === "ses")
    return createSesAdapter({
      mode: providerMode,
      region: stringValue(payload, "region"),
      accessKeyId: stringValue(payload, "access_key_id"),
      secretAccessKey: stringValue(payload, "secret_access_key"),
      ...(stringValue(payload, "session_token")
        ? { sessionToken: stringValue(payload, "session_token") }
        : {}),
    });
  if (integration.provider === "smtp") {
    const configuration = await validateSmtpConfiguration({
      host: stringValue(payload, "host"),
      port: Number(payload.port),
      secure: payload.secure === true,
      username: stringValue(payload, "username"),
      password: stringValue(payload, "password"),
      from: stringValue(payload, "from"),
    });
    return createSmtpAdapter({ ...configuration, mode: providerMode });
  }
  return null;
}

export async function configuredWhatsAppAdapter(
  integration: RuntimeIntegration,
): Promise<WhatsAppProviderAdapter | null> {
  if (integration.provider !== "whatsapp") return null;
  const credential = await readIntegrationCredential<Record<string, unknown>>(
    integration.id,
    integration.workspaceId,
  );
  if (!credential) return null;
  return createWhatsAppAdapter({
    mode: mode(integration.configuration),
    apiVersion: stringValue(integration.configuration, "apiVersion"),
    phoneNumberId: stringValue(integration.configuration, "phoneNumberId"),
    accessToken: stringValue(credential.payload, "access_token"),
  });
}

export async function integrationHealth(
  integration: RuntimeIntegration,
): Promise<ProviderHealth> {
  const checkedAt = new Date().toISOString();
  if (
    ["gmail", "outlook", "smtp", "resend", "ses"].includes(integration.provider)
  ) {
    const adapter = await configuredEmailAdapter(integration);
    return adapter
      ? adapter.health()
      : {
          ok: false,
          mode: mode(integration.configuration),
          checkedAt,
          errorCode: "configuration_missing",
          retryable: false,
        };
  }
  if (integration.provider === "whatsapp") {
    const adapter = await configuredWhatsAppAdapter(integration);
    return adapter
      ? adapter.health()
      : {
          ok: false,
          mode: mode(integration.configuration),
          checkedAt,
          errorCode: "configuration_missing",
          retryable: false,
        };
  }
  if (integration.provider === "google_calendar") {
    const credential = await readIntegrationCredential<Record<string, unknown>>(
      integration.id,
      integration.workspaceId,
    );
    if (!credential)
      return {
        ok: false,
        mode: mode(integration.configuration),
        checkedAt,
        errorCode: "configuration_missing",
        retryable: false,
      };
    const response = await fetchWithTimeout(
      fetch,
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1",
      {
        headers: {
          authorization: `Bearer ${stringValue(credential.payload, "access_token")}`,
        },
        cache: "no-store",
      },
      10_000,
    );
    return {
      ok: response.ok,
      mode: mode(integration.configuration),
      checkedAt,
      ...(response.ok
        ? {}
        : {
            errorCode: "provider_unavailable",
            retryable: response.status >= 500,
          }),
    };
  }
  return {
    ok: false,
    mode: mode(integration.configuration),
    checkedAt,
    errorCode: "unsupported_provider",
    retryable: false,
  };
}
