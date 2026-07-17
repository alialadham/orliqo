import { NextResponse } from "next/server";

import { getServerEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  const environment = getServerEnvironment();
  return NextResponse.json({ status: "ok", mode: environment.demoMode ? "demo" : "configured", supabase: environment.supabaseConfigured ? "configured" : "not-configured", timestamp: new Date().toISOString() });
}
