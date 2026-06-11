#!/usr/bin/env bash
# Bootstrap Cloudflare resources for dealflow-dark-alpha-capital (firm account).
# Prerequisites: wrangler login, CLOUDFLARE_ACCOUNT_ID set or account_id in wrangler.jsonc.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FRONTEND="$(cd "$(dirname "$0")/.." && pwd)"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-db3c8d159d12f92055af63054dfec052}"

export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"
cd "$FRONTEND"

echo "==> D1 databases"
bunx wrangler d1 list

echo "==> Vectorize indexes"
bunx wrangler vectorize list

if ! bunx wrangler vectorize list 2>/dev/null | grep -q document-chunks; then
  echo "Creating document-chunks index..."
  bunx wrangler vectorize create document-chunks --dimensions=768 --metric=cosine
fi

for prop in documentId entityType entityId dealOpportunityId companyId themeId; do
  echo "Metadata index: $prop"
  bunx wrangler vectorize create-metadata-index document-chunks \
    --property-name="$prop" \
    --type=string || true
done

echo "==> Apply D1 migrations (remote)"
bunx wrangler d1 migrations apply dealflow-db --remote

echo "==> Set secrets (interactive — run manually if needed)"
cat <<'EOF'
wrangler secret put AUTH_SECRET
wrangler secret put AUTH_GOOGLE_ID
wrangler secret put AUTH_GOOGLE_SECRET
wrangler secret put AI_API_KEY
wrangler secret put GOOGLE_AI_API_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put GTM_LEADS_API_KEY
wrangler secret put NEXTCLOUD_URL
wrangler secret put NEXTCLOUD_USER
wrangler secret put NEXTCLOUD_PASSWORD
wrangler secret put BITRIX24_WEBHOOK
wrangler secret put REDIS_URL
wrangler secret put BITRIX_SECRET_KEY
wrangler secret put BLOB_READ_WRITE_TOKEN
EOF

echo ""
echo "Set public URLs in wrangler.jsonc vars (BETTER_AUTH_URL, VITE_PUBLIC_APP_URL) for each environment."
echo "Done. Deploy: bun run --cwd apps/frontend deploy"
