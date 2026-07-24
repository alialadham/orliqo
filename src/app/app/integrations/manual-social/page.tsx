import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { ManualSocialList } from "@/components/integrations/manual-social-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getManualSocialDrafts } from "@/features/integrations/data";

export default async function ManualSocialPage() {
  const drafts = await getManualSocialDrafts();
  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href="/app/integrations">
            <ArrowLeft />
            Integrations
          </Link>
        </Button>
        <Badge variant="outline" className="mb-3 ml-2">
          <ShieldCheck />
          No auto-DM
        </Badge>
        <h1 className="text-3xl font-bold">Manual social outreach</h1>
        <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
          Open a public Instagram or LinkedIn profile, copy a grounded draft,
          send it yourself, then record the activity and reply. Orliqo does not
          automate these channels.
        </p>
      </div>
      <ManualSocialList drafts={drafts} />
    </div>
  );
}
