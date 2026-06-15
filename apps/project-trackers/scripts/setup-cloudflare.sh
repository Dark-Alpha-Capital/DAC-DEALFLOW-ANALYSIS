#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Apply D1 migrations (remote)"
bunx wrangler d1 migrations apply project-trackers-db --remote

echo "==> Seed project screeners (optional)"
echo "Run: bun run --cwd ../../packages/db-tracker seed:screeners"

echo "Done. Deploy: bun run --cwd apps/project-trackers deploy"
