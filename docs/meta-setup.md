# Meta app setup

This project uses a server-side Facebook OAuth flow to connect Facebook Pages.
The application stores only Page access tokens, encrypted with AES-256-GCM.

## 1. Create the Meta app

1. Create an app in the Meta for Developers dashboard for your business use case.
2. Add the Facebook Login, Messenger, and Webhooks products required by the app.
3. Keep the app in Development mode while testing with app administrators,
   developers, and testers.

Meta changes dashboard labels over time. Use the current Meta dashboard and its
linked documentation when the product or use-case names differ.

## 2. Configure Facebook Login

Add this exact Valid OAuth Redirect URI for local development:

```text
http://localhost:3000/api/meta/callback
```

For production, replace the origin with the public HTTPS origin. The value must
exactly match `META_REDIRECT_URI`.

The application requests these permissions:

- `pages_show_list`
- `pages_read_engagement`
- `pages_read_user_content`
- `pages_manage_metadata`
- `pages_manage_engagement`
- `pages_messaging`

Development-mode testing works only for people and Pages connected to an app
role. Access for other businesses requires the appropriate Meta App Review,
advanced access, business verification, privacy policy, and data-deletion flow.

## 3. Configure environment variables

Copy `.env.example` to `.env.local` and set every value. Generate the encryption
key once and keep it stable:

```bash
openssl rand -base64 32
```

Changing `META_TOKEN_ENCRYPTION_KEY` makes previously stored Page tokens
unreadable. Never commit the app secret, database URL, Page tokens, or encryption
key.

Choose a Graph API version supported by the Meta app and set it in
`META_GRAPH_API_VERSION`. The application intentionally does not hardcode a
version because Meta retires Graph API versions on a schedule.

## 4. Prepare the database

After setting `DATABASE_URL`, create the migration yourself:

```bash
npx prisma migrate dev --name init-facebook-automation
```

The migration is intentionally not run automatically.

## 5. Configure the webhook

Before connecting a Page, configure the Meta Webhooks product with this public
HTTPS callback URL:

```text
https://YOUR-PUBLIC-DOMAIN/api/meta/webhook
```

Use the exact `META_WEBHOOK_VERIFY_TOKEN` value and subscribe the Page object to
`messages`, `messaging_postbacks`, and `feed`. Localhost is not reachable by
Meta, so local testing requires a trusted HTTPS tunnel or a deployed preview.

## 6. Test the connection

1. Start the application with `npm run dev`.
2. Open `http://localhost:3000/facebook`.
3. Select **Connect Facebook**.
4. Approve one or more Pages.
5. Confirm that the app returns to `/facebook` with a connected message.

The callback exchanges the authorization code on the server, requests a
long-lived user token, obtains Page access tokens from `/me/accounts`, encrypts
them, subscribes each Page to the configured webhook fields, and upserts the
selected Pages. It does not store the user token.

Create keyword rules after connecting the Page by following
[`automation-rules.md`](./automation-rules.md).

## Security boundary

Authentication is intentionally outside the current MVP scope. Do not expose
the Facebook setup route publicly until administrator authentication and access
control are added.
