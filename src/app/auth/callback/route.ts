import { NextResponse } from "next/server";

import {
  EnvironmentValidationError,
  getSupabaseAuthEnvironment,
} from "@/lib/env";
import { safeRedirectPath } from "@/lib/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CallbackStage =
  | "environment_validation"
  | "create_server_client"
  | "exchange_code"
  | "workspace_bootstrap"
  | "callback";

function callbackLog(
  level: "info" | "error",
  requestId: string,
  stage: CallbackStage,
  details: Record<string, unknown>,
) {
  console[level](
    JSON.stringify({
      event: "auth_callback",
      requestId,
      stage,
      ...details,
    }),
  );
}

function errorMetadata(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { errorType: typeof error };
  return {
    errorName: error.name,
  };
}

function callbackRedirect(requestUrl: URL, path: string) {
  const response = NextResponse.redirect(new URL(path, requestUrl.origin));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const requestId = crypto.randomUUID();
  const code = requestUrl.searchParams.get("code");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));
  let activeStage: CallbackStage = "callback";

  if (!code) {
    callbackLog("error", requestId, "callback", {
      status: "missing_code",
    });
    return callbackRedirect(requestUrl, "/login?error=oauth_callback_failed");
  }

  try {
    activeStage = "environment_validation";
    callbackLog("info", requestId, "environment_validation", {
      status: "started",
      validationCategory: "supabase_oauth",
    });
    const environment = getSupabaseAuthEnvironment();
    callbackLog("info", requestId, "environment_validation", {
      status: "succeeded",
      validationCategory: "supabase_oauth",
      supabaseConfigured: environment.supabaseConfigured,
    });

    activeStage = "create_server_client";
    callbackLog("info", requestId, "create_server_client", {
      status: "started",
    });
    const supabase = await createServerSupabaseClient(environment, {
      requireCookieWrites: true,
    });
    callbackLog("info", requestId, "create_server_client", {
      status: "succeeded",
    });

    callbackLog("info", requestId, "workspace_bootstrap", {
      status: "waiting_on_auth_exchange",
      mechanism: "on_auth_user_created database trigger",
    });
    activeStage = "exchange_code";
    callbackLog("info", requestId, "exchange_code", {
      status: "started",
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      callbackLog("error", requestId, "exchange_code", {
        status: "failed",
        errorName: error.name,
        errorCode: error.code,
        errorStatus: error.status,
      });
      return callbackRedirect(
        requestUrl,
        "/login?error=oauth_callback_failed",
      );
    }

    callbackLog("info", requestId, "exchange_code", {
      status: "succeeded",
    });
    activeStage = "workspace_bootstrap";
    callbackLog("info", requestId, "workspace_bootstrap", {
      status: "trigger_completed_or_existing_user",
      mechanism: "on_auth_user_created database trigger",
    });

    return callbackRedirect(requestUrl, next);
  } catch (error) {
    callbackLog("error", requestId, activeStage, {
      status: "exception",
      validationCategory:
        error instanceof EnvironmentValidationError
          ? "supabase_oauth"
          : undefined,
      ...errorMetadata(error),
    });
    return callbackRedirect(requestUrl, "/login?error=oauth_callback_failed");
  }
}
