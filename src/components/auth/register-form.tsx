"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { registerAction } from "@/features/auth/actions";
import {
  COUNTRIES,
  TEAM_SIZES,
  registrationSchema,
  type AuthActionResult,
  type RegistrationInput,
} from "@/features/auth/schemas";

export function RegisterForm() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      companyName: "",
      country: "",
      teamSize: "",
      termsAccepted: false as true,
      marketingConsent: false,
    },
  });

  const submit = form.handleSubmit((values) => {
    setPending(true);
    setResult(null);
    startTransition(async () => {
      const actionResult = await registerAction(values);
      setResult(actionResult);
      setPending(false);
      if (actionResult.ok && actionResult.redirectTo) router.push(actionResult.redirectTo);
    });
  });

  return (
    <div className="w-full">
      <h1 className="text-[32px] leading-tight font-bold sm:text-4xl">Create your workspace</h1>
      <p className="mt-2 text-base text-muted-foreground">Start in demo mode. Connect providers when you are ready.</p>

      {result ? (
        <Alert variant={result.ok ? "default" : "destructive"} className="mt-6">
          {result.ok ? <CheckCircle2 className="size-4 text-success" /> : null}
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={submit} className="mt-7" noValidate>
        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(form.formState.errors.fullName)}>
              <FieldLabel htmlFor="full-name">Full name</FieldLabel>
              <Input id="full-name" autoComplete="name" placeholder="Enter your full name" className="h-12 text-base" aria-invalid={Boolean(form.formState.errors.fullName)} {...form.register("fullName")} />
              <FieldError errors={[form.formState.errors.fullName]} className="min-h-5" />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.email)}>
              <FieldLabel htmlFor="register-email">Work email</FieldLabel>
              <Input id="register-email" type="email" autoComplete="email" placeholder="you@company.com" className="h-12 text-base" aria-invalid={Boolean(form.formState.errors.email)} {...form.register("email")} />
              <FieldError errors={[form.formState.errors.email]} className="min-h-5" />
            </Field>
          </div>

          <Field data-invalid={Boolean(form.formState.errors.password)}>
            <FieldLabel htmlFor="register-password">Password</FieldLabel>
            <InputGroup className="h-12 bg-card">
              <InputGroupInput id="register-password" type={passwordVisible ? "text" : "password"} autoComplete="new-password" placeholder="Enter a strong password" className="h-12 px-3.5 text-base" aria-invalid={Boolean(form.formState.errors.password)} {...form.register("password")} />
              <InputGroupAddon align="inline-end">
                <InputGroupButton aria-label={passwordVisible ? "Hide password" : "Show password"} onClick={() => setPasswordVisible((current) => !current)} size="icon-sm">
                  {passwordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>At least 10 characters</FieldDescription>
            <FieldError errors={[form.formState.errors.password]} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(form.formState.errors.companyName)}>
              <FieldLabel htmlFor="company-name">Company name</FieldLabel>
              <Input id="company-name" autoComplete="organization" placeholder="Enter your company name" className="h-12 text-base" aria-invalid={Boolean(form.formState.errors.companyName)} {...form.register("companyName")} />
              <FieldError errors={[form.formState.errors.companyName]} className="min-h-5" />
            </Field>
            <Controller
              control={form.control}
              name="country"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="country">Country</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="country" className="h-12 w-full bg-card text-base" aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => <SelectItem key={country} value={country}>{country}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} className="min-h-5" />
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="teamSize"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="team-size">Team size</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="team-size" className="h-12 w-full bg-card text-base" aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select team size" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_SIZES.map((teamSize) => <SelectItem key={teamSize} value={teamSize}>{teamSize}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="termsAccepted"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="flex items-start gap-3">
                  <Checkbox id="terms" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} aria-invalid={fieldState.invalid} />
                  <FieldLabel htmlFor="terms" className="block leading-5 font-normal">
                    I agree to the <Link href="/terms" className="font-medium text-primary hover:underline">Terms</Link> and <Link href="/privacy" className="font-medium text-primary hover:underline">Privacy Policy</Link>.
                  </FieldLabel>
                </div>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="marketingConsent"
            render={({ field }) => (
              <div className="flex items-start gap-3">
                <Checkbox id="marketing" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                <FieldLabel htmlFor="marketing" className="leading-5 font-normal">Send me occasional product updates.</FieldLabel>
              </div>
            )}
          />

          <Button type="submit" size="lg" className="mt-1 h-12 w-full text-base" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Creating workspace..." : "Create My Workspace"}
          </Button>
        </FieldGroup>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link></p>
      <div className="mt-7 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-sm text-muted-foreground">
        <Info className="size-5 shrink-0 text-primary" aria-hidden="true" />
        Demo mode uses synthetic data and never sends messages.
      </div>
    </div>
  );
}
