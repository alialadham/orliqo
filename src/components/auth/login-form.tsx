"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";

import { GoogleIcon, MicrosoftIcon } from "@/components/auth/provider-icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import {
  loginAction,
  oauthLoginAction,
  useDemoWorkspaceAction,
} from "@/features/auth/actions";
import {
  loginSchema,
  type AuthActionResult,
  type LoginInput,
} from "@/features/auth/schemas";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const microsoftAction = oauthLoginAction.bind(null, "azure");

export function LoginForm({
  next,
  initialError,
}: {
  next?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AuthActionResult | null>(
    initialError ? { ok: false, message: initialError } : null,
  );
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", next },
  });

  const submit = form.handleSubmit((values) => {
    setPending(true);
    setResult(null);
    startTransition(async () => {
      const actionResult = await loginAction(values);
      setResult(actionResult);
      setPending(false);
      if (actionResult.ok && actionResult.redirectTo)
        router.push(actionResult.redirectTo);
    });
  });

  async function signInWithGoogle() {
    setPending(true);
    setResult(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error || !data.url) {
        setResult({
          ok: false,
          message:
            error?.message ?? "Google sign-in could not start. Try again.",
        });
        setPending(false);
        return;
      }

      window.location.assign(data.url);
    } catch (error) {
      setResult({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Google sign-in could not start. Try again.",
      });
      setPending(false);
    }
  }

  return (
    <div className="w-full">
      <div>
        <h1 className="text-[34px] leading-tight font-bold sm:text-4xl">
          Welcome back
        </h1>
        <p className="text-muted-foreground mt-2 text-base">
          Sign in to continue to Orliqo.
        </p>
      </div>

      {result && !result.ok ? (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={submit} className="mt-8" noValidate>
        <FieldGroup className="gap-5">
          <Field data-invalid={Boolean(form.formState.errors.email)}>
            <FieldLabel htmlFor="login-email">Work email</FieldLabel>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              className="h-12 px-3.5 text-base"
              aria-invalid={Boolean(form.formState.errors.email)}
              {...form.register("email")}
            />
            <FieldError
              errors={[form.formState.errors.email]}
              className="min-h-5"
            />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.password)}>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <Link
                href="/forgot-password"
                className="text-primary text-sm font-medium hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <InputGroup className="bg-card h-12">
              <InputGroupInput
                id="login-password"
                type={passwordVisible ? "text" : "password"}
                autoComplete="current-password"
                className="h-12 px-3.5 text-base"
                aria-invalid={Boolean(form.formState.errors.password)}
                {...form.register("password")}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label={
                    passwordVisible ? "Hide password" : "Show password"
                  }
                  onClick={() => setPasswordVisible((current) => !current)}
                  size="icon-sm"
                >
                  {passwordVisible ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <FieldError
              errors={[form.formState.errors.password]}
              className="min-h-5"
            />
          </Field>
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full text-base"
            disabled={pending}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Signing in..." : "Continue"}
          </Button>
          <FieldSeparator>or continue with</FieldSeparator>
        </FieldGroup>
      </form>

      <div className="mt-5 grid gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="bg-card h-12 w-full text-base"
          onClick={signInWithGoogle}
          disabled={pending}
          aria-busy={pending}
        >
          <GoogleIcon data-icon="inline-start" className="size-5" />
          {pending ? "Connecting to Google..." : "Continue with Google"}
        </Button>
        <form action={microsoftAction}>
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="bg-card h-12 w-full text-base"
          >
            <MicrosoftIcon data-icon="inline-start" className="size-5" />
            Continue with Microsoft
          </Button>
        </form>
      </div>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        New to Orliqo?{" "}
        <Link
          href="/register"
          className="text-primary font-medium hover:underline"
        >
          Create account
        </Link>
      </p>

      <div className="mt-8 border-t pt-5">
        <form action={useDemoWorkspaceAction}>
          <div className="border-primary/25 bg-primary/[0.04] flex min-h-12 flex-col items-start gap-2 rounded-lg border px-3 py-2.5 text-sm sm:flex-row sm:items-center">
            <Info className="text-primary size-5 shrink-0" aria-hidden="true" />
            <span className="text-muted-foreground flex-1">
              Demo mode available - no messages are sent.
            </span>
            <Button
              type="submit"
              variant="link"
              size="sm"
              className="h-auto px-0 font-semibold"
            >
              Use demo workspace
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
