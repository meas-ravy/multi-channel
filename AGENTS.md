<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project instructions

## Product scope

- Build a SaaS platform for chatbot automation.
- Start with Facebook Page and Messenger automation before adding other platforms.
- The first version is rule-based: keyword replies, comment replies, private messages, webhooks, contacts, and conversation history.
- External AI providers such as OpenAI or Claude are optional future features, not MVP requirements.
- Use official Meta APIs and webhooks. Do not use browser scraping or automate personal Facebook accounts.
- Respect Meta opt-in, permission, and messaging-window requirements. Never design unsolicited or forced messaging.

## Working rules

- Keep changes small and focused on the requested feature.
- Preserve existing behavior and styling unless the user explicitly requests a change.
- Do not add speculative abstractions, dependencies, platforms, or AI integrations.
- Never commit secrets, access tokens, app secrets, or real credentials. Document required values in `.env.example` with placeholders.
- Ask before running database migrations, resets, destructive commands, or production deployments.
- After editing, inspect the diff and run the smallest relevant lint, type-check, or test command. Clearly report anything not verified.
