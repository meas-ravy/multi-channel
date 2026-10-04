import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  exchangeCodeForUserToken,
  exchangeForLongLivedToken,
  getManagedPages,
  subscribePageToWebhooks,
} from "@/lib/meta/client";
import { getPrisma } from "@/lib/prisma";
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
  status: "connected" | "error",
  detail?: string,
): NextResponse {
  const url = new URL("/facebook", request.url);
  url.searchParams.set("status", status);

  if (detail) {
    url.searchParams.set("detail", detail);
  }

  const response = NextResponse.redirect(url);
  response.cookies.delete(OAUTH_STATE_COOKIE);
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
    const prisma = getPrisma();
    const shortLivedToken = await exchangeCodeForUserToken(code);
    const longLivedToken = await exchangeForLongLivedToken(
      shortLivedToken.access_token,
    );
    const pages = await getManagedPages(longLivedToken.access_token);

    if (pages.length === 0) {
      return redirectWithStatus(request, "error", "no_pages_selected");
    }

    for (const page of pages) {
      await subscribePageToWebhooks(page.id, page.access_token);
    }

    await prisma.$transaction(
      pages.map((page) => {
        const data = {
          name: page.name,
          accessTokenEncrypted: encryptSecret(page.access_token),
          tasks: page.tasks ?? [],
          connectedAt: new Date(),
        };

        return prisma.facebookPage.upsert({
          where: { metaPageId: page.id },
          create: { metaPageId: page.id, ...data },
          update: data,
        });
      }),
    );

    return redirectWithStatus(request, "connected", String(pages.length));
  } catch (error) {
    console.error("Meta OAuth callback failed", error);
    return redirectWithStatus(request, "error", "connection_failed");
  }
}
