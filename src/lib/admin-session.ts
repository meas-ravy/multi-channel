import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-api";

export async function hasAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function requireAdminSession(): Promise<void> {
  if (!(await hasAdminSession())) {
    redirect("/dashboard/login");
  }
}
