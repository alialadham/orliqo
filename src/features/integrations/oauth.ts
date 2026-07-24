import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { hashOAuthState } from "./crypto";

export type OAuthProvider = "gmail" | "outlook" | "google_calendar";

export type OAuthRequest = {
  authorizationUrl: string;
  state: string;
  hashedState: string;
  codeVerifier: string;
  codeChallenge: string;
  expiresAt: string;
};

const SCOPES = {
  gmail: [
    "openid",
    "email",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
  ],
  outlook: ["openid", "email", "offline_access", "Mail.Send", "Mail.Read"],
  google_calendar: [
    "openid",
    "email",
    "https://www.googleapis.com/auth/calendar.events.owned",
  ],
} as const;

export function createOAuthRequest(input: {
  provider: OAuthProvider;
  clientId: string;
  redirectUri: string;
  tenantId?: string;
}): OAuthRequest {
  if (!input.clientId || !input.redirectUri)
    throw new Error("OAuth client ID and redirect URI are required.");
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(48).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  const url =
    input.provider === "gmail" || input.provider === "google_calendar"
      ? new URL("https://accounts.google.com/o/oauth2/v2/auth")
      : new URL(
          `https://login.microsoftonline.com/${encodeURIComponent(input.tenantId ?? "common")}/oauth2/v2.0/authorize`,
        );
  const scopes = [...SCOPES[input.provider]];
  url.search = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    ...(input.provider === "gmail" || input.provider === "google_calendar"
      ? { access_type: "offline", prompt: "consent" }
      : {}),
  }).toString();
  return {
    authorizationUrl: url.toString(),
    state,
    hashedState: hashOAuthState(state),
    codeVerifier,
    codeChallenge,
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  };
}

export function allowlistedOAuthRedirect(path: string): boolean {
  return (
    /^\/(app|onboarding)(\/|$)/.test(path) &&
    !path.startsWith("//") &&
    !path.includes("\\")
  );
}
