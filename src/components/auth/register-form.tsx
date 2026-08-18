"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { PasswordGuidance } from "@/components/auth/password-guidance";
import { GoogleIcon } from "@/components/auth/provider-icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { registerAction } from "@/features/auth/actions";
import { registrationSchema, type AuthActionResult, type RegistrationInput } from "@/features/auth/schemas";

export function RegisterForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AuthActionResult | null>(
    initialError ? { ok: false, message: initialError } : null,
  );
  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      termsAccepted: false as true,
      marketingConsent: false,
    },
  });
  const password = useWatch({ control: form.control, name: "password" });

  const submit = form.handleSubmit((values) => {
    if (pending) return;
    setPending(true);
    setResult(null);
    startTransition(async () => {
      try {
        const actionResult = await registerAction(values);
        setResult(actionResult);
        if (actionResult.ok && actionResult.redirectTo)
          router.push(actionResult.redirectTo);
      } catch {
        setResult({ ok: false, message: "We could not create the account. Please try again." });
      } finally {
        setPending(false);
      }
    });
  });

  return (
    <div className="w-full">
      <h1 className="text-[32px] leading-tight font-bold sm:text-4xl">Create your account</h1>
      <p className="mt-2 text-base text-muted-foreground">Start with the essentials. You’ll set up your business next.</p>

      {result ? (
        <Alert variant={result.ok ? "default" : "destructive"} className="mt-6" aria-live="polite">
          {result.ok ? <CheckCircle2 className="size-4 text-success" /> : null}
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}

      <form action="/auth/google" method="get" className="mt-7">
        <input type="hidden" name="next" value="/onboarding" />
        <input type="hidden" name="source" value="register" />
        <Button type="submit" variant="outline" size="lg" className="h-12 w-full bg-card text-base" disabled={pending}>
          <GoogleIcon data-icon="inline-start" className="size-5" />
          Continue with Google
        </Button>
      </form>

      <FieldSeparator className="my-6">or use email</FieldSeparator>

      <form onSubmit={submit} noValidate>
        <FieldGroup className="gap-4">
          <Field data-invalid={Boolean(form.formState.errors.fullName)}>
            <FieldLabel htmlFor="full-name">Full name</FieldLabel>
            <Input id="full-name" autoComplete="name" className="h-12 text-base" aria-invalid={Boolean(form.formState.errors.fullName)} {...form.register("fullName")} />
            <FieldError errors={[form.formState.errors.fullName]} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.email)}>
            <FieldLabel htmlFor="register-email">Work email</FieldLabel>
            <Input id="register-email" type="email" autoComplete="email" placeholder="you@company.com" className="h-12 text-base" aria-invalid={Boolean(form.formState.errors.email)} {...form.register("email")} />
            <FieldError errors={[form.formState.errors.email]} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.password)}>
            <FieldLabel htmlFor="register-password">Password</FieldLabel>
            <InputGroup className="h-12 bg-card">
              <InputGroupInput id="register-password" type={passwordVisible ? "text" : "password"} autoComplete="new-password" className="h-12 px-3.5 text-base" aria-invalid={Boolean(form.formState.errors.password)} {...form.register("password")} />
              <InputGroupAddon align="inline-end">
                <InputGroupButton type="button" aria-label={passwordVisible ? "Hide password" : "Show password"} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((current) => !current)} size="icon-sm">
                  {passwordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <PasswordGuidance password={password} />
            <FieldError errors={[form.formState.errors.password]} />
          </Field>
          <Controller control={form.control} name="termsAccepted" render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-start gap-3">
                <Checkbox id="terms" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} aria-invalid={fieldState.invalid} />
                <FieldLabel htmlFor="terms" className="block leading-5 font-normal">
                  I agree to the <Link href="/terms" target="_blank" className="font-medium text-primary hover:underline">Terms</Link> and <Link href="/privacy" target="_blank" className="font-medium text-primary hover:underline">Privacy Policy</Link>.
                </FieldLabel>
              </div>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )} />
          <Controller control={form.control} name="marketingConsent" render={({ field }) => (
            <div className="flex items-start gap-3">
              <Checkbox id="marketing" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
              <FieldLabel htmlFor="marketing" className="leading-5 font-normal">Send me occasional product updates. Optional.</FieldLabel>
            </div>
          )} />
          <Button type="submit" size="lg" className="mt-1 h-12 w-full text-base" disabled={pending} aria-busy={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </FieldGroup>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link></p>
    </div>
  );
}
