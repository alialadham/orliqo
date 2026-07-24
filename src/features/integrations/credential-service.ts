import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getServerEnvironment } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  decryptCredential,
  encryptCredential,
  type EncryptedCredential,
} from "./crypto";

type CredentialRow = {
  id: string;
  encrypted_payload: string;
  key_version: number;
};

function decodeBytea(value: string): string {
  const hex = value.startsWith("\\x") ? value.slice(2) : value;
  return Buffer.from(hex, "hex").toString("utf8");
}

function encodeBytea(value: unknown): string {
  return `\\x${Buffer.from(JSON.stringify(value), "utf8").toString("hex")}`;
}

export async function readIntegrationCredential<
  T extends Record<string, unknown>,
>(
  integrationId: string,
  workspaceId: string,
): Promise<{ id: string; payload: T } | null> {
  const environment = getServerEnvironment();
  if (!environment.ENCRYPTION_KEY || !environment.SUPABASE_SERVICE_ROLE_KEY)
    return null;
  const client = createAdminSupabaseClient() as unknown as SupabaseClient;
  const { data, error } = await client
    .schema("private")
    .from("integration_credentials")
    .select("id,encrypted_payload,key_version")
    .eq("integration_id", integrationId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const row = data as CredentialRow | null;
  if (error || !row) return null;
  const encrypted = JSON.parse(
    decodeBytea(row.encrypted_payload),
  ) as EncryptedCredential;
  if (encrypted.keyVersion !== row.key_version)
    throw new Error("Credential key version mismatch.");
  return {
    id: row.id,
    payload: decryptCredential<T>(encrypted, environment.ENCRYPTION_KEY),
  };
}

export async function destroyIntegrationCredential(
  credentialId: string,
  integrationId: string,
  workspaceId: string,
): Promise<void> {
  const client = createAdminSupabaseClient() as unknown as SupabaseClient;
  const { error } = await client
    .schema("private")
    .from("integration_credentials")
    .delete()
    .eq("id", credentialId)
    .eq("integration_id", integrationId)
    .eq("workspace_id", workspaceId);
  if (error)
    throw new Error("Encrypted provider credentials could not be destroyed.");
}

export async function rotateIntegrationCredential(
  integrationId: string,
  workspaceId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const environment = getServerEnvironment();
  if (!environment.ENCRYPTION_KEY)
    throw new Error("Integration encryption is not configured.");
  const encrypted = encryptCredential(
    payload,
    environment.ENCRYPTION_KEY,
    environment.ENCRYPTION_KEY_VERSION,
  );
  const client = createAdminSupabaseClient() as unknown as SupabaseClient;
  const { error } = await client
    .schema("private")
    .from("integration_credentials")
    .update({
      encrypted_payload: encodeBytea(encrypted),
      nonce: `\\x${Buffer.from(encrypted.nonce, "utf8").toString("hex")}`,
      key_version: encrypted.keyVersion,
      rotated_at: new Date().toISOString(),
    })
    .eq("integration_id", integrationId)
    .eq("workspace_id", workspaceId);
  if (error)
    throw new Error("Refreshed provider credentials could not be stored.");
}
