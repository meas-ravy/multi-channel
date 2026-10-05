"use server";

import type { Prisma } from "@/generated/prisma/client";
import {
  parseFlowDocument,
  type FlowDocument,
  validatePublishedFlow,
} from "@/lib/automation/flow-types";
import { getPrisma } from "@/lib/prisma";

async function connectedPage(pageId: string): Promise<string> {
  const page = await getPrisma().facebookPage.findUnique({
    where: { id: pageId },
    select: { id: true },
  });
  if (!page) throw new Error("Facebook Page is not connected");
  return page.id;
}

function validatedFlow(value: unknown): FlowDocument {
  const flow = parseFlowDocument(value);
  if (!flow) throw new Error("The flow contains invalid nodes or connections");
  if (flow.nodes.length > 100 || flow.edges.length > 200) {
    throw new Error("Flow is too large");
  }
  return flow;
}

export async function saveFlow(pageId: string, value: unknown): Promise<void> {
  const facebookPageId = await connectedPage(pageId);
  const flow = validatedFlow(value);
  await getPrisma().messengerFlow.upsert({
    where: { facebookPageId },
    create: {
      facebookPageId,
      draft: flow as unknown as Prisma.InputJsonValue,
    },
    update: { draft: flow as unknown as Prisma.InputJsonValue },
  });
}

export async function publishFlow(pageId: string, value: unknown): Promise<void> {
  const facebookPageId = await connectedPage(pageId);
  const flow = validatedFlow(value);
  validatePublishedFlow(flow);
  await getPrisma().messengerFlow.upsert({
    where: { facebookPageId },
    create: {
      facebookPageId,
      draft: flow as unknown as Prisma.InputJsonValue,
      published: flow as unknown as Prisma.InputJsonValue,
      publishedAt: new Date(),
    },
    update: {
      draft: flow as unknown as Prisma.InputJsonValue,
      published: flow as unknown as Prisma.InputJsonValue,
      publishedAt: new Date(),
    },
  });
}
