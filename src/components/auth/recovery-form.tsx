"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { forgotPasswordAction, resetPasswordAction } from "@/features/auth/actions";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type AuthActionResult,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/features/auth/schemas";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  const submit = form.handleSubmit((values) => {
    setPending(true);
    startTransition(async () => {
      setResult(await forgotPasswordAction(values));
      setPending(false);
    });
  });

  return (
    <RecoveryFrame title="Reset your password" description="Enter your work email and we’ll send a secure reset link.">
      {result ? <Alert variant={result.ok ? "default" : "destructive"}><AlertDescription>{result.message}</AlertDescription></Alert> : null}
      <form onSubmit={submit} noValidate>
        <FieldGroup>
          <Field data-invalid={Boolean(form.formState.errors.email)}>
            <FieldLabel htmlFor="recovery-email">Work email</FieldLabel>
            <Input id="recovery-email" type="email" autoComplete="email" className="h-12 text-base" aria-invalid={Boolean(form.formState.errors.email)} {...form.register("email")} />
            <FieldError errors={[form.formState.errors.email]} />
          </Field>
          <Button type="submit" className="h-12" disabled={pending}>{pending ? <Spinner data-icon="inline-start" /> : null}{pending ? "Sending..." : "Send reset link"}</Button>
        </FieldGroup>
      </form>
    </RecoveryFrame>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const form = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirmPassword: "" } });

  const submit = form.handleSubmit((values) => {
    setPending(true);
    startTransition(async () => {
      const actionResult = await resetPasswordAction(values);
      setResult(actionResult);
      setPending(false);
      if (actionResult.ok && actionResult.redirectTo) setTimeout(() => router.push(actionResult.redirectTo as string), 700);
    });
  });

  return (
    <RecoveryFrame title="Choose a new password" description="Use at least 10 characters and do not reuse a provider password.">
      {result ? <Alert variant={result.ok ? "default" : "destructive"}>{result.ok ? <CheckCircle2 className="size-4 text-success" /> : null}<AlertDescription>{result.message}</AlertDescription></Alert> : null}
      <form onSubmit={submit} noValidate>
        <FieldGroup>
          <Field data-invalid={Boolean(form.formState.errors.password)}>
            <FieldLabel htmlFor="new-password">New password</FieldLabel>
            <Input id="new-password" type="password" autoComplete="new-password" className="h-12 text-base" aria-invalid={Boolean(form.formState.errors.password)} {...form.register("password")} />
            <FieldError errors={[form.formState.errors.password]} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.confirmPassword)}>
            <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
            <Input id="confirm-password" type="password" autoComplete="new-password" className="h-12 text-base" aria-invalid={Boolean(form.formState.errors.confirmPassword)} {...form.register("confirmPassword")} />
            <FieldError errors={[form.formState.errors.confirmPassword]} />
          </Field>
          <Button type="submit" className="h-12" disabled={pending}>{pending ? <Spinner data-icon="inline-start" /> : null}{pending ? "Updating..." : "Update password"}</Button>
        </FieldGroup>
      </form>
    </RecoveryFrame>
  );
}

function RecoveryFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-7 space-y-5">{children}</div>
      <p className="mt-7 text-center text-sm"><Link href="/login" className="font-medium text-primary hover:underline">Back to sign in</Link></p>
    </div>
  );
}
