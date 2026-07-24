import "server-only";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function expectedOrigins(request: Request, appUrl?: string): Set<string> {
  const url = new URL(request.url);
  const origins = new Set([url.origin]);
  if (appUrl) origins.add(new URL(appUrl).origin);

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost && forwardedProto) {
    origins.add(`${forwardedProto}://${forwardedHost}`);
  }
  return origins;
}

export function isCsrfSafeRequest(request: Request, appUrl?: string): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return expectedOrigins(request, appUrl).has(new URL(origin).origin);
  } catch {
    return false;
  }
}

export function csrfErrorResponse(
  request: Request,
  appUrl?: string,
): Response | null {
  if (isCsrfSafeRequest(request, appUrl)) return null;
  return Response.json(
    { error: "The request origin could not be verified." },
    { status: 403 },
  );
}

export function bodyWithinLimit(request: Request, maxBytes: number): boolean {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return true;
  const bytes = Number(contentLength);
  return Number.isFinite(bytes) && bytes >= 0 && bytes <= maxBytes;
}
