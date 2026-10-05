import type { PrismaClient } from "@/generated/prisma/client";
import {
  parseFlowDocument,
  type FlowDocument,
  type FlowEdge,
  type FlowNode,
} from "@/lib/automation/flow-types";
import { sendMessengerQuickReplies, sendMessengerText } from "@/lib/meta/client";
import type { NormalizedWebhookEvent } from "@/lib/meta/webhook";

const PAYLOAD_PREFIX = "chart_flow:";
const MAX_STEPS = 20;

function options(node: FlowNode): string[] {
  return node.data.options.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 13);
}

function outgoing(flow: FlowDocument, nodeId: string, handle?: string): FlowEdge | undefined {
  return flow.edges.find(
    (edge) => edge.source === nodeId && (!handle || edge.sourceHandle === handle),
  );
}

function firstOutgoing(flow: FlowDocument, nodeId: string): FlowEdge | undefined {
  return outgoing(flow, nodeId, "next") ??
    outgoing(flow, nodeId, "quickReplies") ??
    outgoing(flow, nodeId, "buttons") ??
    outgoing(flow, nodeId);
}

function payload(flowId: string, nodeId: string, optionIndex: number): string {
  return `${PAYLOAD_PREFIX}${flowId}:${nodeId}:${optionIndex}`;
}

function parsePayload(value: string | undefined): {
  flowId: string;
  nodeId: string;
  optionIndex: number;
} | null {
  if (!value?.startsWith(PAYLOAD_PREFIX)) return null;
  const [flowId, nodeId, rawIndex] = value.slice(PAYLOAD_PREFIX.length).split(":");
  const optionIndex = Number(rawIndex);
  return flowId && nodeId && Number.isInteger(optionIndex)
    ? { flowId, nodeId, optionIndex }
    : null;
}

async function executeFrom(
  prisma: PrismaClient,
  flowId: string,
  flow: FlowDocument,
  facebookPageId: string,
  metaPageId: string,
  senderId: string,
  pageAccessToken: string,
  firstNodeId: string,
): Promise<void> {
  const nodes = new Map(flow.nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  let nodeId: string | undefined = firstNodeId;

  for (let step = 0; nodeId && step < MAX_STEPS; step += 1) {
    if (visited.has(nodeId)) throw new Error("Published flow contains a cycle");
    visited.add(nodeId);
    const node = nodes.get(nodeId);
    if (!node) throw new Error(`Published flow node ${nodeId} was not found`);

    if (node.type === "start") {
      nodeId = firstOutgoing(flow, node.id)?.target;
      continue;
    }

    if (node.type === "ai") {
      throw new Error("AI flow nodes are not connected");
    }

    if (node.type === "quickReply") {
      const replies = options(node);
      if (replies.length === 0) throw new Error("Quick reply node has no options");
      await sendMessengerQuickReplies(
        metaPageId,
        senderId,
        node.data.content,
        replies.map((title, index) => ({ title, payload: payload(flowId, node.id, index) })),
        pageAccessToken,
      );
      await prisma.messengerSession.upsert({
        where: { facebookPageId_senderId: { facebookPageId, senderId } },
        create: { facebookPageId, senderId, waitingNodeId: node.id },
        update: { waitingNodeId: node.id },
      });
      return;
    }

    await sendMessengerText(metaPageId, senderId, node.data.content, pageAccessToken);
    nodeId = firstOutgoing(flow, node.id)?.target;
  }

  await prisma.messengerSession.upsert({
    where: { facebookPageId_senderId: { facebookPageId, senderId } },
    create: { facebookPageId, senderId, waitingNodeId: null },
    update: { waitingNodeId: null },
  });
}

export async function executeMessengerFlow(
  prisma: PrismaClient,
  event: Extract<NormalizedWebhookEvent, { type: "MESSAGE" }>,
  page: {
    id: string;
    metaPageId: string;
    messengerFlow: { id: string; published: unknown } | null;
  },
  pageAccessToken: string,
): Promise<boolean> {
  if (!page.messengerFlow?.published) return false;
  const flow = parseFlowDocument(page.messengerFlow.published);
  if (!flow) throw new Error("Published Messenger flow is invalid");

  const reply = parsePayload(event.quickReplyPayload);
  const session = await prisma.messengerSession.findUnique({
    where: { facebookPageId_senderId: { facebookPageId: page.id, senderId: event.senderId } },
  });

  let edge: FlowEdge | undefined;
  let selectionRecognized = false;
  if (reply && reply.flowId === page.messengerFlow.id && session?.waitingNodeId === reply.nodeId) {
    selectionRecognized = true;
    edge = outgoing(flow, reply.nodeId, `option:${reply.optionIndex}`) ?? outgoing(flow, reply.nodeId, "next");
  } else if (session?.waitingNodeId) {
    const waiting = flow.nodes.find((node) => node.id === session.waitingNodeId);
    const optionIndex = waiting ? options(waiting).findIndex(
      (option) => option.toLocaleLowerCase() === event.text.toLocaleLowerCase(),
    ) : -1;
    if (optionIndex >= 0) {
      selectionRecognized = true;
      edge = outgoing(flow, session.waitingNodeId, `option:${optionIndex}`) ?? outgoing(flow, session.waitingNodeId, "next");
    }
  }

  if (selectionRecognized && !edge) {
    await prisma.messengerSession.update({
      where: { facebookPageId_senderId: { facebookPageId: page.id, senderId: event.senderId } },
      data: { waitingNodeId: null },
    });
    return true;
  }

  if (!edge) {
    const start = flow.nodes.find((node) => node.type === "start");
    edge = start ? firstOutgoing(flow, start.id) : undefined;
  }
  if (!edge) throw new Error("Published Messenger flow has no executable start connection");

  await executeFrom(
    prisma,
    page.messengerFlow.id,
    flow,
    page.id,
    page.metaPageId,
    event.senderId,
    pageAccessToken,
    edge.target,
  );
  return true;
}
