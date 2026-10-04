"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/admin-session";
import { getPrisma } from "@/lib/prisma";

function text(formData: FormData, name: string, maximumLength: number): string {
  const value = formData.get(name);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} is required`);
  }

  const normalized = value.trim();
  if (normalized.length > maximumLength) {
    throw new Error(`${name} must be ${maximumLength} characters or fewer`);
  }

  return normalized;
}

function trigger(formData: FormData): "MESSAGE" | "COMMENT" {
  const value = formData.get("trigger");
  if (value !== "MESSAGE" && value !== "COMMENT") {
    throw new Error("trigger must be MESSAGE or COMMENT");
  }
  return value;
}

function priority(formData: FormData): number {
  const value = Number(formData.get("priority") ?? 0);
  if (!Number.isInteger(value) || value < -1000 || value > 1000) {
    throw new Error("priority must be an integer from -1000 to 1000");
  }
  return value;
}

export async function createAutomation(formData: FormData): Promise<void> {
  await requireAdminSession();

  const prisma = getPrisma();
  const facebookPageId = text(formData, "facebookPageId", 100);
  const page = await prisma.facebookPage.findUnique({
    where: { id: facebookPageId },
    select: { id: true },
  });

  if (!page) {
    throw new Error("Facebook Page is not connected");
  }

  await prisma.automation.create({
    data: {
      facebookPageId: page.id,
      name: text(formData, "name", 100),
      trigger: trigger(formData),
      keyword: text(formData, "keyword", 100),
      replyText: text(formData, "replyText", 2000),
      priority: priority(formData),
    },
  });

  revalidatePath("/dashboard");
}

export async function updateAutomation(
  automationId: string,
  formData: FormData,
): Promise<void> {
  await requireAdminSession();

  const prisma = getPrisma();
  await prisma.automation.update({
    where: { id: automationId },
    data: {
      name: text(formData, "name", 100),
      trigger: trigger(formData),
      keyword: text(formData, "keyword", 100),
      replyText: text(formData, "replyText", 2000),
      priority: priority(formData),
    },
  });

  revalidatePath("/dashboard");
}

export async function toggleAutomation(automationId: string): Promise<void> {
  await requireAdminSession();

  const prisma = getPrisma();
  const automation = await prisma.automation.findUniqueOrThrow({
    where: { id: automationId },
    select: { isActive: true },
  });

  await prisma.automation.update({
    where: { id: automationId },
    data: { isActive: !automation.isActive },
  });

  revalidatePath("/dashboard");
}
