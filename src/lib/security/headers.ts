export function buildContentSecurityPolicy(
  nonce: string,
  production: boolean,
): string {
  const nonceSource = `'nonce-${nonce}'`;
  const inlineStyleHashes = [
    // Sonner 2.0.7 inserts an empty style element, then its pinned static CSS.
    "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
    "'sha256-CIxDM5jnsGiKqXs2v7NKCY5MzdR9gu6TtiMJrDw29AY='",
  ].join(" ");
  const directives = [
    "default-src 'self'",
    `script-src 'self' ${nonceSource} 'strict-dynamic'${production ? "" : " 'unsafe-eval'"}`,
    "script-src-attr 'none'",
    production
      ? `style-src 'self' ${nonceSource}`
      : "style-src 'self' 'unsafe-inline'",
    production
      ? `style-src-elem 'self' ${nonceSource} ${inlineStyleHashes}`
      : "style-src-elem 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.posthog.com https://*.sentry.io",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];
  if (production) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export const SECURITY_HEADERS = [
  ["Cross-Origin-Opener-Policy", "same-origin"],
  ["Cross-Origin-Resource-Policy", "same-origin"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "DENY"],
  [
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self), usb=()",
  ],
] as const;

export function applySecurityHeaders(
  headers: Headers,
  csp: string,
  production: boolean,
): void {
  headers.set("Content-Security-Policy", csp);
  for (const [name, value] of SECURITY_HEADERS) headers.set(name, value);
  if (production) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
}
