# Use Bun official image (matching packageManager version)
FROM oven/bun:1.2.22 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
# Copy root package files for workspace setup
COPY package.json bun.lock* ./
# Copy workspace packages (needed for workspace dependencies)
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
# Copy worker package.json
COPY apps/worker/package.json ./apps/worker/
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
COPY packages/types ./packages/types
COPY packages/typescript-config ./packages/typescript-config
COPY apps/worker ./apps/worker

# Set working directory to worker
WORKDIR /app/apps/worker

# Expose port (Cloud Run requires a port, even for background services)
# Using 8081 to avoid conflict with server (8080)
EXPOSE 8081

# Set default port if not provided
ENV PORT=8081

# Run the worker (long-running process)
CMD ["bun", "run", "index.ts"]
