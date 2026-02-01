# Use Bun official image (matching packageManager version)
FROM oven/bun:1.2.22 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
# Copy root package files for workspace setup
COPY package.json bun.lock* ./
# Copy workspace packages (needed for workspace dependencies)
COPY packages/db/package.json ./packages/db/
COPY packages/typescript-config/package.json ./packages/typescript-config/
# Copy api package.json
COPY apps/api/package.json ./apps/api/
# Install all dependencies
RUN bun install

# Production stage
FROM base AS production
WORKDIR /app

# Copy dependencies (Bun workspaces install to root node_modules)
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY package.json bun.lock* ./
# Copy workspace packages (needed at runtime)
COPY packages/db ./packages/db
COPY packages/typescript-config ./packages/typescript-config
COPY apps/api ./apps/api

# Set working directory to api
WORKDIR /app/apps/api

# Expose port (Cloud Run will set PORT env var automatically)
EXPOSE 8080

# Set default port if not provided
ENV PORT=8080

# Run the server
CMD ["bun", "run", "index.ts"]