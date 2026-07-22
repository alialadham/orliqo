import "server-only";

import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

import { normalizeUrl } from "@/features/leads/normalization";

const MAX_RESPONSE_BYTES = 1_000_000;
const blockedHostnames = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.aws.internal",
  "instance-data",
]);

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a = 0, b = 0, c = 0] = parts;
  return a === 0
    || a === 10
    || (a === 100 && b >= 64 && b <= 127)
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 192 && b === 88 && c === 99)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0] ?? "";
  const mappedIpv4 = normalized.match(/^(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return isPrivateIpv4(mappedIpv4);
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith("2001:db8:") || normalized.startsWith("2001:0:") || normalized.startsWith("2002:")) return true;

  const firstGroup = Number.parseInt(normalized.split(":")[0] ?? "", 16);
  return !Number.isInteger(firstGroup) || firstGroup < 0x2000 || firstGroup > 0x3fff;
}

export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  return version === 4 ? isPrivateIpv4(address) : version === 6 ? isPrivateIpv6(address) : true;
}

async function resolvePublicAddress(url: URL): Promise<{ address: string; family: 4 | 6 }> {
  const hostname = url.hostname.replace(/^\[(.*)\]$/, "$1");
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("Private network addresses are blocked.");
    return { address: hostname, family: isIP(hostname) as 4 | 6 };
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("The website resolves to a blocked network address.");
  }
  const selected = addresses[0];
  if (!selected || (selected.family !== 4 && selected.family !== 6)) throw new Error("The website address could not be resolved safely.");
  return { address: selected.address, family: selected.family };
}

export async function assertSafePublicUrl(input: string): Promise<URL> {
  const trimmed = input.trim();
  const rawUrl = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  if (rawUrl.username || rawUrl.password) throw new Error("Website URLs cannot include credentials.");
  const normalized = normalizeUrl(input);
  const url = new URL(normalized);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only public HTTP and HTTPS websites are allowed.");
  const hostname = url.hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1").replace(/\.$/, "");
  if (blockedHostnames.has(hostname) || hostname.endsWith(".local")) throw new Error("Private and local websites are blocked.");
  await resolvePublicAddress(url);
  return url;
}

async function requestPinned(url: URL): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  const target = await resolvePublicAddress(url);
  const request = url.protocol === "https:" ? httpsRequest : httpRequest;

  return new Promise((resolve, reject) => {
    const operation = request(url, {
      method: "GET",
      headers: { Host: url.host, "User-Agent": "OrliqoWebsiteImporter/1.0", Accept: "text/html,text/plain" },
      servername: url.hostname.replace(/^\[(.*)\]$/, "$1"),
      lookup: (_hostname, _options, callback) => callback(null, target.address, target.family),
    }, (response) => {
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_RESPONSE_BYTES) {
          operation.destroy(new Error("The website response is too large."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve({ status: response.statusCode ?? 0, headers: response.headers, body: Buffer.concat(chunks).toString("utf8") }));
    });
    operation.setTimeout(8_000, () => operation.destroy(new Error("The website request timed out.")));
    operation.on("error", reject);
    operation.end();
  });
}

export async function fetchPublicWebsite(input: string): Promise<{ url: string; text: string; retrievedAt: string }> {
  let url = await assertSafePublicUrl(input);
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const response = await requestPinned(url);
    if (response.status >= 300 && response.status < 400) {
      const locationHeader = response.headers.location;
      const location = Array.isArray(locationHeader) ? locationHeader[0] : locationHeader;
      if (!location || redirectCount === 3) throw new Error("The website redirected too many times.");
      url = await assertSafePublicUrl(new URL(location, url).toString());
      continue;
    }
    if (response.status < 200 || response.status >= 300) throw new Error(`Website returned HTTP ${response.status}.`);
    const contentTypeHeader = response.headers["content-type"];
    const contentType = (Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader)?.toLowerCase() ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) throw new Error("The website did not return readable public content.");
    const declaredLengthHeader = response.headers["content-length"];
    const declaredLength = Number(Array.isArray(declaredLengthHeader) ? declaredLengthHeader[0] : declaredLengthHeader ?? 0);
    if (declaredLength > MAX_RESPONSE_BYTES) throw new Error("The website response is too large.");
    const text = response.body
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40_000);
    return { url: url.toString(), text, retrievedAt: new Date().toISOString() };
  }
  throw new Error("Website import failed safely.");
}
