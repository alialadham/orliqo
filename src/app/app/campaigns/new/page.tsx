import { CampaignBuilder } from "@/components/campaigns/campaign-builder";
import { z } from "zod";
export default async function NewCampaignPage({searchParams}:{searchParams:Promise<{leadId?:string}>}){const {leadId}=await searchParams;const parsed=z.string().uuid().safeParse(leadId);return <CampaignBuilder initialLeadId={parsed.success?parsed.data:undefined}/>}
