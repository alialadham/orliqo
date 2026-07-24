"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clearDemoSession,
  createDemoOnboardingSession,
  createDemoWorkspaceSession,
  setDemoActiveWorkspace,
} from "@/features/auth/demo-session";
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
import { DEMO_WORKSPACES } from "@/features/demo/data";
import { getWorkspaceContext, setActiveWorkspaceCookie } from "@/features/workspaces/data";
import { getServerEnvironment } from "@/lib/env";
import { safeRedirectPath } from "@/lib/navigation";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function authBucket(kind: string, identifier: string): string {
  return `auth:${kind}:${createHash("sha256")
    .update(identifier.trim().toLowerCase())
    .digest("base64url")}`;
}

async function authRateLimited(
  kind: string,
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const result = await checkRateLimit(
    authBucket(kind, identifier),
    limit,
    windowMs,
  );
  return !result.allowed;
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
  if (await authRateLimited("login", parsed.data.email, 10, 15 * 60_000))
    return {
      ok: false,
      message: "Too many sign-in attempts. Wait 15 minutes and try again.",
    };

  const environment = getServerEnvironment();
  if (!environment.supabaseConfigured) {
    return {
      ok: false,
      message: "Account sign-in is not configured locally. Use the labeled demo workspace.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { ok: false, message: "The email or password is incorrect." };
  return { ok: true, redirectTo: safeRedirectPath(parsed.data.next) };
}

export async function registerAction(input: RegistrationInput): Promise<AuthActionResult> {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  if (await authRateLimited("register", parsed.data.email, 5, 60 * 60_000))
    return {
      ok: false,
      message: "Too many registration attempts. Try again later.",
    };

  const environment = getServerEnvironment();
  if (!environment.supabaseConfigured && environment.demoMode) {
    await createDemoOnboardingSession(parsed.data);
    return { ok: true, redirectTo: "/onboarding?registered=1" };
  }

  const supabase = await createServerSupabaseClient();
  const appUrl = environment.APP_URL || "http://127.0.0.1:3000";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=/onboarding`,
      data: {
        full_name: parsed.data.fullName,
        company_name: parsed.data.companyName,
        country: parsed.data.country,
        team_size: parsed.data.teamSize,
        terms_accepted_at: new Date().toISOString(),
        marketing_consent: parsed.data.marketingConsent,
      },
    },
  });

  if (error) return { ok: false, message: error.message };

  if (!data.session) {
    return {
      ok: true,
      message: "Check your email to verify your address, then continue onboarding.",
    };
  }

  return { ok: true, redirectTo: "/onboarding" };
}

export async function forgotPasswordAction(input: ForgotPasswordInput): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  if (
    await authRateLimited(
      "forgot-password",
      parsed.data.email,
      5,
      60 * 60_000,
    )
  )
    return {
      ok: true,
      message:
        "If an account exists for that email, a secure reset link has been sent.",
    };

  const environment = getServerEnvironment();
  if (environment.supabaseConfigured) {
    const supabase = await createServerSupabaseClient();
    const appUrl = environment.APP_URL || "http://127.0.0.1:3000";
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    });
  }

  return {
    ok: true,
    message: "If an account exists for that email, a secure reset link has been sent.",
  };
}

export async function resetPasswordAction(input: ResetPasswordInput): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  if (
    await authRateLimited(
      "reset-password",
      (await getCurrentUser())?.id ?? "anonymous",
      5,
      60 * 60_000,
    )
  )
    return {
      ok: false,
      message: "Too many password reset attempts. Try again later.",
    };

  const environment = getServerEnvironment();
  if (!environment.supabaseConfigured) {
    return { ok: false, message: "Password recovery requires a configured Supabase project." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Password updated. You can now sign in.", redirectTo: "/login" };
}

export async function useDemoWorkspaceAction(): Promise<void> {
  const environment = getServerEnvironment();
  if (!environment.demoMode) redirect("/login?error=demo_disabled");
  await createDemoWorkspaceSession();
  redirect("/app/dashboard");
}

export async function oauthLoginAction(provider: "google" | "azure"): Promise<void> {
  const environment = getServerEnvironment();
  if (!environment.supabaseConfigured) redirect("/login?error=provider_not_configured");

  const supabase = await createServerSupabaseClient();
  const appUrl = environment.APP_URL || "http://127.0.0.1:3000";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${appUrl}/auth/callback?next=/app/dashboard`,
      scopes: provider === "azure" ? "email openid profile offline_access" : "email profile",
    },
  });

  if (error || !data.url) redirect("/login?error=oauth_start_failed");
  redirect(data.url);
}

export async function logoutAction(): Promise<void> {
  await clearDemoSession();
  const environment = getServerEnvironment();
  if (environment.supabaseConfigured) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function switchWorkspaceAction(formData: FormData): Promise<void> {
  const workspaceId = formData.get("workspaceId");
  if (typeof workspaceId !== "string") return;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.provider === "demo") {
    if (!DEMO_WORKSPACES.some((workspace) => workspace.id === workspaceId)) return;
    await setDemoActiveWorkspace(workspaceId);
  } else {
    const context = await getWorkspaceContext();
    if (!context?.workspaces.some((workspace) => workspace.id === workspaceId)) return;
    await setActiveWorkspaceCookie(workspaceId);
  }

  revalidatePath("/app", "layout");
  redirect("/app/dashboard");
}
