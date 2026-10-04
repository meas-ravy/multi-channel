import type { AutomationTrigger, Prisma } from "@/generated/prisma/client";
import { replyToComment, sendMessengerText } from "@/lib/meta/client";
import type { NormalizedWebhookEvent } from "@/lib/meta/webhook";
import { getPrisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/encryption";

function findMatchingRule<
  T extends { keyword: string; replyText: string },
>(text: string, rules: T[]): T | undefined {
  const normalizedText = text.toLocaleLowerCase();
  return rules.find((rule) => {
    const keyword = rule.keyword.trim().toLocaleLowerCase();
    return keyword.length > 0 && normalizedText.includes(keyword);
  });
}

async function processEvent(event: NormalizedWebhookEvent): Promise<void> {
  const prisma = getPrisma();
  const inserted = await prisma.webhookEvent.createMany({
    data: {
      eventKey: event.eventKey,
      metaPageId: event.metaPageId,
      eventType: event.type as AutomationTrigger,
      payload: event.payload as Prisma.InputJsonValue,
    },
    skipDuplicates: true,
  });

  if (inserted.count === 0) {
    return;
  }

  const webhookEvent = await prisma.webhookEvent.findUniqueOrThrow({
    where: { eventKey: event.eventKey },
  });

  try {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "PROCESSING" },
    });

    const page = await prisma.facebookPage.findUnique({
      where: { metaPageId: event.metaPageId },
      include: {
        automations: {
          where: { isActive: true, trigger: event.type },
          orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!page) {
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: "IGNORED",
          error: "Facebook Page is not connected",
          processedAt: new Date(),
        },
      });
      return;
    }

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { facebookPageId: page.id },
    });

    const rule = findMatchingRule(event.text, page.automations);

    if (!rule) {
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: "IGNORED", processedAt: new Date() },
      });
      return;
    }

    const pageAccessToken = decryptSecret(page.accessTokenEncrypted);

    if (event.type === "MESSAGE") {
      await sendMessengerText(
        page.metaPageId,
        event.senderId,
        rule.replyText,
        pageAccessToken,
      );
    } else {
      await replyToComment(event.commentId, rule.replyText, pageAccessToken);
    }

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        status: "FAILED",
        error: message.slice(0, 2000),
        processedAt: new Date(),
      },
    });
  }
}

export async function processWebhookEvents(
  events: NormalizedWebhookEvent[],
): Promise<void> {
  for (const event of events) {
    await processEvent(event);
  }
}
