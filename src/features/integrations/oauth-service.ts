import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getServerEnvironment } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/http";
import {
  decryptCredential,
  encryptCredential,
  hashOAuthState,
  type EncryptedCredential,
} from "./crypto";
import {
  allowlistedOAuthRedirect,
  createOAuthRequest,
  type OAuthProvider,
} from "./oauth";

type OAuthStateRow = {
  id: string;
  workspace_id: string;
  provider: OAuthProvider;
  hashed_state: string;
  pkce_verifier_ciphertext: string;
  redirect_path: string;
  expires_at: string;
  used_at: string | null;
  actor_id: string;
};

const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().positive().optional(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
});

function oauthConfiguration(provider: OAuthProvider) {
  const environment = getServerEnvironment();
  if (provider === "outlook")
    return {
      clientId: environment.MICROSOFT_CLIENT_ID,
      clientSecret: environment.MICROSOFT_CLIENT_SECRET,
      redirectUri: environment.MICROSOFT_REDIRECT_URI,
      tenantId: environment.MICROSOFT_TENANT_ID,
      tokenUrl: `https://login.microsoftonline.com/${encodeURIComponent(environment.MICROSOFT_TENANT_ID)}/oauth2/v2.0/token`,
    };
  if (provider === "google_calendar")
    return {
      clientId: environment.GOOGLE_CALENDAR_OAUTH_CLIENT_ID,
      clientSecret: environment.GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET,
      redirectUri: environment.GOOGLE_CALENDAR_OAUTH_REDIRECT_URI,
      tenantId: undefined,
      tokenUrl: "https://oauth2.googleapis.com/token",
    };
  return {
    clientId:
      environment.GOOGLE_OAUTH_CLIENT_ID || environment.GOOGLE_CLIENT_ID,
    clientSecret:
      environment.GOOGLE_OAUTH_CLIENT_SECRET ||
      environment.GOOGLE_CLIENT_SECRET,
    redirectUri: environment.GOOGLE_OAUTH_REDIRECT_URI,
    tenantId: undefined,
    tokenUrl: "https://oauth2.googleapis.com/token",
  };
}

function privateClient(): SupabaseClient {
  return createAdminSupabaseClient() as unknown as SupabaseClient;
}

function serializeEncrypted(value: EncryptedCredential): string {
  return `\\x${Buffer.from(JSON.stringify(value), "utf8").toString("hex")}`;
}

function parseEncrypted(value: string): EncryptedCredential {
  const hex = value.startsWith("\\x") ? value.slice(2) : value;
  return JSON.parse(
    Buffer.from(hex, "hex").toString("utf8"),
  ) as EncryptedCredential;
}

export async function beginOAuthIntegration(input: {
  provider: OAuthProvider;
  workspaceId: string;
  actorId: string;
  redirectPath: string;
}) {
  const environment = getServerEnvironment();
  if (!allowlistedOAuthRedirect(input.redirectPath))
    throw new Error("OAuth redirect path is not allowed.");
  if (!environment.ENCRYPTION_KEY)
    throw new Error("Integration encryption is not configured.");
  const configuration = oauthConfiguration(input.provider);
  if (
    !configuration.clientId ||
    !configuration.clientSecret ||
    !configuration.redirectUri
  )
    throw new Error("OAuth provider credentials are not configured.");
  const request = createOAuthRequest({
    provider: input.provider,
    clientId: configuration.clientId,
    redirectUri: configuration.redirectUri,
    tenantId: configuration.tenantId,
  });
  const encryptedVerifier = encryptCredential(
    { codeVerifier: request.codeVerifier },
    environment.ENCRYPTION_KEY,
    environment.ENCRYPTION_KEY_VERSION,
  );
  const { error } = await privateClient()
    .schema("private")
    .from("oauth_states")
    .insert({
      workspace_id: input.workspaceId,
      provider: input.provider,
      hashed_state: request.hashedState,
      pkce_verifier_ciphertext: serializeEncrypted(encryptedVerifier),
      redirect_path: input.redirectPath,
      expires_at: request.expiresAt,
      actor_id: input.actorId,
    });
  if (error) throw new Error("OAuth state could not be stored safely.");
  return { authorizationUrl: request.authorizationUrl };
}

async function providerIdentity(
  provider: OAuthProvider,
  accessToken: string,
): Promise<{ id: string; email: string }> {
  const url =
    provider === "outlook"
      ? "https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName"
      : provider === "gmail"
        ? "https://gmail.googleapis.com/gmail/v1/users/me/profile"
        : "https://openidconnect.googleapis.com/v1/userinfo";
  const response = await fetchWithTimeout(fetch, url, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  }, 10_000);
  if (!response.ok) throw new Error("Provider account validation failed.");
  const data = (await response.json()) as Record<string, unknown>;
  const id = String(data.id ?? data.emailAddress ?? data.email ?? "");
  const email = String(
    data.mail ??
      data.userPrincipalName ??
      data.emailAddress ??
      data.email ??
      "",
  );
  if (!id || !z.email().safeParse(email).success)
    throw new Error("Provider account identity was incomplete.");
  return { id, email };
}

export async function completeOAuthIntegration(input: {
  code: string;
  state: string;
  actorId: string;
  expectedProvider: "google" | "microsoft";
}) {
  const environment = getServerEnvironment();
  if (!environment.ENCRYPTION_KEY)
    throw new Error("Integration encryption is not configured.");
  const client = privateClient();
  const { data, error } = await client
    .schema("private")
    .from("oauth_states")
    .select("*")
    .eq("hashed_state", hashOAuthState(input.state))
    .is("used_at", null)
    .maybeSingle();
  const row = data as OAuthStateRow | null;
  if (
    error ||
    !row ||
    row.actor_id !== input.actorId ||
    new Date(row.expires_at) <= new Date()
  )
    throw new Error("OAuth state is invalid or expired.");
  const providerFamily = row.provider === "outlook" ? "microsoft" : "google";
  if (providerFamily !== input.expectedProvider)
    throw new Error("OAuth provider state mismatch.");
  const usedAt = new Date().toISOString();
  const { data: consumed } = await client
    .schema("private")
    .from("oauth_states")
    .update({ used_at: usedAt })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (!consumed) throw new Error("OAuth state was already used.");
  const verifier = decryptCredential<{ codeVerifier: string }>(
    parseEncrypted(row.pkce_verifier_ciphertext),
    environment.ENCRYPTION_KEY,
  );
  const configuration = oauthConfiguration(row.provider);
  const response = await fetchWithTimeout(fetch, configuration.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: configuration.clientId!,
      client_secret: configuration.clientSecret!,
      redirect_uri: configuration.redirectUri!,
      grant_type: "authorization_code",
      code: input.code,
      code_verifier: verifier.codeVerifier,
    }),
    cache: "no-store",
  }, 10_000);
  const tokens = tokenSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !tokens.success)
    throw new Error("Provider token exchange failed.");
  const identity = await providerIdentity(
    row.provider,
    tokens.data.access_token,
  );
  const admin = createAdminSupabaseClient() as unknown as SupabaseClient;
  const { data: existingIntegration } = await admin
    .from("integrations")
    .select("id,credential_reference")
    .eq("workspace_id", row.workspace_id)
    .eq("provider", row.provider)
    .eq("external_account_id", identity.id)
    .maybeSingle();
  const integrationId =
    typeof existingIntegration?.id === "string"
      ? existingIntegration.id
      : randomUUID();
  const credentialId =
    typeof existingIntegration?.credential_reference === "string"
      ? existingIntegration.credential_reference
      : randomUUID();
  const encryptedTokens = encryptCredential(
    {
      ...tokens.data,
      client_id: configuration.clientId,
      client_secret: configuration.clientSecret,
      ...(configuration.tenantId ? { tenant_id: configuration.tenantId } : {}),
    },
    environment.ENCRYPTION_KEY,
    environment.ENCRYPTION_KEY_VERSION,
  );
  const integrationPayload = {
    workspace_id: row.workspace_id,
    provider: row.provider,
    status: "connecting",
    display_name:
      row.provider === "outlook"
        ? "Microsoft Outlook"
        : row.provider === "gmail"
          ? "Gmail"
          : "Google Calendar",
    external_account_id: identity.id,
    external_account_email: identity.email,
    configuration: { mode: "sandbox" },
    scopes: tokens.data.scope?.split(" ") ?? [],
    token_expires_at: tokens.data.expires_in
      ? new Date(Date.now() + tokens.data.expires_in * 1000).toISOString()
      : null,
    created_by: row.actor_id,
    credential_reference: null,
  };
  const { error: integrationError } = existingIntegration
    ? await admin
        .from("integrations")
        .update(integrationPayload)
        .eq("id", integrationId)
        .eq("workspace_id", row.workspace_id)
    : await admin
        .from("integrations")
        .insert({ id: integrationId, ...integrationPayload });
  if (integrationError)
    throw new Error("Provider integration could not be created.");
  const bytea = `\\x${Buffer.from(JSON.stringify(encryptedTokens), "utf8").toString("hex")}`;
  const credentialPayload = {
    encrypted_payload: bytea,
    nonce: `\\x${Buffer.from(encryptedTokens.nonce, "utf8").toString("hex")}`,
    key_version: encryptedTokens.keyVersion,
    rotated_at: existingIntegration?.credential_reference
      ? new Date().toISOString()
      : null,
  };
  const { error: credentialError } = existingIntegration?.credential_reference
    ? await client
        .schema("private")
        .from("integration_credentials")
        .update(credentialPayload)
        .eq("id", credentialId)
        .eq("integration_id", integrationId)
        .eq("workspace_id", row.workspace_id)
    : await client
        .schema("private")
        .from("integration_credentials")
        .insert({
          id: credentialId,
          workspace_id: row.workspace_id,
          integration_id: integrationId,
          ...credentialPayload,
        });
  if (credentialError) {
    if (existingIntegration)
      await admin
        .from("integrations")
        .update({
          status: "error",
          last_error_code: "CREDENTIAL_STORE_FAILED",
          last_error: "Encrypted provider credentials could not be stored.",
        })
        .eq("id", integrationId)
        .eq("workspace_id", row.workspace_id);
    else await admin.from("integrations").delete().eq("id", integrationId);
    throw new Error("Encrypted provider credentials could not be stored.");
  }
  await admin
    .from("integrations")
    .update({ credential_reference: credentialId, status: "connected" })
    .eq("id", integrationId)
    .eq("workspace_id", row.workspace_id);
  return { redirectPath: row.redirect_path };
}
