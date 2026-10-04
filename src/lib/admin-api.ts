import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { getAdminApiKey } from "@/lib/env";

export const ADMIN_SESSION_COOKIE = "chart_admin_session";

const SESSION_DURATION_SECONDS = 12 * 60 * 60;

function safeEqual(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function signature(value: string): string {
  return createHmac("sha256", getAdminApiKey())
    .update(value)
    .digest("base64url");
}

export function matchesAdminApiKey(received: string): boolean {
  try {
    return safeEqual(received, getAdminApiKey());
  } catch {
    return false;
  }
}

export function createAdminSessionToken(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const value = `${expiresAt}.${randomBytes(16).toString("base64url")}`;
  return `${value}.${signature(value)}`;
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  const [expiresAt, nonce, receivedSignature] = token.split(".");
  if (!expiresAt || !nonce || !receivedSignature) {
    return false;
  }

  const expiresAtNumber = Number(expiresAt);
  if (
    !Number.isSafeInteger(expiresAtNumber) ||
    expiresAtNumber <= Math.floor(Date.now() / 1000)
  ) {
    return false;
  }

  try {
    return safeEqual(receivedSignature, signature(`${expiresAt}.${nonce}`));
  } catch {
    return false;
  }
}

export function hasAdminApiAccess(request: Request): boolean {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }

  return matchesAdminApiKey(authorization.slice(7));
}
