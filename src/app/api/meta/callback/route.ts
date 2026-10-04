import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  exchangeCodeForUserToken,
  exchangeForLongLivedToken,
  META_USER_TOKEN_COOKIE,
} from "@/lib/meta/client";
import { encryptSecret } from "@/lib/security/encryption";

export const runtime = "nodejs";

const OAUTH_STATE_COOKIE = "meta_oauth_state";

function statesMatch(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function redirectWithStatus(
  request: NextRequest,
  status: "connected" | "error" | "select_pages",
  detail?: string,
): NextResponse {
  const url = new URL("/facebook", request.url);
  url.searchParams.set("status", status);

  if (detail) {
    url.searchParams.set("detail", detail);
  }

  const response = NextResponse.redirect(url);
  response.cookies.set(OAUTH_STATE_COOKIE, "", {
    maxAge: 0,
    path: "/api/meta",
  });
  return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (error) {
    return redirectWithStatus(request, "error", "authorization_denied");
  }

  if (!code || !state || !expectedState || !statesMatch(state, expectedState)) {
    return redirectWithStatus(request, "error", "invalid_oauth_state");
  }

  try {
    const shortLivedToken = await exchangeCodeForUserToken(code);
    const longLivedToken = await exchangeForLongLivedToken(
      shortLivedToken.access_token,
    );
    const response = redirectWithStatus(request, "select_pages");
    response.cookies.set(
      META_USER_TOKEN_COOKIE,
      encryptSecret(longLivedToken.access_token),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60,
        path: "/",
      },
    );
    return response;
  } catch (error) {
    console.error("Meta OAuth callback failed", error);
    return redirectWithStatus(request, "error", "connection_failed");
  }
}
