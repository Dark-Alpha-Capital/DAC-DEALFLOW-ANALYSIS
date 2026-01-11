# Use the official Bun image
FROM oven/bun:1.1.13

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy package files and workspace packages
COPY package.json bun.lock* ./
COPY packages/db ./packages/db/
COPY packages/types ./packages/types/
COPY apps/worker/package.json ./apps/worker/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of your application code
COPY . .

# Expose the port
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080
ENV NODE_ENV=production

WORKDIR /app/apps/worker

CMD ["bun", "index.ts"]