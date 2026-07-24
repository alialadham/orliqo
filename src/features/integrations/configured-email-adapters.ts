import "server-only";

import { createHash, createHmac, randomUUID } from "node:crypto";

import { fetchWithTimeout } from "@/lib/http";
import type { EmailDraft } from "./schemas";
import type {
  EmailOperationResult,
  EmailProviderAdapter,
  EmailSyncResult,
  SyncedInboundEmail,
} from "./email-adapters";
import type { ProviderHealth, ProviderMode } from "./types";

type Fetcher = typeof fetch;
type TokenUpdate = (tokens: {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}) => Promise<void>;

type OAuthAdapterConfiguration = {
  mode: Exclude<ProviderMode, "demo">;
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  fetcher?: Fetcher;
  onTokenUpdate?: TokenUpdate;
};

function gmailHeader(
  headers: Array<{ name?: string; value?: string }> | undefined,
  name: string,
): string {
  return (
    headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())
      ?.value ?? ""
  );
}

function emailAddress(value: string): string {
  return value.match(/<([^>]+)>/)?.[1] ?? value.trim();
}

function gmailBody(payload: {
  mimeType?: string;
  body?: { data?: string };
  parts?: Array<{
    mimeType?: string;
    body?: { data?: string };
    parts?: unknown[];
  }>;
}): string {
  const encoded =
    payload.mimeType === "text/plain"
      ? payload.body?.data
      : payload.parts?.find((part) => part.mimeType === "text/plain")?.body
          ?.data;
  if (!encoded) return "";
  try {
    return Buffer.from(encoded, "base64url").toString("utf8").trim();
  } catch {
    return "";
  }
}

function health(
  ok: boolean,
  mode: ProviderMode,
  errorCode?: string,
  retryable = false,
): ProviderHealth {
  return {
    ok,
    mode,
    checkedAt: new Date().toISOString(),
    ...(errorCode ? { errorCode, retryable } : {}),
  };
}

export function buildMimeMessage(draft: EmailDraft): string {
  const signature = draft.signature ? `\r\n\r\n${draft.signature}` : "";
  const boundary = `orliqo-${randomUUID()}`;
  const headers = [
    `From: ${draft.from}`,
    `To: ${draft.to}`,
    `Subject: ${draft.subject.replace(/[\r\n]/g, " ")}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary=\"${boundary}\"`,
    ...(draft.threadId
      ? [`References: ${draft.threadId}`, `In-Reply-To: ${draft.threadId}`]
      : []),
  ];
  return `${headers.join("\r\n")}\r\n\r\n--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${draft.text}${signature}\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${draft.html}${signature ? `<br><br>${draft.signature}` : ""}\r\n--${boundary}--`;
}

function providerFailure(
  mode: ProviderMode,
  requestId: string,
  status: number,
  message: string,
): EmailOperationResult {
  return {
    ok: false,
    mode,
    requestId,
    error: {
      code:
        status === 401 || status === 403
          ? "unauthorized"
          : status === 429
            ? "quota"
            : "provider_unavailable",
      message,
      retryable: status === 429 || status >= 500,
    },
  };
}

export function createGmailAdapter(
  configuration: OAuthAdapterConfiguration,
): EmailProviderAdapter {
  const fetcher = configuration.fetcher ?? fetch;
  const api = "https://gmail.googleapis.com/gmail/v1/users/me";
  const authorized = (url: string, init?: RequestInit) =>
    fetchWithTimeout(
      fetcher,
      url,
      {
        ...init,
        headers: {
          authorization: `Bearer ${configuration.accessToken}`,
          "content-type": "application/json",
          ...init?.headers,
        },
        cache: "no-store",
      },
      15_000,
    );
  return {
    provider: "gmail",
    mode: configuration.mode,
    async send(draft) {
      const requestId = randomUUID();
      const response = await authorized(`${api}/messages/send`, {
        method: "POST",
        body: JSON.stringify({
          raw: Buffer.from(buildMimeMessage(draft), "utf8").toString(
            "base64url",
          ),
          ...(draft.threadId ? { threadId: draft.threadId } : {}),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        id?: string;
        threadId?: string;
        error?: { message?: string };
      } | null;
      if (!response.ok || !data?.id)
        return providerFailure(
          configuration.mode,
          requestId,
          response.status,
          data?.error?.message ?? "Gmail send failed.",
        );
      return {
        ok: true,
        delivered: true,
        providerMessageId: data.id,
        threadId: data.threadId ?? draft.threadId,
        requestId,
        mode: configuration.mode,
      };
    },
    async test() {
      const response = await authorized(`${api}/profile`);
      return health(
        response.ok,
        configuration.mode,
        response.ok ? undefined : "provider_unavailable",
        response.status >= 500,
      );
    },
    async sync(cursor) {
      const response = await authorized(
        `${api}/messages?maxResults=25${cursor ? `&pageToken=${encodeURIComponent(cursor)}` : ""}`,
      );
      const data = (await response.json().catch(() => null)) as {
        messages?: Array<{ id?: string; threadId?: string }>;
        nextPageToken?: string;
      } | null;
      const messages: SyncedInboundEmail[] = [];
      if (response.ok)
        for (const summary of data?.messages ?? []) {
          if (!summary.id) continue;
          const detailResponse = await authorized(
            `${api}/messages/${encodeURIComponent(summary.id)}?format=full`,
          );
          const detail = (await detailResponse.json().catch(() => null)) as {
            id?: string;
            threadId?: string;
            internalDate?: string;
            labelIds?: string[];
            payload?: {
              mimeType?: string;
              headers?: Array<{ name?: string; value?: string }>;
              body?: { data?: string };
              parts?: Array<{
                mimeType?: string;
                body?: { data?: string };
                parts?: unknown[];
              }>;
            };
          } | null;
          if (
            !detailResponse.ok ||
            !detail?.id ||
            detail.labelIds?.includes("SENT") ||
            !detail.payload
          )
            continue;
          const body = gmailBody(detail.payload);
          const from = gmailHeader(detail.payload.headers, "from");
          if (!body || !from) continue;
          messages.push({
            providerMessageId: detail.id,
            providerThreadId: detail.threadId ?? detail.id,
            senderAddress: emailAddress(from),
            recipientAddress:
              emailAddress(gmailHeader(detail.payload.headers, "to")) ||
              undefined,
            subject:
              gmailHeader(detail.payload.headers, "subject") || undefined,
            body,
            occurredAt: detail.internalDate
              ? new Date(Number(detail.internalDate)).toISOString()
              : new Date().toISOString(),
          });
        }
      return response.ok
        ? {
            ok: true,
            cursor: data?.nextPageToken ?? cursor ?? "complete",
            received: messages.length,
            messages,
            mode: configuration.mode,
          }
        : {
            ok: false,
            error: {
              code: "provider_unavailable",
              message: "Gmail sync failed.",
              retryable: response.status >= 500,
            },
            mode: configuration.mode,
          };
    },
    async refresh() {
      const response = await fetchWithTimeout(fetcher, "https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: configuration.clientId,
          client_secret: configuration.clientSecret,
          refresh_token: configuration.refreshToken,
          grant_type: "refresh_token",
        }),
        cache: "no-store",
      }, 10_000);
      const data = (await response.json().catch(() => null)) as {
        access_token?: string;
        expires_in?: number;
      } | null;
      if (response.ok && data?.access_token && configuration.onTokenUpdate)
        await configuration.onTokenUpdate({
          accessToken: data.access_token,
          expiresIn: data.expires_in,
        });
      return health(
        response.ok && Boolean(data?.access_token),
        configuration.mode,
        response.ok ? undefined : "token_refresh_failed",
        response.status >= 500,
      );
    },
    async disconnect() {
      const response = await fetchWithTimeout(
        fetcher,
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(configuration.refreshToken)}`,
        {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          cache: "no-store",
        },
        10_000,
      );
      return { ok: true, revoked: response.ok };
    },
    async health() {
      return this.test();
    },
  };
}

export function createOutlookAdapter(
  configuration: OAuthAdapterConfiguration & { tenantId?: string },
): EmailProviderAdapter {
  const fetcher = configuration.fetcher ?? fetch;
  const api = "https://graph.microsoft.com/v1.0/me";
  const authorized = (url: string, init?: RequestInit) =>
    fetchWithTimeout(
      fetcher,
      url,
      {
        ...init,
        headers: {
          authorization: `Bearer ${configuration.accessToken}`,
          "content-type": "application/json",
          ...init?.headers,
        },
        cache: "no-store",
      },
      15_000,
    );
  return {
    provider: "outlook",
    mode: configuration.mode,
    async send(draft) {
      const requestId = randomUUID();
      const create = await authorized(`${api}/messages`, {
        method: "POST",
        body: JSON.stringify({
          subject: draft.subject,
          body: {
            contentType: "HTML",
            content: `${draft.html}${draft.signature ? `<br><br>${draft.signature}` : ""}`,
          },
          toRecipients: [{ emailAddress: { address: draft.to } }],
          internetMessageHeaders: [
            { name: "X-Orliqo-Idempotency-Key", value: draft.idempotencyKey },
          ],
        }),
      });
      const data = (await create.json().catch(() => null)) as {
        id?: string;
        conversationId?: string;
        error?: { message?: string };
      } | null;
      if (!create.ok || !data?.id)
        return providerFailure(
          configuration.mode,
          requestId,
          create.status,
          data?.error?.message ?? "Microsoft Graph draft creation failed.",
        );
      const sent = await authorized(
        `${api}/messages/${encodeURIComponent(data.id)}/send`,
        { method: "POST" },
      );
      if (!sent.ok)
        return providerFailure(
          configuration.mode,
          requestId,
          sent.status,
          "Microsoft Graph send failed.",
        );
      return {
        ok: true,
        delivered: true,
        providerMessageId: data.id,
        threadId: data.conversationId ?? draft.threadId,
        requestId,
        mode: configuration.mode,
      };
    },
    async test() {
      const response = await authorized(
        `${api}?$select=id,mail,userPrincipalName`,
      );
      return health(
        response.ok,
        configuration.mode,
        response.ok ? undefined : "provider_unavailable",
        response.status >= 500,
      );
    },
    async sync(cursor) {
      const url =
        cursor ||
        `${api}/mailFolders/inbox/messages/delta?$select=id,conversationId,receivedDateTime,from,toRecipients,subject,body,bodyPreview&$top=25`;
      const response = await authorized(url);
      const data = (await response.json().catch(() => null)) as {
        value?: Array<{
          id?: string;
          conversationId?: string;
          receivedDateTime?: string;
          from?: { emailAddress?: { address?: string; name?: string } };
          toRecipients?: Array<{
            emailAddress?: { address?: string; name?: string };
          }>;
          subject?: string;
          body?: { content?: string };
          bodyPreview?: string;
        }>;
        "@odata.deltaLink"?: string;
        "@odata.nextLink"?: string;
      } | null;
      const messages: SyncedInboundEmail[] = (data?.value ?? []).flatMap(
        (message): SyncedInboundEmail[] => {
          const senderAddress = message.from?.emailAddress?.address;
          const body = message.body?.content ?? message.bodyPreview;
          if (!message.id || !senderAddress || !body) return [];
          return [
            {
              providerMessageId: message.id,
              providerThreadId: message.conversationId ?? message.id,
              senderAddress,
              senderName: message.from?.emailAddress?.name,
              recipientAddress:
                message.toRecipients?.[0]?.emailAddress?.address,
              subject: message.subject,
              body,
              occurredAt: message.receivedDateTime ?? new Date().toISOString(),
            },
          ];
        },
      );
      return response.ok
        ? {
            ok: true,
            cursor:
              data?.["@odata.nextLink"] ?? data?.["@odata.deltaLink"] ?? url,
            received: messages.length,
            messages,
            mode: configuration.mode,
          }
        : {
            ok: false,
            error: {
              code: "provider_unavailable",
              message: "Microsoft Graph sync failed.",
              retryable: response.status >= 500,
            },
            mode: configuration.mode,
          };
    },
    async refresh() {
      const response = await fetchWithTimeout(
        fetcher,
        `https://login.microsoftonline.com/${encodeURIComponent(configuration.tenantId ?? "common")}/oauth2/v2.0/token`,
        {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: configuration.clientId,
            client_secret: configuration.clientSecret,
            refresh_token: configuration.refreshToken,
            grant_type: "refresh_token",
            scope: "openid email offline_access Mail.Send Mail.Read",
          }),
          cache: "no-store",
        },
        10_000,
      );
      const data = (await response.json().catch(() => null)) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      } | null;
      if (response.ok && data?.access_token && configuration.onTokenUpdate)
        await configuration.onTokenUpdate({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
        });
      return health(
        response.ok && Boolean(data?.access_token),
        configuration.mode,
        response.ok ? undefined : "token_refresh_failed",
        response.status >= 500,
      );
    },
    async disconnect() {
      return { ok: true, revoked: false };
    },
    async health() {
      return this.test();
    },
  };
}

export function createResendAdapter(configuration: {
  mode: Exclude<ProviderMode, "demo">;
  apiKey: string;
  fetcher?: Fetcher;
}): EmailProviderAdapter {
  const fetcher = configuration.fetcher ?? fetch;
  const headers = {
    authorization: `Bearer ${configuration.apiKey}`,
    "content-type": "application/json",
  };
  return {
    provider: "resend",
    mode: configuration.mode,
    async send(draft) {
      const requestId = randomUUID();
      const response = await fetchWithTimeout(fetcher, "https://api.resend.com/emails", {
        method: "POST",
        headers: { ...headers, "Idempotency-Key": draft.idempotencyKey },
        body: JSON.stringify({
          from: draft.from,
          to: [draft.to],
          subject: draft.subject,
          html: draft.html,
          text: draft.text,
          ...(draft.threadId
            ? {
                headers: {
                  "In-Reply-To": draft.threadId,
                  References: draft.threadId,
                },
              }
            : {}),
        }),
        cache: "no-store",
      }, 15_000);
      const data = (await response.json().catch(() => null)) as {
        id?: string;
        message?: string;
      } | null;
      if (!response.ok || !data?.id)
        return providerFailure(
          configuration.mode,
          requestId,
          response.status,
          data?.message ?? "Resend delivery failed.",
        );
      return {
        ok: true,
        delivered: true,
        providerMessageId: data.id,
        threadId: draft.threadId,
        requestId,
        mode: configuration.mode,
      };
    },
    async test() {
      const response = await fetchWithTimeout(fetcher, "https://api.resend.com/domains", {
        headers,
        cache: "no-store",
      }, 10_000);
      return health(
        response.ok,
        configuration.mode,
        response.ok ? undefined : "provider_unavailable",
        response.status >= 500,
      );
    },
    async sync(): Promise<EmailSyncResult> {
      return {
        ok: true,
        cursor: "webhook_only",
        received: 0,
        mode: configuration.mode,
      };
    },
    async refresh() {
      return this.test();
    },
    async disconnect() {
      return { ok: true, revoked: false };
    },
    async health() {
      return this.test();
    },
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}
function awsTimestamp(date: Date): { amzDate: string; dateStamp: string } {
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

export function createSesAdapter(configuration: {
  mode: Exclude<ProviderMode, "demo">;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  fetcher?: Fetcher;
}): EmailProviderAdapter {
  const fetcher = configuration.fetcher ?? fetch;
  const host = `email.${configuration.region}.amazonaws.com`;
  const sign = (method: string, path: string, body: string) => {
    const { amzDate, dateStamp } = awsTimestamp(new Date());
    const tokenHeader = configuration.sessionToken
      ? `x-amz-security-token:${configuration.sessionToken}\n`
      : "";
    const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n${tokenHeader}`;
    const signedHeaders = `content-type;host;x-amz-date${configuration.sessionToken ? ";x-amz-security-token" : ""}`;
    const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256(body)}`;
    const scope = `${dateStamp}/${configuration.region}/ses/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256(canonicalRequest)}`;
    const dateKey = hmac(`AWS4${configuration.secretAccessKey}`, dateStamp);
    const regionKey = hmac(dateKey, configuration.region);
    const serviceKey = hmac(regionKey, "ses");
    const signingKey = hmac(serviceKey, "aws4_request");
    const signature = createHmac("sha256", signingKey)
      .update(stringToSign, "utf8")
      .digest("hex");
    return {
      "content-type": "application/json",
      host,
      "x-amz-date": amzDate,
      ...(configuration.sessionToken
        ? { "x-amz-security-token": configuration.sessionToken }
        : {}),
      authorization: `AWS4-HMAC-SHA256 Credential=${configuration.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    };
  };
  const request = (method: string, path: string, body = "") =>
    fetchWithTimeout(
      fetcher,
      `https://${host}${path}`,
      {
        method,
        headers: sign(method, path, body),
        ...(body ? { body } : {}),
        cache: "no-store",
      },
      15_000,
    );
  return {
    provider: "ses",
    mode: configuration.mode,
    async send(draft) {
      const requestId = randomUUID();
      const body = JSON.stringify({
        FromEmailAddress: draft.from,
        Destination: { ToAddresses: [draft.to] },
        Content: {
          Simple: {
            Subject: { Data: draft.subject, Charset: "UTF-8" },
            Body: {
              Text: { Data: draft.text, Charset: "UTF-8" },
              Html: { Data: draft.html, Charset: "UTF-8" },
            },
          },
        },
      });
      const response = await request("POST", "/v2/email/outbound-emails", body);
      const data = (await response.json().catch(() => null)) as {
        MessageId?: string;
        message?: string;
      } | null;
      if (!response.ok || !data?.MessageId)
        return providerFailure(
          configuration.mode,
          requestId,
          response.status,
          data?.message ?? "Amazon SES delivery failed.",
        );
      return {
        ok: true,
        delivered: true,
        providerMessageId: data.MessageId,
        threadId: draft.threadId,
        requestId,
        mode: configuration.mode,
      };
    },
    async test() {
      const response = await request("GET", "/v2/email/account");
      return health(
        response.ok,
        configuration.mode,
        response.ok ? undefined : "provider_unavailable",
        response.status >= 500,
      );
    },
    async sync(): Promise<EmailSyncResult> {
      return {
        ok: true,
        cursor: "webhook_only",
        received: 0,
        mode: configuration.mode,
      };
    },
    async refresh() {
      return this.test();
    },
    async disconnect() {
      return { ok: true, revoked: false };
    },
    async health() {
      return this.test();
    },
  };
}
