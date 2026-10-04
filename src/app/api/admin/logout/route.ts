import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/lib/admin-api";

export async function POST(request: Request): Promise<NextResponse> {
  const response = NextResponse.redirect(
    new URL("/dashboard/login", request.url),
    303,
  );
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
