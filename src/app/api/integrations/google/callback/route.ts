import { NextResponse } from "next/server";

import { getCurrentUser } from "@/features/auth/session";
import { completeOAuthIntegration } from "@/features/integrations/oauth-service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.provider !== "supabase")
    return NextResponse.redirect(
      new URL("/login?error=oauth_session", request.url),
    );
  const query = new URL(request.url).searchParams;
  const code = query.get("code");
  const state = query.get("state");
  if (!code || !state)
    return NextResponse.redirect(
      new URL("/app/integrations?state=error", request.url),
    );
  try {
    const result = await completeOAuthIntegration({
      code,
      state,
      actorId: user.id,
      expectedProvider: "google",
    });
    return NextResponse.redirect(new URL(result.redirectPath, request.url));
  } catch {
    return NextResponse.redirect(
      new URL("/app/integrations?state=error", request.url),
    );
  }
}
