type MetaConfig = {
  appId: string;
  appSecret: string;
  graphApiVersion: string;
  redirectUri: string;
};

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getMetaConfig(): MetaConfig {
  const graphApiVersion = required("META_GRAPH_API_VERSION");

  if (!/^v\d+\.\d+$/.test(graphApiVersion)) {
    throw new Error("META_GRAPH_API_VERSION must look like v25.0");
  }

  return {
    appId: required("META_APP_ID"),
    appSecret: required("META_APP_SECRET"),
    graphApiVersion,
    redirectUri: required("META_REDIRECT_URI"),
  };
}

export function getDatabaseUrl(): string {
  return required("DATABASE_URL");
}

export function getTokenEncryptionKey(): string {
  return required("META_TOKEN_ENCRYPTION_KEY");
}

export function getWebhookVerifyToken(): string {
  return required("META_WEBHOOK_VERIFY_TOKEN");
}

export function getAdminApiKey(): string {
  return required("ADMIN_API_KEY");
}
