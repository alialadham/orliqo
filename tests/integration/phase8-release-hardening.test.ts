import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read(
  "supabase/migrations/20260724090000_phase8_release_hardening.sql",
);

describe("Phase 8 release hardening", () => {
  it("ships a nonce CSP and production transport headers", () => {
    const headers = read("src/lib/security/headers.ts");
    const proxy = read("src/proxy.ts");
    const rootLayout = read("src/app/layout.tsx");
    const instrumentationClient = read("src/instrumentation-client.ts");
    const nextConfig = read("next.config.ts");
    expect(headers).toContain("'nonce-${nonce}'");
    expect(headers).toContain("'strict-dynamic'");
    expect(headers).toContain("script-src-attr 'none'");
    expect(headers).toContain("style-src-elem");
    expect(headers).toContain("Strict-Transport-Security");
    expect(headers).toContain("X-Content-Type-Options");
    expect(proxy).toContain("applySecurityHeaders");
    expect(proxy).toContain("next-router-prefetch");
    expect(rootLayout).toContain("await connection()");
    expect(instrumentationClient).toContain("z.config({ jitless: true })");
    expect(nextConfig).not.toContain("Content-Security-Policy");
  });

  it("fails closed for production secrets, providers, and live delivery", () => {
    const environment = read("src/lib/env.ts");
    expect(environment).toContain("Invalid Orliqo environment");
    expect(environment).toContain("AI_PRIMARY_PROVIDER cannot be mock");
    expect(environment).toContain("LIVE_DELIVERY_ENABLED=true");
    expect(environment).toContain("BILLING_LIVE_ENABLED=true");
    expect(environment).toContain("ENCRYPTION_KEY");
    expect(environment).toContain("INNGEST_SIGNING_KEY");
  });

  it("uses shared CSRF, bounded bodies, and fail-closed rate limiting", () => {
    const csrf = read("src/lib/security/csrf.ts");
    const limiter = read("src/lib/security/rate-limit.ts");
    expect(csrf).toContain("sec-fetch-site");
    expect(csrf).toContain("content-length");
    expect(limiter).toContain("consume_rate_limit");
    expect(limiter).toContain("available: false");
    expect(migration).toContain("private.rate_limit_buckets");
  });

  it("keeps campaign transitions atomic, grounded, and service-role only", () => {
    expect(migration).toContain("for update");
    expect(migration).toContain("OPTIMISTIC_LOCK_CONFLICT");
    expect(migration).toContain("GROUNDING_SOURCE_INVALID");
    expect(migration).toContain("CAMPAIGN_SAFETY_GATE_FAILED");
    expect(migration).toContain("CAMPAIGN_PROVIDER_UNAVAILABLE");
    expect(migration).toContain(
      "target_message.approval_status = 'approved' then",
    );
    expect(migration).toContain(
      "revoke all on function private.transition_campaign",
    );
    expect(migration).toContain("to service_role");
  });

  it("recovers exhausted provider jobs and blocks unauthorized live sends", () => {
    const jobs = read("src/lib/inngest/functions/phase4.ts");
    expect(jobs).toContain("PROVIDER_RETRIES_EXHAUSTED");
    expect(jobs).toContain("LIVE_DELIVERY_ENABLED");
    expect(jobs).toContain('whatsapp_consent_status !== "opted_in"');
    expect(jobs).toContain("claim_due_message");
  });

  it("does not expose a placeholder catch-all application surface", () => {
    const catchAll = read("src/app/app/[[...path]]/page.tsx");
    expect(catchAll).toContain("notFound()");
    expect(catchAll).not.toContain("sandbox");
    expect(catchAll).not.toContain("placeholder");
  });
});
