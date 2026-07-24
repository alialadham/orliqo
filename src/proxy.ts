import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { DEMO_SESSION_COOKIE } from "@/features/auth/demo-session";
import { safeRedirectPath } from "@/lib/navigation";
import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
} from "@/lib/security/headers";
import type { Database } from "@/lib/supabase/database.types";

const protectedPrefixes = ["/app", "/onboarding"];

export async function proxy(request: NextRequest) {
  const production = process.env.NODE_ENV === "production";
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = buildContentSecurityPolicy(nonce, production);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  const secure = (target: NextResponse) => {
    applySecurityHeaders(target.headers, csp, production);
    return target;
  };
  const isProtected = protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  const hasDemoSession = request.cookies.has(DEMO_SESSION_COOKIE);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let hasSupabaseUser = false;

  if (url && key) {
    const supabase = createServerClient<Database>(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    hasSupabaseUser = Boolean(data.user);
  }

  if (isProtected && !hasDemoSession && !hasSupabaseUser) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "next",
      safeRedirectPath(`${request.nextUrl.pathname}${request.nextUrl.search}`),
    );
    return secure(NextResponse.redirect(loginUrl));
  }

  return secure(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
