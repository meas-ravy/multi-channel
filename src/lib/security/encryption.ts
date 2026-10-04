import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

import { getTokenEncryptionKey } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const VERSION = "v1";

function encryptionKey(): Buffer {
  const key = Buffer.from(getTokenEncryptionKey(), "base64");

  if (key.length !== 32) {
    throw new Error(
      "META_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
    );
  }

  return key;
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const [version, encodedIv, encodedAuthTag, encodedValue] =
    payload.split(".");

  if (
    version !== VERSION ||
    !encodedIv ||
    !encodedAuthTag ||
    !encodedValue
  ) {
    throw new Error("Unsupported encrypted secret format");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedAuthTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encodedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
