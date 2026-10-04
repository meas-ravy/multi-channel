import { createHmac } from "node:crypto";

import { getMetaConfig } from "@/lib/env";

export const META_PAGE_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
  "pages_manage_metadata",
  "pages_manage_engagement",
  "pages_messaging",
] as const;

export const META_USER_TOKEN_COOKIE = "meta_user_token";

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  token_type?: string;
};

export type MetaPage = {
  id: string;
  name: string;
  access_token: string;
  tasks?: string[];
};

type PageListResponse = {
  data: MetaPage[];
};

type MetaErrorResponse = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

type MetaSuccessResponse = {
  success: boolean;
};

function graphUrl(path: string): URL {
  const { graphApiVersion } = getMetaConfig();
  return new URL(`https://graph.facebook.com/${graphApiVersion}/${path}`);
}

async function readMetaResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & MetaErrorResponse;

  if (!response.ok || data.error) {
    const message = data.error?.message ?? `Meta request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

function appSecretProof(accessToken: string): string {
  const { appSecret } = getMetaConfig();
  return createHmac("sha256", appSecret).update(accessToken).digest("hex");
}

export function buildMetaAuthorizationUrl(state: string): URL {
  const { appId, graphApiVersion, redirectUri } = getMetaConfig();
  const url = new URL(
    `https://www.facebook.com/${graphApiVersion}/dialog/oauth`,
  );

  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", META_PAGE_SCOPES.join(","));
  url.searchParams.set("response_type", "code");

  return url;
}

export async function exchangeCodeForUserToken(
  code: string,
): Promise<TokenResponse> {
  const { appId, appSecret, redirectUri } = getMetaConfig();
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    code,
    redirect_uri: redirectUri,
  });
  const response = await fetch(graphUrl("oauth/access_token"), {
    method: "POST",
    body,
    cache: "no-store",
  });

  return readMetaResponse<TokenResponse>(response);
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<TokenResponse> {
  const { appId, appSecret } = getMetaConfig();
  const body = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
  const response = await fetch(graphUrl("oauth/access_token"), {
    method: "POST",
    body,
    cache: "no-store",
  });
  return readMetaResponse<TokenResponse>(response);
}

export async function getManagedPages(
  userAccessToken: string,
): Promise<MetaPage[]> {
  const url = graphUrl("me/accounts");

  url.searchParams.set("fields", "id,name,access_token,tasks");
  url.searchParams.set("appsecret_proof", appSecretProof(userAccessToken));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${userAccessToken}`,
    },
    cache: "no-store",
  });
  const result = await readMetaResponse<PageListResponse>(response);

  return result.data;
}

async function postToGraph<T>(
  path: string,
  accessToken: string,
  body: URLSearchParams | Record<string, unknown>,
): Promise<T> {
  const url = graphUrl(path);
  url.searchParams.set("appsecret_proof", appSecretProof(accessToken));

  const isFormBody = body instanceof URLSearchParams;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(isFormBody ? {} : { "Content-Type": "application/json" }),
    },
    body: isFormBody ? body : JSON.stringify(body),
    cache: "no-store",
  });

  return readMetaResponse<T>(response);
}

export async function subscribePageToWebhooks(
  pageId: string,
  pageAccessToken: string,
): Promise<void> {
  const body = new URLSearchParams({
    subscribed_fields: "messages,messaging_postbacks,feed",
  });
  const result = await postToGraph<MetaSuccessResponse>(
    `${pageId}/subscribed_apps`,
    pageAccessToken,
    body,
  );

  if (!result.success) {
    throw new Error(`Meta did not subscribe Page ${pageId} to webhooks`);
  }
}

export async function sendMessengerText(
  pageId: string,
  recipientId: string,
  text: string,
  pageAccessToken: string,
): Promise<void> {
  await postToGraph(
    `${pageId}/messages`,
    pageAccessToken,
    {
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: { text },
    },
  );
}

export async function replyToComment(
  commentId: string,
  text: string,
  pageAccessToken: string,
): Promise<void> {
  await postToGraph(
    `${commentId}/comments`,
    pageAccessToken,
    { message: text },
  );
}
