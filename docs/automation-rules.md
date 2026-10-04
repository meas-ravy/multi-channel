# Keyword automation rules

The internal automation API creates rule-based Messenger and Facebook comment
replies. It is protected by `ADMIN_API_KEY`; this is a temporary internal API,
not a replacement for user authentication.

## Create the admin key

```bash
openssl rand -hex 32
```

Store the result as `ADMIN_API_KEY` in `.env.local`.

## Create a Messenger keyword rule

```bash
curl -X POST http://localhost:3000/api/automations \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "metaPageId": "YOUR_FACEBOOK_PAGE_ID",
    "name": "Messenger price reply",
    "trigger": "MESSAGE",
    "keyword": "price",
    "replyText": "Thanks for asking. We will send you the price details now."
  }'
```

## Create a comment keyword rule

```bash
curl -X POST http://localhost:3000/api/automations \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "metaPageId": "YOUR_FACEBOOK_PAGE_ID",
    "name": "Public price comment",
    "trigger": "COMMENT",
    "keyword": "price",
    "replyText": "Thanks! We have sent the pricing information."
  }'
```

Rules use case-insensitive substring matching. When multiple active rules match,
the rule with the highest `priority` wins; equal priorities use the oldest rule.

## List rules

```bash
curl http://localhost:3000/api/automations \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

Add `?metaPageId=YOUR_FACEBOOK_PAGE_ID` to filter the list.

## Configure the Meta webhook

Set the callback URL in the Meta App Dashboard to:

```text
https://YOUR-PUBLIC-DOMAIN/api/meta/webhook
```

Use the exact `META_WEBHOOK_VERIFY_TOKEN` value from `.env.local`, select the
Page object, and subscribe to `messages`, `messaging_postbacks`, and `feed`.

The endpoint verifies `X-Hub-Signature-256` before accepting events. Accepted
events are deduplicated in `webhook_events`. Messenger text events match
`MESSAGE` rules and use the Messenger Send API; new Page comments match
`COMMENT` rules and create public comment replies.

Messenger replies use the `RESPONSE` messaging type and must remain within
Meta's allowed messaging window. The processor ignores Page-authored Messenger
echoes and Page-authored comments to prevent reply loops.
