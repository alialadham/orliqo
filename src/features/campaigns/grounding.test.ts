import { describe, expect, it } from "vitest";
import { validateGroundedMessage } from "./grounding";
import type { LeadDetailData } from "@/features/leads/types";
const lead={sources:[{id:"source-1"}],evidence:[]} as unknown as LeadDetailData;
const valid={subject:"Hello",body:"Grounded body",verifiedFactsUsed:["public fact"],sourceIds:["source-1"],personalizationSummary:"Uses one cited fact",riskFlags:[],unsupportedClaims:[],recommendedChannel:"email",confidence:.9};
describe("grounded message validation",()=>{it("accepts stored sources",()=>expect(validateGroundedMessage(valid,lead).sourceIds).toEqual(["source-1"]));it("rejects unknown sources",()=>expect(()=>validateGroundedMessage({...valid,sourceIds:["invented"]},lead)).toThrow(/stored lead sources/));it("rejects unsupported claims",()=>expect(()=>validateGroundedMessage({...valid,unsupportedClaims:["not evidenced"]},lead)).toThrow(/unsupported claims/));});
