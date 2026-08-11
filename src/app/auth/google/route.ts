import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  EnvironmentValidationError,
  getSupabaseAuthEnvironment,
} from "@/lib/env";
import { safeRedirectPath } from "@/lib/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";

type GoogleSignInStage =
  | "google_signin_started"
  | "auth_environment_validated"
  | "supabase_client_created"
  | "oauth_request_created"
  | "oauth_redirect_returned";

function googleSignInLog(
  level: "info" | "error",
  requestId: string,
  stage: GoogleSignInStage,
  details: Record<string, unknown>,
) {
  console[level](
    JSON.stringify({
      event: "google_signin",
      requestId,
      stage,
      ...details,
    }),
  );
}

function errorMetadata(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { errorType: typeof error };
  return { errorName: error.name };
}

function authRedirect(requestUrl: URL, error: string, source: "login" | "register") {
  const response = NextResponse.redirect(
    new URL(`/${source}?error=${error}`, requestUrl.origin),
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function providerRedirect(url: string) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const requestId = crypto.randomUUID();
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));
  const source = requestUrl.searchParams.get("source") === "register" ? "register" : "login";
  let activeStage: GoogleSignInStage = "google_signin_started";

  googleSignInLog("info", requestId, activeStage, {
    status: "started",
    provider: "google",
  });

  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const networkKey = createHash("sha256").update(address).digest("base64url");
  const rate = await checkRateLimit(`auth:google:${networkKey}`, 30, 15 * 60_000);
  if (!rate.allowed)
    return authRedirect(requestUrl, "oauth_start_failed", source);

  try {
    activeStage = "auth_environment_validated";
    const environment = getSupabaseAuthEnvironment();
    googleSignInLog("info", requestId, activeStage, {
      status: "succeeded",
      validationCategory: "supabase_auth",
    });

    activeStage = "supabase_client_created";
    const supabase = await createServerSupabaseClient(environment, {
      requireCookieWrites: true,
    });
    googleSignInLog("info", requestId, activeStage, {
      status: "succeeded",
      clientType: "supabase_ssr",
    });

    activeStage = "oauth_request_created";
    googleSignInLog("info", requestId, activeStage, {
      status: "started",
      provider: "google",
    });
    const callbackUrl = new URL("/auth/callback", environment.APP_URL);
    callbackUrl.searchParams.set("next", next);
    if (source === "register") callbackUrl.searchParams.set("source", source);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error || !data.url) {
      googleSignInLog("error", requestId, activeStage, {
        status: "failed",
        errorName: error?.name,
        errorCode: error?.code,
        errorStatus: error?.status,
      });
      return authRedirect(requestUrl, "oauth_start_failed", source);
    }

    googleSignInLog("info", requestId, activeStage, {
      status: "succeeded",
      provider: "google",
    });
    activeStage = "oauth_redirect_returned";
    googleSignInLog("info", requestId, activeStage, {
      status: "succeeded",
      provider: "google",
    });

    return providerRedirect(data.url);
  } catch (error) {
    googleSignInLog("error", requestId, activeStage, {
      status: "exception",
      validationCategory:
        error instanceof EnvironmentValidationError
          ? "supabase_auth"
          : undefined,
      ...errorMetadata(error),
    });
    return authRedirect(
      requestUrl,
      error instanceof EnvironmentValidationError
        ? "provider_not_configured"
        : "oauth_start_failed",
      source,
    );
  }
}
