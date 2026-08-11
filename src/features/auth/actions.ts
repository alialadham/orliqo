"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { ensureAuthenticatedUserWorkspace } from "@/features/auth/bootstrap";
import {
  forgotPasswordSchema,
  loginSchema,
  registrationSchema,
  resetPasswordSchema,
  type AuthActionResult,
  type ForgotPasswordInput,
  type LoginInput,
  type RegistrationInput,
  type ResetPasswordInput,
} from "@/features/auth/schemas";
import { getCurrentUser } from "@/features/auth/session";
import { getWorkspaceContext, setActiveWorkspaceCookie } from "@/features/workspaces/data";
import {
  EnvironmentValidationError,
  getSupabaseAuthEnvironment,
  getSupabaseEnvironment,
} from "@/lib/env";
import { safeRedirectPath } from "@/lib/navigation";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function authBucket(kind: string, identifier: string): string {
  return `auth:${kind}:${createHash("sha256")
    .update(identifier.trim().toLowerCase())
    .digest("base64url")}`;
}

async function authRateLimit(
  kind: string,
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<{ available: boolean; limited: boolean }> {
  const requestHeaders = await headers();
  const address =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown";
  const [account, network] = await Promise.all([
    checkRateLimit(authBucket(kind, identifier), limit, windowMs),
    checkRateLimit(authBucket(kind, `network:${address}`), limit * 5, windowMs),
  ]);
  return {
    available: account.available && network.available,
    limited: !account.allowed || !network.allowed,
  };
}

function logAuthFailure(
  action: string,
  stage: string,
  error: unknown,
): void {
  const details =
    typeof error === "object" && error !== null
      ? (error as { code?: unknown; status?: unknown })
      : null;
  console.error(
    JSON.stringify({
      event: "authentication",
      action,
      stage,
      status: "failed",
      errorName: error instanceof Error ? error.name : typeof error,
      errorCode: typeof details?.code === "string" ? details.code : undefined,
      httpStatus:
        typeof details?.status === "number" ? details.status : undefined,
    }),
  );
}

function invalidResult(error: { flatten: () => { fieldErrors: Record<string, string[]> } }): AuthActionResult {
  return {
    ok: false,
    message: "Check the highlighted fields and try again.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

export async function loginAction(input: LoginInput): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  const rateLimit = await authRateLimit(
    "login",
    parsed.data.email,
    10,
    15 * 60_000,
  );
  if (!rateLimit.available)
    return {
      ok: false,
      message: "Account sign-in is temporarily unavailable. Please try again later.",
    };
  if (rateLimit.limited)
    return {
      ok: false,
      message: "Too many sign-in attempts. Wait 15 minutes and try again.",
    };

  try {
    const environment = getSupabaseEnvironment();
    const supabase = await createServerSupabaseClient(environment, {
      requireCookieWrites: true,
    });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error)
      return { ok: false, message: "The email or password is incorrect." };
    if (data.user) await ensureAuthenticatedUserWorkspace(data.user);
    return { ok: true, redirectTo: safeRedirectPath(parsed.data.next) };
  } catch (error) {
    logAuthFailure("login", "sign_in", error);
    return {
      ok: false,
      message:
        error instanceof EnvironmentValidationError
          ? "Account sign-in is temporarily unavailable. Please try again later."
          : "We could not reach the sign-in service. Check your connection and try again.",
    };
  }
}

export async function registerAction(input: RegistrationInput): Promise<AuthActionResult> {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  const rateLimit = await authRateLimit(
    "register",
    parsed.data.email,
    5,
    60 * 60_000,
  );
  if (!rateLimit.available)
    return {
      ok: false,
      message: "Account creation is temporarily unavailable. Please try again later.",
    };
  if (rateLimit.limited)
    return {
      ok: false,
      message: "Too many registration attempts. Try again later.",
    };

  try {
    const environment = getSupabaseAuthEnvironment();
    const supabase = await createServerSupabaseClient(environment, {
      requireCookieWrites: true,
    });
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${environment.APP_URL}/auth/callback?next=/onboarding`,
        data: {
          full_name: parsed.data.fullName,
          terms_accepted_at: new Date().toISOString(),
          terms_version: "2026-08-11",
          privacy_version: "2026-08-11",
          marketing_consent: parsed.data.marketingConsent,
        },
      },
    });

    if (error) {
      logAuthFailure("register", "sign_up_provider", error);
      return {
        ok: false,
        message:
          error.code === "over_email_send_rate_limit"
            ? "Confirmation email limit reached. Wait a few minutes and try again."
            : "We could not create the account. Check your details and try again.",
      };
    }

    if (!data.session) {
      return {
        ok: true,
        message:
          "Check your email to confirm your address, then continue setup.",
      };
    }

    if (data.user) await ensureAuthenticatedUserWorkspace(data.user);
    return { ok: true, redirectTo: "/onboarding" };
  } catch (error) {
    logAuthFailure("register", "sign_up", error);
    return {
      ok: false,
      message: "We could not create the account right now. Please try again.",
    };
  }
}

export async function forgotPasswordAction(input: ForgotPasswordInput): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  const rateLimit = await authRateLimit(
    "forgot-password",
    parsed.data.email,
    5,
    60 * 60_000,
  );
  if (!rateLimit.available || rateLimit.limited)
    return {
      ok: true,
      message:
        "If an account exists for that email, a secure reset link has been sent.",
    };

  try {
    const environment = getSupabaseAuthEnvironment();
    const supabase = await createServerSupabaseClient(environment);
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${environment.APP_URL}/auth/callback?next=/reset-password`,
    });
  } catch (error) {
    logAuthFailure("forgot_password", "request", error);
  }

  return {
    ok: true,
    message: "If an account exists for that email, a secure reset link has been sent.",
  };
}

export async function resetPasswordAction(input: ResetPasswordInput): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  const rateLimit = await authRateLimit(
    "reset-password",
    (await getCurrentUser())?.id ?? "anonymous",
    5,
    60 * 60_000,
  );
  if (!rateLimit.available)
    return {
      ok: false,
      message: "Password reset is temporarily unavailable. Please try again later.",
    };
  if (rateLimit.limited)
    return {
      ok: false,
      message: "Too many password reset attempts. Try again later.",
    };

  try {
    const environment = getSupabaseEnvironment();
    const supabase = await createServerSupabaseClient(environment, {
      requireCookieWrites: true,
    });
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error)
      return {
        ok: false,
        message: "The reset link is invalid or expired. Request a new one.",
      };
    return {
      ok: true,
      message: "Password updated. You can now sign in.",
      redirectTo: "/login",
    };
  } catch (error) {
    logAuthFailure("reset_password", "update", error);
    return { ok: false, message: "We could not update the password. Try again." };
  }
}

export async function logoutAction(): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient(undefined, {
      requireCookieWrites: true,
    });
    await supabase.auth.signOut();
  } catch (error) {
    logAuthFailure("logout", "sign_out", error);
  }
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"))
      cookieStore.delete(cookie.name);
  }
  cookieStore.delete("orliqo-active-workspace");
  cookieStore.delete("orliqo-demo-session");
  redirect("/login");
}

export async function switchWorkspaceAction(formData: FormData): Promise<void> {
  const workspaceId = formData.get("workspaceId");
  if (typeof workspaceId !== "string") return;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await getWorkspaceContext();
  if (!context?.workspaces.some((workspace) => workspace.id === workspaceId))
    return;
  await setActiveWorkspaceCookie(workspaceId);

  revalidatePath("/app", "layout");
  redirect("/app/dashboard");
}
