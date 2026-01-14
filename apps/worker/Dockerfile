FROM oven/bun:1 AS base

WORKDIR /app

# 1) Prune the monorepo down to just the worker app + its deps
FROM base AS prune
# Pin turbo version to match package.json
RUN bun add -g turbo@^2
COPY . .
RUN turbo prune worker --docker

# 2) Install dependencies in the pruned workspace and build the worker
FROM base AS builder
WORKDIR /app

COPY --from=prune /app/out/json/ .
RUN bun install

COPY --from=prune /app/out/full/ .
COPY turbo.json turbo.json

# Remote caching support (optional, pass as build args)
ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM
ARG TURBO_TOKEN
ENV TURBO_TOKEN=$TURBO_TOKEN

# Build only the worker app and its internal dependencies
RUN bunx turbo run build --filter=worker

# 3) Runtime image: Bun running the built worker bundle
FROM oven/bun:1 AS runner
WORKDIR /app

# Use the non-root bun user already provided by the base image
USER bun

ENV NODE_ENV=production

COPY --from=builder --chown=bun:bun /app .

EXPOSE 8080

CMD ["bun", "apps/worker/dist/index.js"]