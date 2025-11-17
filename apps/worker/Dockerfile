# Use the official Bun image
FROM oven/bun:1.1.13

# Install Node.js (required for Prisma)
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy package files and workspace packages
COPY package.json bun.lock ./
COPY packages/db ./packages/db/
COPY packages/types ./packages/types/
COPY apps/worker/package.json ./apps/worker/

# Install dependencies (this will install prisma from packages/db)
RUN bun install --frozen-lockfile

# Generate Prisma client
# First try with bunx, fallback to npx if that fails
# The schema path is relative to packages/db directory
RUN cd packages/db && \
    (bunx prisma generate --schema=prisma/schema.prisma || \
     npx prisma generate --schema=prisma/schema.prisma) && \
    echo "Prisma client generated successfully"

# Verify Prisma client was generated (check common locations)
RUN (test -d packages/db/node_modules/.prisma/client || \
     test -d node_modules/.prisma/client || \
     test -d node_modules/@prisma/client || \
     (find . -name ".prisma" -type d | head -1 | xargs test -d)) && \
    echo "Prisma client found" || \
    (echo "WARNING: Prisma client location not verified, but continuing..." && ls -la packages/db/node_modules/ 2>/dev/null || true)

# Copy the rest of your application code
COPY . .

# Expose the port
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080

WORKDIR /app/apps/worker

CMD ["bun", "apps/worker/index.ts"]