import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { importWebsiteFunction } from "@/lib/inngest/functions/import-website";
import { phase3Functions } from "@/lib/inngest/functions/phase3";

export const runtime = "nodejs";
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [importWebsiteFunction, ...phase3Functions],
});
