import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { ensureAuthenticatedUserWorkspace } from "@/features/auth/bootstrap";
import { safeRedirectPath } from "@/lib/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const allowedTypes = new Set<EmailOtpType>(["email", "signup", "recovery", "invite", "magiclink", "email_change"]);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const rawType = requestUrl.searchParams.get("type");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));

  if (!tokenHash || !rawType || !allowedTypes.has(rawType as EmailOtpType)) {
    return NextResponse.redirect(new URL("/login?error=confirmation_failed", requestUrl.origin));
  }

  try {
    const supabase = await createServerSupabaseClient(undefined, { requireCookieWrites: true });
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: rawType as EmailOtpType });
    if (error) return NextResponse.redirect(new URL("/login?error=confirmation_failed", requestUrl.origin));
    if (data.user) await ensureAuthenticatedUserWorkspace(data.user);
  } catch (error) {
    console.error(JSON.stringify({ event: "auth_confirmation", status: "failed", errorName: error instanceof Error ? error.name : typeof error }));
    return NextResponse.redirect(new URL("/login?error=confirmation_failed", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
