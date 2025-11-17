# Use the official Bun image
FROM oven/bun:1.1.13

# Set the working directory inside the container
WORKDIR /app

# Copy package files and workspace packages
COPY package.json bun.lock ./
COPY packages/db ./packages/db/

# Install dependencies (this will install prisma from packages/db)
RUN bun install --frozen-lockfile

# Generate Prisma client (prisma is installed in root node_modules due to workspace hoisting)
RUN node_modules/.bin/prisma generate --schema=packages/db/prisma/schema.prisma

# Copy the rest of your application code
COPY . .

# Expose the port
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080

# Start the worker using Bun with production script
CMD ["bun", "run", "start:prod"]