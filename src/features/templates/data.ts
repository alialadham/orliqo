import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { readDemoSession } from "@/features/auth/demo-session";
import { getWorkspaceContext } from "@/features/workspaces/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type MessageTemplateSummary = {
  id: string;
  name: string;
  category: string;
  channel: string;
  body: string;
  archived: boolean;
};

const demoTemplates: MessageTemplateSummary[] = [
  {
    id: "demo-template-introduction",
    name: "Evidence-backed introduction",
    category: "Introduction",
    channel: "Email",
    body: "Hi {{business_name}}, I noticed {{verified_opportunity}}. {{offer}}. {{cta}}.",
    archived: false,
  },
  {
    id: "demo-template-follow-up",
    name: "Follow-up with context",
    category: "Follow-up",
    channel: "Email",
    body: "Following up on the {{verified_opportunity}} note. {{cta}}",
    archived: false,
  },
];

export async function getMessageTemplates(): Promise<MessageTemplateSummary[]> {
  const demo = await readDemoSession();
  if (demo?.kind === "workspace") return structuredClone(demoTemplates);
  const context = await getWorkspaceContext();
  if (!context) return [];
  const client = (await createServerSupabaseClient()) as unknown as SupabaseClient;
  const fields = "id,name,category,channel,body_template,archived_at";
  const [workspaceTemplates, globalTemplates] = await Promise.all([
    client
      .from("message_templates")
      .select(fields)
      .eq("workspace_id", context.activeWorkspace.id)
      .order("is_default", { ascending: false })
      .order("name"),
    client
      .from("message_templates")
      .select(fields)
      .is("workspace_id", null)
      .order("is_default", { ascending: false })
      .order("name"),
  ]);
  return [
    ...(workspaceTemplates.data ?? []),
    ...(globalTemplates.data ?? []),
  ].map((template) => ({
    id: template.id,
    name: template.name,
    category: template.category,
    channel: template.channel,
    body: template.body_template,
    archived: Boolean(template.archived_at),
  }));
}
