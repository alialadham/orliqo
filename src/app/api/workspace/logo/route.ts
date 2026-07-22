import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { readDemoSession } from "@/features/auth/demo-session";
import { requirePermission } from "@/features/permissions/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxSize = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const context = await requirePermission("settings:manage");
  if (!context) return NextResponse.json({ error: "Workspace settings permission required." }, { status: 403 });
  const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File) || !allowed.has(file.type) || file.size < 1 || file.size > maxSize) return NextResponse.json({ error: "Use a PNG, JPG, or WebP logo up to 2 MB." }, { status: 400 });
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${context.activeWorkspace.id}/logos/${randomUUID()}.${extension}`;
  const session = await readDemoSession();
  if (session?.kind === "workspace" && context.isDemo) return NextResponse.json({ logoUrl: `demo:${path}`, previewUrl: "/favicon.ico", demo: true });
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.storage.from("workspace-assets").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: "Logo could not be stored." }, { status: 422 });
  const { error: updateError } = await supabase.from("business_profiles").update({ logo_url: path }).eq("workspace_id", context.activeWorkspace.id);
  if (updateError) return NextResponse.json({ error: "Logo was uploaded but could not be attached to the profile." }, { status: 422 });
  const { data } = await supabase.storage.from("workspace-assets").createSignedUrl(path, 300);
  return NextResponse.json({ logoUrl: path, previewUrl: data?.signedUrl ?? "" });
}

export async function DELETE(request: Request) {
  const context = await requirePermission("settings:manage");
  if (!context) return NextResponse.json({ error: "Workspace settings permission required." }, { status: 403 });
  const body = await request.json().catch(() => null) as { logoUrl?: string } | null;
  const session = await readDemoSession();
  if (!(session?.kind === "workspace" && context.isDemo) && body?.logoUrl && body.logoUrl.startsWith(`${context.activeWorkspace.id}/logos/`)) {
    const supabase = await createServerSupabaseClient(); await supabase.storage.from("workspace-assets").remove([body.logoUrl]); await supabase.from("business_profiles").update({ logo_url: null }).eq("workspace_id", context.activeWorkspace.id);
  }
  return NextResponse.json({ ok: true });
}
