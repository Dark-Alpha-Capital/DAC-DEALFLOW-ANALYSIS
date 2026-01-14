FROM oven/bun:1 AS base
WORKDIR /app

# 1) Prune the monorepo down to just the frontend app + its deps
FROM base AS prune
# Pin turbo version to match package.json
RUN bun add -g turbo@^2
COPY . .
RUN turbo prune frontend --docker

# 2) Install dependencies in the pruned workspace and build the app
FROM base AS builder
WORKDIR /app

# Install deps for the pruned workspace
COPY --from=prune /app/out/json/ .
RUN bun install

# Copy full sources for the pruned graph and turbo config
COPY --from=prune /app/out/full/ .
COPY turbo.json turbo.json

# Accept build arguments for environment variables needed during build
# ARG DATABASE_URL
# ARG DIRECT_URL
# ARG AUTH_SECRET
# ARG REDIS_URL
# ARG RESEND_API_KEY
ARG NEXT_PUBLIC_APP_URL
# ARG AI_API_KEY
# ARG OPENAI_API_KEY

# Set environment variables so they're available during Next.js build
# Next.js needs these at build time because API routes are evaluated during build
# Explicitly set NODE_ENV=production to ensure webpack is used instead of Turbopack
# ENV NODE_ENV=production
# ENV DATABASE_URL=$DATABASE_URL
# ENV DIRECT_URL=$DIRECT_URL
# ENV AUTH_SECRET=$AUTH_SECRET
# ENV REDIS_URL=$REDIS_URL
# ENV RESEND_API_KEY=$RESEND_API_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
# ENV AI_API_KEY=$AI_API_KEY
# ENV OPENAI_API_KEY=$OPENAI_API_KEY
# Build the frontend app directly (turbo prune already handled dependencies)
WORKDIR /app/apps/frontend
RUN bun run build

# 3) Runtime image: Node.js running Next.js standalone output
FROM node:20-alpine AS runner
WORKDIR /app

# Don't run production as root for security reasons
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs
USER nextjs

ENV NODE_ENV=production

# Copy the Next.js standalone server and static assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/public ./apps/frontend/public

EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]