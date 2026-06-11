# Deploy (firm Cloudflare account)

## Prerequisites

- `bunx wrangler login` (firm account `db3c8d159d12f92055af63054dfec052`)
- One-time: `bun run cf:setup`

## Secrets

Set once per environment (not in git):

```sh
cd apps/frontend
wrangler secret put AUTH_SECRET
wrangler secret put AUTH_GOOGLE_ID
wrangler secret put AUTH_GOOGLE_SECRET
wrangler secret put AI_API_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put GOOGLE_AI_API_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put GTM_LEADS_API_KEY
wrangler secret put NEXTCLOUD_URL
wrangler secret put NEXTCLOUD_USER
wrangler secret put NEXTCLOUD_PASSWORD
wrangler secret put BITRIX24_WEBHOOK
wrangler secret put REDIS_URL
```

Production uses custom domain `https://dealflow.darkalphacapital.com` (`vars` in `wrangler.jsonc`). Add Google OAuth redirect URI:

`https://dealflow.darkalphacapital.com/api/auth/callback/google`

## Deploy

```sh
bun run deploy
```

Production URL: `https://dealflow.darkalphacapital.com` (workers.dev alias still available)

## Bundle size

Worker script must stay under **3 MiB gzip** (free) or **10 MiB** (paid). Heavy UI (MDX editor) is client-only; `unpdf` is dynamically imported in workflows.
