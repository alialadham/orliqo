import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 15;
const commonPasswords = new Set([
  "123456789012345",
  "passwordpassword",
  "password123456",
  "qwertyuiop12345",
  "letmeinletmein",
]);

export function isCommonPassword(password: string): boolean {
  return commonPasswords.has(password.toLowerCase());
}

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(128, "Use no more than 128 characters.")
  .refine((password) => !isCommonPassword(password), {
    message: "Choose a less common password.",
  });

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid work email."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export const registrationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(100),
  email: z.string().trim().email("Enter a valid work email."),
  password: passwordSchema,
  termsAccepted: z.literal(true, { error: "You must agree to the Terms and Privacy Policy." }),
  marketingConsent: z.boolean(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid work email."),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export type AuthActionResult =
  | { ok: true; message?: string; redirectTo?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };
