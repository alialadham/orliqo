import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/features/auth/session";
import { beginOAuthIntegration } from "@/features/integrations/oauth-service";
import { requirePermission } from "@/features/permissions/server";
import { getServerEnvironment } from "@/lib/env";
import { bodyWithinLimit, csrfErrorResponse } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/security/rate-limit";

const providerSchema = z.enum(["gmail", "outlook", "google_calendar"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const csrfError = csrfErrorResponse(request, getServerEnvironment().APP_URL);
  if (csrfError) return csrfError;
  if (!bodyWithinLimit(request, 8 * 1024))
    return NextResponse.json(
      { error: "OAuth request is too large." },
      { status: 413 },
    );
  const [user, context, route] = await Promise.all([
    getCurrentUser(),
    requirePermission("integrations:manage"),
    params,
  ]);
  if (!user || !context)
    return NextResponse.json(
      { error: "Authentication or permission required." },
      { status: 403 },
    );
  const rate = await checkRateLimit(
    `oauth-connect:${user.id}`,
    10,
    15 * 60_000,
  );
  if (!rate.allowed)
    return NextResponse.json(
      {
        error: rate.available
          ? "OAuth connection rate limit reached."
          : "Request protection is temporarily unavailable.",
      },
      {
        status: rate.available ? 429 : 503,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  if (user.provider === "demo")
    return NextResponse.json(
      { error: "Demo connections use the deterministic integration controls." },
      { status: 409 },
    );
  const provider = providerSchema.safeParse(route.provider);
  const body = (await request.json().catch(() => ({}))) as {
    redirectPath?: string;
  };
  if (!provider.success)
    return NextResponse.json(
      { error: "Unsupported OAuth provider." },
      { status: 404 },
    );
  try {
    const result = await beginOAuthIntegration({
      provider: provider.data,
      workspaceId: context.activeWorkspace.id,
      actorId: user.id,
      redirectPath: body.redirectPath ?? "/app/integrations",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "OAuth setup failed safely.",
      },
      { status: 422 },
    );
  }
}
