import { z } from "zod";

export const emailDraftSchema = z
  .object({
    provider: z.enum(["gmail", "outlook", "smtp", "resend", "ses"]),
    from: z.email(),
    to: z.email(),
    subject: z.string().trim().min(1).max(180),
    text: z.string().trim().min(1).max(50_000),
    html: z.string().trim().min(1).max(100_000),
    signature: z.string().max(10_000).default(""),
    scheduledAt: z.iso.datetime().nullable().default(null),
    followUpDays: z.number().int().min(0).max(90).nullable().default(null),
    threadId: z.string().trim().max(512).nullable().default(null),
    idempotencyKey: z.string().trim().min(8).max(240),
    trackingEnabled: z.boolean().default(false),
    bcc: z.array(z.email()).max(0).default([]),
  })
  .strict();

export type EmailDraft = z.infer<typeof emailDraftSchema>;

export const whatsappSendSchema = z
  .object({
    to: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/, "Use an E.164 number."),
    body: z.string().trim().min(1).max(4096),
    consent: z.enum(["granted", "revoked", "unknown"]),
    doNotContact: z.boolean(),
    sessionOpen: z.boolean(),
    templateName: z.string().trim().min(1).max(512).nullable(),
    templateStatus: z
      .enum(["approved", "pending", "rejected", "paused"])
      .nullable(),
    variables: z.record(z.string(), z.string().max(1024)),
    requiredVariables: z.array(z.string().max(64)).max(30),
    idempotencyKey: z.string().trim().min(8).max(240),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.doNotContact || value.consent !== "granted") {
      context.addIssue({
        code: "custom",
        path: ["consent"],
        message: "Consent and suppression checks blocked this message.",
      });
    }
    if (
      !value.sessionOpen &&
      (!value.templateName || value.templateStatus !== "approved")
    ) {
      context.addIssue({
        code: "custom",
        path: ["templateName"],
        message: "An approved template is required outside the service window.",
      });
    }
    for (const variable of value.requiredVariables) {
      if (!value.variables[variable]?.trim()) {
        context.addIssue({
          code: "custom",
          path: ["variables", variable],
          message: `Template variable ${variable} is required.`,
        });
      }
    }
  });

export const calendarEventInputSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    type: z.enum(["message", "follow_up", "meeting", "campaign", "call"]),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime().nullable(),
    leadName: z.string().trim().max(180).optional(),
  })
  .superRefine((value, context) => {
    if (value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End time must be after start time.",
      });
    }
  });

export type CalendarEventInput = z.infer<typeof calendarEventInputSchema>;
