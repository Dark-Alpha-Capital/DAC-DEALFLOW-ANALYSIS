# syntax=docker.io/docker/dockerfile:1

FROM node:20-slim AS base
WORKDIR /app

# Install bun for dependency installation
RUN apt-get update && apt-get install -y curl unzip && \
    curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/ ./packages/
# Use bun to install dependencies (faster and works with monorepo)
RUN bun install --frozen-lockfile

# Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
ENV NEXT_TELEMETRY_DISABLED=1

# Set Turbopack root to monorepo root for proper workspace resolution
ENV TURBOPACK_ROOT=/app

# Build-time arguments for NEXT_PUBLIC_ variables
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_WEBSOCKET_URL

# Convert ARGs to ENVs so the build process can access them
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_WEBSOCKET_URL=${NEXT_PUBLIC_WEBSOCKET_URL}

# Build the Next.js app using turbo
WORKDIR /app
RUN npx turbo run build --filter=bitrix-deal-sourcing

# Production image, copy all the files and run next
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Copy the built application
# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
# In monorepo, standalone output preserves directory structure: apps/frontend/
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
# Static files must be at apps/frontend/.next/static relative to where server.js runs
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/public ./apps/frontend/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# Check common locations for server.js in monorepo standalone output
CMD ["sh", "-c", "if [ -f ./apps/frontend/server.js ]; then node ./apps/frontend/server.js; elif [ -f ./server.js ]; then node ./server.js; else echo 'Error: server.js not found' && ls -la && exit 1; fi"]
