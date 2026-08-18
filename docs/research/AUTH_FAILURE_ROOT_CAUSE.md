# Authentication Failure Root Cause

Date: 2026-08-11

## Reproduction and evidence

The failing production call path was reconstructed from commits `61a4e05^` and
`91bb842^`, then checked against the current branch and focused auth tests.

1. A successful Supabase sign-in redirected to `/app/dashboard`.
2. `src/app/app/layout.tsx` called `getCurrentUser()`.
3. In `91bb842^`, `src/features/auth/session.ts:18` called
   `getServerEnvironment()` before reading the Supabase session.
4. The same full parser was called again by
   `src/features/workspaces/data.ts:25` and, in `61a4e05^`, by
   `src/lib/supabase/server.ts:20`.
5. `getServerEnvironment()` parsed every provider configuration. In a normal
   auth-only production deployment, an unrelated missing or partial AI, billing,
   email, WhatsApp, Inngest, Sentry, analytics, or research-provider group raised
   `EnvironmentValidationError` from `src/lib/env.ts:607`.
6. The exception escaped the authenticated layout and rendered
   `src/app/error.tsx`: “Orliqo could not load this view” / “The request stopped
   safely.”

The exact exception class was `EnvironmentValidationError`. The triggering line
for the first authenticated render was historical
`src/features/auth/session.ts:18`; the shared client repeated the fault at
historical `src/lib/supabase/server.ts:20`.

## Fix applied

Authentication now parses only Supabase and application URL settings. Billing,
messaging, AI, background jobs, analytics, and integration configuration are
validated only when their features run. The production rate limiter uses a
service-role-only public RPC wrapper, so auth does not depend on exposing the
database's private schema through PostgREST. An unavailable limiter fails closed
with an availability message instead of incorrectly telling the user they made
too many attempts.

## Account bootstrap assessment

`private.handle_new_auth_user()` is an `AFTER INSERT` trigger on `auth.users`.
Within the same database transaction it inserts:

1. `profiles`
2. `workspaces`
3. active owner `workspace_members`
4. `workspace_settings`
5. incomplete `business_profiles`
6. trial `subscriptions`
7. an audit record

Both email/password and OAuth users enter through the same `auth.users` trigger,
so the intended bootstrap is equivalent. The trigger uses a generated workspace
UUID in the slug and the user ID primary key, which prevents returning users from
creating a second bootstrap through a normal login.

An idempotent repair function now restores missing bootstrap rows and reuses an
existing active workspace. Email/password and OAuth callbacks invoke the same
repair path after Supabase establishes the user/session.

## Verification

The hosted project was verified with a temporary confirmed user: Auth user,
profile, workspace, active owner membership, business profile, and password login
all existed. The temporary workspace, audit record, and user were removed. Local
Supabase pgTAP execution remains unavailable because Docker is not running.
