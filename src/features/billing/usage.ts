import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function privateBillingApi(): SupabaseClient {
  return createAdminSupabaseClient() as unknown as SupabaseClient;
}

export async function reserveUsage(input: {
  workspaceId: string;
  metric: string;
  amount: number;
  idempotencyKey: string;
  sourceEntityType: string;
  sourceEntityId?: string;
}): Promise<string> {
  const { data, error } = await privateBillingApi()
    .schema("private")
    .rpc("reserve_usage", {
      target_workspace_id: input.workspaceId,
      target_metric: input.metric,
      target_amount: input.amount,
      reservation_key: input.idempotencyKey,
      target_entity_type: input.sourceEntityType,
      target_entity_id: input.sourceEntityId ?? null,
    });
  if (error || typeof data !== "string")
    throw new Error(error?.message ?? "Usage could not be reserved.");
  return data;
}

export async function commitUsage(reservationId: string): Promise<void> {
  const { data, error } = await privateBillingApi()
    .schema("private")
    .rpc("commit_usage", { target_reservation_id: reservationId });
  if (error || data !== true)
    throw new Error(error?.message ?? "Usage could not be committed.");
}

export async function releaseUsage(reservationId: string): Promise<void> {
  const { data, error } = await privateBillingApi()
    .schema("private")
    .rpc("release_usage", { target_reservation_id: reservationId });
  if (error || data !== true)
    throw new Error(error?.message ?? "Usage could not be released.");
}
