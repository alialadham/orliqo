# Orliqo Production Auth & Supabase Release Report

Date: 2026-08-11

Git operations: none

Application deployment: not performed

Database reset/data deletion: not performed

## Release status

| Area | Status | Evidence |
| --- | --- | --- |
| Authentication | **FAIL** | The release candidate passes automated checks, but the live Vercel deployment is stale and `/api/health` returns 500. |
| Google OAuth | **FAIL** | The release candidate reaches Supabase and redirects to Google correctly. The live deployment returns 404 for `/auth/google`. |
| Email Authentication | **FAIL** | Hosted email signup is enabled and confirmation is required, but production custom SMTP is not configured/verified. |
| Workspace Bootstrap | **PASS** | Trigger enabled; repair function and service boundary valid; all non-seed Auth users have profiles and active memberships. |
| RLS | **PASS** | Every public table has RLS; 166 policies; the public view uses `security_invoker`; no client-callable public `SECURITY DEFINER` functions remain. |
| Pending Migrations | **PASS** | Local and remote migration histories match; no pending migrations remain. |
| SMTP | **FAIL** | Supabase default SMTP is non-production and limited to two messages/hour. Custom SMTP and DNS require human credentials/configuration. |
| Security | **FAIL** | Code/database controls pass, but hosted leaked-password protection is still disabled and production CAPTCHA is not configured. |

## Database release

Applied after `supabase db push --dry-run` review:

| Migration | Classification | Result |
| --- | --- | --- |
| `20260811110333_auth_bootstrap_repair.sql` | Safe schema/function/trigger change; no bulk data migration; non-destructive | Applied |
| `20260811143500_auth_service_rpc_boundary.sql` | Safe function/grant change; no data mutation; non-destructive | Applied |
| `20260811123349_security_advisor_hardening.sql` | Safe function ACL change; non-destructive | Applied |
| `20260811124026_rpc_invoker_boundaries.sql` | Safe function security/grant change; non-destructive | Applied |
| `20260811124721_fix_rate_limit_parameter_ambiguity.sql` | Safe function bug fix; non-destructive | Applied |

The production auth blocker found during verification was PostgreSQL error `42702`: `bucket_key` was ambiguous between the rate-limit function parameter and conflict-target column. The conflict now targets `rate_limit_buckets_pkey` explicitly. The service-role RPC returns an allowed result successfully.

Post-release database checks:

- PostgreSQL 17.6.
- Auth trigger `on_auth_user_created` enabled.
- Auth/bootstrap and rate-limit wrappers are `SECURITY INVOKER` with correct role ACLs.
- No public table lacks RLS.
- No `anon` or `authenticated` role can execute a public `SECURITY DEFINER` function.
- `billing_events` and `provider_webhook_events` intentionally have no client policies and no client table grants; they are server/webhook-only.
- The remaining Supabase security-advisor warning is hosted leaked-password protection.

## Authentication architecture

- Email/password signup, login, recovery, and reset use server-side Supabase clients.
- Google uses Supabase PKCE, a cookie-bound verifier, `exchangeCodeForSession`, and a safe internal `next` allow-list.
- Protected requests refresh/validate sessions with `getUser`.
- Logout clears Supabase, active-workspace, and demo cookies.
- Workspace bootstrap is idempotent: profile → workspace → owner membership → settings → business profile → trial subscription.
- Authorization uses active workspace membership and RLS, not user-editable metadata.
- Service-role access stays in `server-only` modules and is never exposed through `NEXT_PUBLIC_*` variables.
- Auth logs contain safe stage/error metadata only; no passwords, OAuth codes, cookies, tokens, or keys.

## Google OAuth

Release-candidate result:

- App route: HTTP 307 to the hosted Supabase `/auth/v1/authorize` endpoint.
- Supabase: HTTP 302 to `https://accounts.google.com/o/oauth2/v2/auth`.
- Google provider: enabled.
- Interactive consent/session callback: not completed because no controlled Google test identity was provided.

Live result:

- `https://orliqo.vercel.app/auth/google`: 404.
- Current build includes `/auth/google`; therefore the exact live root cause is a stale deployment.

## Production Auth SMTP

Recommended provider: **Resend**, using a dedicated auth subdomain to isolate transactional-auth reputation from campaign/marketing mail.

Supabase Authentication → Email → SMTP settings:

| Setting | Required value |
| --- | --- |
| Custom SMTP | Enabled |
| Host | `smtp.resend.com` |
| Port | `587` |
| Security | STARTTLS |
| Username | `resend` |
| Password | A restricted Resend API key created by a human |
| Sender name | `Orliqo` |
| Sender email/admin email | `no-reply@auth.orliqo.com` |
| Email signup | Enabled |
| Auto-confirm | Disabled |
| Secure email change | Enabled |

The application's `SMTP_*` environment variables configure campaign delivery and do **not** configure hosted Supabase Auth email.

### DNS

Add `auth.orliqo.com` to Resend and copy its generated records exactly:

- SPF TXT and feedback MX at the Resend-provided `send.auth.orliqo.com` host.
- DKIM TXT at the Resend-provided selector, normally `resend._domainkey.auth.orliqo.com`.
- Initial DMARC TXT:
  - Host: `_dmarc.auth.orliqo.com`
  - Value: `v=DMARC1; p=none; rua=mailto:dmarc@orliqo.com;`

After all legitimate sources pass SPF/DKIM/DMARC, move DMARC to `p=quarantine`, then `p=reject`. Do not merge the auth-subdomain SPF record with the existing root SPF forwarding record. Current public DNS has root forwarding SPF/MX but no Auth-subdomain SPF, DKIM, or DMARC records.

### Auth email templates

Disable provider click tracking so links are not rewritten. Use server-side token-hash links:

- Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding`
- Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`

Keep messages short, transactional, and free of user-provided content. Start with Supabase's post-SMTP default limit of 30 Auth emails/hour, then raise it only after monitoring delivery and abuse.

## Verification

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 45 files, 171 tests passed.
- `pnpm build`: passed; `/auth/google`, callbacks, confirmation, login, registration, recovery, reset, onboarding, and protected routes included.
- `pnpm test:e2e`: 42 tests passed across desktop, tablet, and mobile Chromium.
- Supabase migration list: local equals remote; zero pending.
- Supabase security advisor: database issues fixed; hosted leaked-password protection remains.
- Linked pgTAP execution could not start because Docker Desktop is unavailable; direct remote RLS/ACL/bootstrap queries and static migration tests passed.

## Remaining manual steps

1. Deploy the verified current build; no deployment was performed by this task.
2. Set production `APP_URL` and `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin. Set the Supabase Site URL and exact allow-list entries for `/auth/callback` and `/auth/confirm`.
3. In Google Cloud, use the Supabase callback URL `https://umonbkiawwcqhmsmgknq.supabase.co/auth/v1/callback`, set the production JavaScript origin, publish/verify the consent screen, and complete one controlled new-user and returning-user consent flow.
4. Create the Resend account/API key, add the DNS records above, enable Supabase custom SMTP, install the Auth templates, disable click tracking, and test confirmation/recovery delivery.
5. Enable Supabase leaked-password protection and Turnstile/hCaptcha for public signup/recovery.
6. Start Docker Desktop and run `pnpm exec supabase test db` for the local pgTAP tenant-isolation suite.

Do not commit, push, or deploy until the manual release gates are complete.
