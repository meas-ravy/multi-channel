import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  matchesAdminApiKey,
} from "@/lib/admin-api";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const formData = await request.formData();
  const key = formData.get("key");

  if (typeof key !== "string" || !matchesAdminApiKey(key)) {
    return NextResponse.redirect(
      new URL("/dashboard/login?error=invalid", request.url),
      303,
    );
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 12 * 60 * 60,
    path: "/",
  });

  return response;
}
