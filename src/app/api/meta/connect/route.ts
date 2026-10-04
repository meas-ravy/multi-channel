import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { buildMetaAuthorizationUrl } from "@/lib/meta/client";

export const runtime = "nodejs";

const OAUTH_STATE_COOKIE = "meta_oauth_state";

export async function GET(): Promise<NextResponse> {
  try {
    const state = randomBytes(32).toString("base64url");
    const response = NextResponse.redirect(buildMetaAuthorizationUrl(state));

    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/api/meta",
    });

    return response;
  } catch (error) {
    console.error("Unable to start Meta OAuth", error);
    return NextResponse.json(
      { error: "Meta OAuth is not configured" },
      { status: 500 },
    );
  }
}
