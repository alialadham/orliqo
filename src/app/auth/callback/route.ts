import { NextResponse } from "next/server";

import { getServerEnvironment } from "@/lib/env";
import { safeRedirectPath } from "@/lib/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));
  const environment = getServerEnvironment();

  if (!code || !environment.supabaseConfigured) {
    return NextResponse.redirect(new URL("/login?error=oauth_callback_failed", requestUrl.origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=oauth_callback_failed", requestUrl.origin));

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
