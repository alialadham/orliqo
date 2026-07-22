import { createHash } from "node:crypto";

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are allowed.");
  url.username = "";
  url.password = "";
  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
  url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  return url.toString().replace(/\/$/, "");
}

export function normalizeDomain(value: string): string {
  if (!value.trim()) return "";
  return new URL(normalizeUrl(value)).hostname;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string, defaultCountryCode = "962"): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `+${defaultCountryCode}${digits.slice(1)}`;
  return `+${digits}`;
}

export function normalizeSocialUrl(value: string): string {
  if (!value.trim()) return "";
  return normalizeUrl(value).replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
}

export function normalizeBusinessCity(businessName: string, city: string): string {
  return `${businessName} ${city}`.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function fingerprint(value: string): string {
  return value ? createHash("sha256").update(value).digest("hex") : "";
}

export type LeadIdentityInput = {
  businessName: string;
  city: string;
  websiteUrl?: string;
  email?: string;
  phone?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
};

export function leadFingerprints(input: LeadIdentityInput): Record<string, string> {
  return {
    domain: fingerprint(normalizeDomain(input.websiteUrl ?? "")),
    email: fingerprint(normalizeEmail(input.email ?? "")),
    phone: fingerprint(normalizePhone(input.phone ?? "")),
    businessCity: fingerprint(normalizeBusinessCity(input.businessName, input.city)),
    instagram: fingerprint(normalizeSocialUrl(input.instagramUrl ?? "")),
    facebook: fingerprint(normalizeSocialUrl(input.facebookUrl ?? "")),
    linkedin: fingerprint(normalizeSocialUrl(input.linkedinUrl ?? "")),
  };
}

export function normalizeSuppressionValue(type: "email" | "phone" | "domain" | "business" | "social_profile", value: string): string {
  if (type === "email") return normalizeEmail(value);
  if (type === "phone") return normalizePhone(value);
  if (type === "domain") return normalizeDomain(value);
  if (type === "social_profile") return normalizeSocialUrl(value);
  return value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
