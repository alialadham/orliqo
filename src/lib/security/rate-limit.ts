import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getServerEnvironment } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_LOCAL_BUCKETS = 10_000;

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  available: boolean;
};

function checkLocalRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  if (buckets.size >= MAX_LOCAL_BUCKETS) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    if (buckets.size >= MAX_LOCAL_BUCKETS) {
      const oldest = buckets.keys().next().value as string | undefined;
      if (oldest) buckets.delete(oldest);
    }
  }
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0, available: true };
  }
  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
      ),
      available: true,
    };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0, available: true };
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const local = checkLocalRateLimit(key, limit, windowMs);
  if (!local.allowed) return local;

  const environment = getServerEnvironment();
  if (environment.demoMode || environment.NODE_ENV !== "production")
    return local;

  try {
    const client = createAdminSupabaseClient() as unknown as SupabaseClient;
    const { data, error } = await client.schema("private").rpc(
      "consume_rate_limit",
      {
        bucket_key: key,
        bucket_limit: limit,
        window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
      },
    );
    const result = Array.isArray(data) ? data[0] : data;
    if (
      error ||
      !result ||
      typeof result.allowed !== "boolean" ||
      typeof result.retry_after_seconds !== "number"
    ) {
      return { allowed: false, retryAfterSeconds: 60, available: false };
    }
    return {
      allowed: result.allowed,
      retryAfterSeconds: result.retry_after_seconds,
      available: true,
    };
  } catch {
    return { allowed: false, retryAfterSeconds: 60, available: false };
  }
}
