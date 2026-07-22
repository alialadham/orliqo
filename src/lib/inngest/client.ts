import "server-only";

import { Inngest } from "inngest";
import { z } from "zod";

export const inngest = new Inngest({ id: "orliqo" });

export const websiteImportRequestedSchema = z.object({
  importId: z.string().uuid(),
  jobRunId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  requestedBy: z.string().uuid(),
  requestedUrl: z.string().url().max(2048),
});

export type WebsiteImportRequested = z.infer<typeof websiteImportRequestedSchema>;
