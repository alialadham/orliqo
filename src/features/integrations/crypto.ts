import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function encryptionKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

export type EncryptedCredential = {
  ciphertext: string;
  nonce: string;
  authTag: string;
  keyVersion: number;
};

export function encryptCredential(
  payload: Record<string, unknown>,
  secret: string,
  keyVersion: number,
): EncryptedCredential {
  if (secret.length < 32)
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY must contain at least 32 characters.",
    );
  const nonce = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(secret), nonce);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64url"),
    nonce: nonce.toString("base64url"),
    authTag: cipher.getAuthTag().toString("base64url"),
    keyVersion,
  };
}

export function decryptCredential<T>(
  value: EncryptedCredential,
  secret: string,
): T {
  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(secret),
    Buffer.from(value.nonce, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(value.authTag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as T;
}

export function hashOAuthState(state: string): string {
  return createHash("sha256").update(state, "utf8").digest("base64url");
}

export function stateMatches(candidate: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashOAuthState(candidate));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
