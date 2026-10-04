import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getManagedPages,
  META_USER_TOKEN_COOKIE,
  subscribePageToWebhooks,
} from "@/lib/meta/client";
import { getPrisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";

export const runtime = "nodejs";

function redirectWithStatus(
  request: NextRequest,
  status: "connected" | "error",
  detail: string,
): NextResponse {
  const url = new URL("/facebook", request.url);
  url.searchParams.set("status", status);
  url.searchParams.set("detail", detail);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const encryptedUserToken = request.cookies.get(META_USER_TOKEN_COOKIE)?.value;

  if (!encryptedUserToken) {
    return redirectWithStatus(request, "error", "connection_expired");
  }

  try {
    const formData = await request.formData();
    const selectedPageIds = new Set(
      formData
        .getAll("pageId")
        .filter((value): value is string => typeof value === "string"),
    );

    if (selectedPageIds.size === 0) {
      return redirectWithStatus(request, "error", "no_pages_selected");
    }

    const pages = await getManagedPages(decryptSecret(encryptedUserToken));
    const selectedPages = pages.filter((page) => selectedPageIds.has(page.id));

    if (selectedPages.length === 0) {
      return redirectWithStatus(request, "error", "no_pages_selected");
    }

    for (const page of selectedPages) {
      await subscribePageToWebhooks(page.id, page.access_token);
    }

    const prisma = getPrisma();
    await prisma.$transaction(
      selectedPages.map((page) => {
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

    const dashboardUrl = new URL("/dashboard", request.url);
    dashboardUrl.searchParams.set("connected", String(selectedPages.length));
    const response = NextResponse.redirect(dashboardUrl, 303);
    response.cookies.delete(META_USER_TOKEN_COOKIE);
    return response;
  } catch (error) {
    console.error("Unable to connect selected Facebook Pages", error);
    const response = redirectWithStatus(request, "error", "connection_failed");
    response.cookies.delete(META_USER_TOKEN_COOKIE);
    return response;
  }
}
