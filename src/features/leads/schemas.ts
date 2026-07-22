import { z } from "zod";

const optionalUrl = z.union([z.literal(""), z.string().url()]);

export const leadInputSchema = z.object({
  id: z.string().optional(), businessName: z.string().trim().min(1).max(200), legalName: z.string().trim().max(200),
  industry: z.string().trim().max(120), category: z.string().trim().max(120), description: z.string().trim().max(3000),
  country: z.string().trim().max(100), city: z.string().trim().max(100), address: z.string().trim().max(300),
  websiteUrl: optionalUrl, websiteStatus: z.string().min(1), email: z.union([z.literal(""), z.string().email()]),
  emailVerification: z.enum(["verified", "risky", "invalid", "unverified", "missing"]), phone: z.string().trim().max(40),
  phoneVerification: z.enum(["verified", "risky", "invalid", "unverified", "missing"]), whatsappAvailable: z.boolean(),
  whatsappConsent: z.enum(["opted_in", "opted_out", "unknown", "not_required"]), instagramUrl: optionalUrl,
  facebookUrl: optionalUrl, linkedinUrl: optionalUrl, reviewCount: z.number().int().nonnegative().nullable(),
  averageRating: z.number().min(0).max(5).nullable(), services: z.array(z.string().trim().min(1)).max(30),
  employeeEstimate: z.number().int().nonnegative().nullable(), revenueEstimate: z.number().nonnegative().nullable(),
  qualificationScore: z.number().int().min(0).max(100), qualificationReason: z.string().trim().max(2000),
  suggestedOpportunity: z.string().trim().max(2000), recommendedChannel: z.enum(["email", "whatsapp", "instagram", "linkedin", "manual_call"]),
  personalizationAngle: z.string().trim().max(2000), status: z.enum(["new", "qualified", "disqualified", "contacted", "replied", "interested", "won", "lost", "do_not_contact", "archived"]),
  assignedTo: z.string(), tags: z.array(z.string().trim().min(1)).max(30), duplicateOverride: z.boolean().default(false),
});

export type LeadInput = z.input<typeof leadInputSchema>;

export type LeadActionResult = { ok: boolean; message: string; id?: string; duplicateId?: string; fieldErrors?: Record<string, string[]> };
