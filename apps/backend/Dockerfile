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
COPY apps/backend/package.json ./apps/backend/

# Install dependencies (this will install prisma from packages/db)
RUN bun install --frozen-lockfile

# Generate Prisma client
# First try with bunx, fallback to npx if that fails
# The schema path is relative to packages/db directory
RUN cd packages/db && \
    (bunx prisma generate --schema=prisma/schema.prisma || \
     npx prisma generate --schema=prisma/schema.prisma) && \
    echo "Prisma client generated successfully"

# Copy the rest of your application code
COPY . .

# Expose the port your app runs on
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080

# Start the backend server using Bun
CMD ["bun", "apps/backend/index.ts"]

