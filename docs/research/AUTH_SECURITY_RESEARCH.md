# Authentication and Security Research

Reviewed: 2026-08-11

| Source | Finding | Orliqo application |
| --- | --- | --- |
| [Supabase changelog](https://supabase.com/changelog?types=breaking-change) | The current breaking-change feed was reviewed. The recent Envoy gateway change applies to self-hosted Supabase, not Orliqo's hosted SSR client. | Keep the pinned hosted client integration; re-check before upgrading Supabase packages or self-hosting. |
| [Supabase SSR auth](https://supabase.com/docs/guides/auth/server-side) and [Google login](https://supabase.com/docs/guides/auth/social-login/auth-google) | Cookie-based SSR uses PKCE and exchanges the returned code in an application callback. Redirects must be allow-listed. | Initiate Google through Supabase, exchange exactly once in `/auth/callback`, write the session cookies there, and restrict `next` to local paths. |
| [Supabase identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking) | Supabase automatically links verified identities with the same unique email. Manual linking is separate and opt-in. | Rely on verified-email automatic linking. Do not add a second user or workspace in application code on returning OAuth login. Do not enable manual linking without a separate threat review. |
| [Supabase sessions](https://supabase.com/docs/guides/auth/sessions) | Access tokens are short-lived; refresh tokens rotate and are single-use with a short reuse allowance for SSR. The default one-hour JWT lifetime is generally recommended. | Refresh in `proxy.ts`, validate with `auth.getUser()` on protected requests, clear the session on logout, and treat an invalid/expired session as a normal login redirect. |
| [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | Every exposed table needs RLS. `user_metadata` is user-editable and unsafe for authorization. Service keys must never reach the browser. Views need `security_invoker` or restricted grants. | Authorize through active `workspace_members`, keep privileged functions in `private`, filter by workspace in queries, and reserve the service-role client for audited server operations. |
| [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api) | Data API grants and RLS are separate controls. | Verify both grants and policies for every exposed table; keep private credential/rate-limit tables outside public access. |
| [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) | Single-factor passwords should be at least 15 characters, allow at least 64, permit paste/password managers, avoid composition rules, and reject common/compromised values. | Use a 15-character minimum for new passwords, a 128-character application limit, no forced uppercase/number/symbol rules, visible guidance, show/hide control, and a local common-password blocklist. Supabase remains the only password recipient/verifier. |
| [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) | Login and recovery responses should resist account enumeration; login attempts require throttling without creating an easy denial of service. | Return one invalid-credentials message, a uniform recovery acknowledgement, and distributed hashed-key limits for login/registration/recovery. |
| [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) | Reset tokens must be random, single-use, expiring, side-channel delivered, and rate limited; the reset page should prevent referrer leakage. | Use Supabase recovery tokens, generic request responses, rate limits, `no-referrer` on recovery pages, and do not change the account before token verification. |
| [OWASP OAuth 2.0 Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html) | PKCE, transaction-bound state/nonce, exact redirect handling, and no open redirectors mitigate code injection and login CSRF. | Keep Supabase PKCE, cookie-bound verifier/state handling, and `safeRedirectPath`; do not accept absolute `next` URLs. |
| [Google OAuth production guidance](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification) | Production and test OAuth projects should be separated; public apps need correct branding/verification. | Require a production Google project, verified Orliqo brand/support contact, minimal `openid email profile` scopes, and exact Supabase callback URLs before release. |
| [Next.js data security](https://nextjs.org/docs/app/guides/data-security) | Server Actions are public mutation boundaries: validate inputs and re-authorize near the data source. `NEXT_PUBLIC_` variables are browser-visible. | Every action re-checks the user, workspace, role, and object ownership. Secrets remain in server-only modules and unprefixed variables. |
| [Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy) | Nonce CSP requires a per-request nonce and dynamic rendering; the nonce must reach both request and response handling. | Retain the current proxy nonce model and verify production hydration. Do not restore a static CSP that blocks Next.js scripts. |
| [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) | Validate allow-listed types by content, limit size, rename stored files, authorize uploaders, and protect the route from CSRF. | Keep CSV/XLSX parsing bounded and authenticated, validate extension/signature/row count, never execute formulas/macros, and use generated storage paths. |
| [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) | Passwords, session identifiers, access tokens, connection strings, encryption keys, and sensitive personal data should not be logged directly. | Structured auth logs contain request ID, stage, provider, safe error class/code, and status only—never codes, cookies, tokens, email addresses, or secrets. |

## Configuration boundaries

- Core URL: application URL and allowed origins only.
- Supabase auth/data: Supabase URL plus publishable key.
- Distributed rate limiting: Supabase URL plus service-role key; fail closed in production.
- AI: only the selected provider and model.
- Billing: only Dodo mode, keys, webhooks, and the selected product IDs.
- Email/WhatsApp/integrations/jobs/observability: validate only when that feature starts or receives an event.

## Release checks

- Confirm hosted Auth redirect allow-list, email confirmation template, recovery URL, JWT lifetime, refresh-token reuse interval, Google provider, and automatic linking.
- Execute RLS/pgTAP tests against the release schema and run Supabase security advisors.
- Confirm the service-role key, provider client secrets, encryption key, database password, webhook secrets, and OAuth refresh tokens never appear in client bundles or logs.
- Verify CSP and all auth flows against a production build, including expired sessions and callback failure recovery.

