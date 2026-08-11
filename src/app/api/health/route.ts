import { NextResponse } from "next/server";

import { getRuntimeEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  const environment = getRuntimeEnvironment();
  return NextResponse.json({ status: "ok", supabase: environment.supabaseConfigured ? "configured" : "not-configured", timestamp: new Date().toISOString() });
}
