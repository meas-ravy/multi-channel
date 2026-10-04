import { hasAdminApiAccess } from "@/lib/admin-api";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

type CreateAutomationBody = {
  metaPageId?: unknown;
  name?: unknown;
  trigger?: unknown;
  keyword?: unknown;
  replyText?: unknown;
  priority?: unknown;
};

function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function validateText(
  value: unknown,
  name: string,
  maximumLength: number,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} is required`);
  }

  const text = value.trim();
  if (text.length > maximumLength) {
    throw new Error(`${name} must be ${maximumLength} characters or fewer`);
  }

  return text;
}

export async function GET(request: Request): Promise<Response> {
  if (!hasAdminApiAccess(request)) {
    return unauthorized();
  }

  const url = new URL(request.url);
  const metaPageId = url.searchParams.get("metaPageId");
  const prisma = getPrisma();
  const automations = await prisma.automation.findMany({
    where: metaPageId ? { facebookPage: { metaPageId } } : undefined,
    select: {
      id: true,
      name: true,
      trigger: true,
      keyword: true,
      replyText: true,
      isActive: true,
      priority: true,
      createdAt: true,
      facebookPage: {
        select: { metaPageId: true, name: true },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  return Response.json({ data: automations });
}

export async function POST(request: Request): Promise<Response> {
  if (!hasAdminApiAccess(request)) {
    return unauthorized();
  }

  try {
    const body = (await request.json()) as CreateAutomationBody;
    const metaPageId = validateText(body.metaPageId, "metaPageId", 100);
    const name = validateText(body.name, "name", 100);
    const keyword = validateText(body.keyword, "keyword", 100);
    const replyText = validateText(body.replyText, "replyText", 2000);

    if (body.trigger !== "MESSAGE" && body.trigger !== "COMMENT") {
      throw new Error("trigger must be MESSAGE or COMMENT");
    }

    const priority = body.priority === undefined ? 0 : Number(body.priority);
    if (!Number.isInteger(priority) || priority < -1000 || priority > 1000) {
      throw new Error("priority must be an integer from -1000 to 1000");
    }

    const prisma = getPrisma();
    const page = await prisma.facebookPage.findUnique({
      where: { metaPageId },
      select: { id: true },
    });

    if (!page) {
      return Response.json(
        { error: "Facebook Page is not connected" },
        { status: 404 },
      );
    }

    const automation = await prisma.automation.create({
      data: {
        facebookPageId: page.id,
        name,
        trigger: body.trigger,
        keyword,
        replyText,
        priority,
      },
    });

    return Response.json({ data: automation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return Response.json({ error: message }, { status: 400 });
  }
}
