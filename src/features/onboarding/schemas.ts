import { z } from "zod";

const optionalUrl = z.union([z.literal(""), z.string().url()]);
const optionalText = z.string().trim().max(2000);

export const businessSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  websiteUrl: optionalUrl,
  industry: z.string().trim().min(2).max(120),
  country: z.string().trim().min(2).max(80),
  city: z.string().trim().min(1).max(100),
  companySize: z.string().trim().min(1).max(80),
  employeeRange: z.string().trim().max(80),
  description: z.string().trim().min(20).max(2000),
  logoUrl: optionalText,
  instagramUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  whatsappNumber: z.string().trim().max(30),
});

export const offerSchema = z.object({
  mainService: z.string().trim().min(2).max(200),
  additionalServices: z.array(z.string().trim().min(1).max(200)).max(20),
  averageProjectValue: z.number().min(0).max(100_000_000),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  pricingModel: z.string().trim().min(1).max(100),
  salesCycle: z.string().trim().min(1).max(100),
  mainCustomerProblem: z.string().trim().min(10).max(1000),
  competitiveAdvantage: z.string().trim().min(10).max(1000),
  defaultCta: z.string().trim().min(1).max(100),
  customCta: z.string().trim().max(200),
  brandTone: z.string().trim().max(100),
  sellingPoints: z.array(z.string().trim().min(1).max(300)).max(12),
}).superRefine((value, context) => {
  if (value.defaultCta === "custom" && !value.customCta) {
    context.addIssue({ code: "custom", path: ["customCta"], message: "Enter the custom call to action." });
  }
});

const nullableNonNegative = z.number().int().nonnegative().nullable();

export const icpSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  naturalLanguageDescription: z.string().trim().min(10).max(2000),
  summary: z.string().trim().min(10).max(2000),
  countries: z.array(z.string().trim().min(1)).max(50),
  cities: z.array(z.string().trim().min(1)).max(100),
  industries: z.array(z.string().trim().min(1)).max(50),
  companySizes: z.array(z.string().trim().min(1)).max(20),
  employeeMin: nullableNonNegative,
  employeeMax: nullableNonNegative,
  revenueMin: z.number().nonnegative().nullable(),
  revenueMax: z.number().nonnegative().nullable(),
  businessAgeMin: nullableNonNegative,
  businessAgeMax: nullableNonNegative,
  websiteStatuses: z.array(z.string()).max(8),
  socialActivityMin: z.number().int().min(0).max(100).nullable(),
  reviewCountMin: nullableNonNegative,
  keywords: z.array(z.string().trim().min(1)).max(50),
  excludedIndustries: z.array(z.string().trim().min(1)).max(50),
  excludedCompanies: z.array(z.string().trim().min(1)).max(100),
  minimumScore: z.number().int().min(0).max(100),
  requiredContactMethods: z.array(z.string()).max(5),
  audienceBreadth: z.enum(["narrow", "balanced", "broad"]),
  isDefault: z.boolean(),
  archived: z.boolean(),
}).superRefine((value, context) => {
  const ranges = [
    ["employeeMax", value.employeeMin, value.employeeMax],
    ["revenueMax", value.revenueMin, value.revenueMax],
    ["businessAgeMax", value.businessAgeMin, value.businessAgeMax],
  ] as const;
  for (const [path, minimum, maximum] of ranges) {
    if (minimum !== null && maximum !== null && maximum < minimum) {
      context.addIssue({ code: "custom", path: [path], message: "Maximum must be greater than or equal to minimum." });
    }
  }
});

export const goalsSchema = z.object({
  leadsPerMonth: z.number().int().min(1).max(10_000),
  messagesPerDay: z.number().int().min(1).max(1_000),
  sendingDays: z.array(z.number().int().min(0).max(6)).min(1),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  conversionGoal: z.string().trim().min(1).max(100),
  followUpCount: z.number().int().min(0).max(10),
  minimumScore: z.number().int().min(0).max(100),
  autoReplenish: z.boolean(),
  timezone: z.string().trim().min(1).max(100),
}).superRefine((value, context) => {
  if (value.startTime >= value.endTime) {
    context.addIssue({ code: "custom", path: ["endTime"], message: "End time must be later than start time." });
  }
});

export type OnboardingActionResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};
