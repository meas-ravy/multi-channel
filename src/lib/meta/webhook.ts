import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getMetaConfig } from "@/lib/env";

type MessengerEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    quick_reply?: { payload?: string };
  };
};

type FeedChange = {
  field?: string;
  value?: {
    item?: string;
    verb?: string;
    comment_id?: string;
    message?: string;
    sender_id?: string;
    from?: { id?: string };
  };
};

type WebhookEntry = {
  id?: string;
  messaging?: MessengerEvent[];
  changes?: FeedChange[];
};

type WebhookPayload = {
  object?: string;
  entry?: WebhookEntry[];
};

type BaseEvent = {
  eventKey: string;
  metaPageId: string;
  senderId: string;
  text: string;
  payload: Record<string, unknown>;
};

export type NormalizedWebhookEvent =
  | (BaseEvent & {
      type: "MESSAGE";
      recipientId: string;
      quickReplyPayload?: string;
    })
  | (BaseEvent & {
      type: "COMMENT";
      commentId: string;
    });

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature?.startsWith("sha256=")) {
    return false;
  }

  const received = Buffer.from(signature.slice(7), "hex");
  const expected = createHmac("sha256", getMetaConfig().appSecret)
    .update(rawBody)
    .digest();

  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function normalizeWebhookPayload(
  payload: WebhookPayload,
): NormalizedWebhookEvent[] {
  if (payload.object !== "page" || !Array.isArray(payload.entry)) {
    return [];
  }

  const events: NormalizedWebhookEvent[] = [];

  for (const entry of payload.entry) {
    const metaPageId = entry.id;

    if (!metaPageId) {
      continue;
    }

    for (const messaging of entry.messaging ?? []) {
      const senderId = messaging.sender?.id;
      const recipientId = messaging.recipient?.id;
      const text = messaging.message?.text?.trim();

      if (
        !senderId ||
        !recipientId ||
        !text ||
        messaging.message?.is_echo ||
        senderId === metaPageId
      ) {
        continue;
      }

      events.push({
        type: "MESSAGE",
        eventKey: `message:${metaPageId}:${messaging.message?.mid ?? hash(messaging)}`,
        metaPageId,
        senderId,
        recipientId,
        quickReplyPayload: messaging.message?.quick_reply?.payload,
        text,
        payload: messaging as Record<string, unknown>,
      });
    }

    for (const change of entry.changes ?? []) {
      const value = change.value;
      const senderId = value?.sender_id ?? value?.from?.id;
      const commentId = value?.comment_id;
      const text = value?.message?.trim();

      if (
        change.field !== "feed" ||
        value?.item !== "comment" ||
        value.verb !== "add" ||
        !senderId ||
        !commentId ||
        !text ||
        senderId === metaPageId
      ) {
        continue;
      }

      events.push({
        type: "COMMENT",
        eventKey: `comment:${metaPageId}:${commentId}`,
        metaPageId,
        senderId,
        commentId,
        text,
        payload: change as Record<string, unknown>,
      });
    }
  }

  return events;
}
