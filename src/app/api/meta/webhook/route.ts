import { after } from "next/server";

import { getWebhookVerifyToken } from "@/lib/env";
import { processWebhookEvents } from "@/lib/automation/processor";
import {
  normalizeWebhookPayload,
  verifyWebhookSignature,
} from "@/lib/meta/webhook";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  try {
    if (
      mode === "subscribe" &&
      token === getWebhookVerifyToken() &&
      challenge
    ) {
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
  } catch (error) {
    console.error("Webhook verification is not configured", error);
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();

  try {
    if (
      !verifyWebhookSignature(
        rawBody,
        request.headers.get("x-hub-signature-256"),
      )
    ) {
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(rawBody) as Parameters<
      typeof normalizeWebhookPayload
    >[0];
    const events = normalizeWebhookPayload(payload);

    after(async () => {
      await processWebhookEvents(events);
    });

    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("Unable to accept Meta webhook", error);
    return new Response("Invalid webhook payload", { status: 400 });
  }
}
