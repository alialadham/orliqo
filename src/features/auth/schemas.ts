import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid work email."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export const registrationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(100),
  email: z.string().trim().email("Enter a valid work email."),
  password: z.string().min(10, "Use at least 10 characters.").max(128),
  companyName: z.string().trim().min(2, "Enter your company name.").max(120),
  country: z.string().min(2, "Select a country."),
  teamSize: z.string().min(1, "Select a team size."),
  termsAccepted: z.literal(true, { error: "You must agree to the Terms and Privacy Policy." }),
  marketingConsent: z.boolean(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid work email."),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(10, "Use at least 10 characters.").max(128),
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

export const COUNTRIES = ["Jordan", "United Arab Emirates", "Saudi Arabia", "Qatar", "United States", "United Kingdom"] as const;
export const TEAM_SIZES = ["Just me", "2-5", "6-20", "21-50", "51-200", "201+"] as const;
