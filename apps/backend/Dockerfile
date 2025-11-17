# Use the official Bun image
FROM oven/bun:1.1.13

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy Prisma schema and generate client
COPY packages/db ./packages/db/
RUN cd packages/db && bunx prisma generate

# Copy the rest of your application code
COPY . .

# Expose the port your app runs on
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080

# Start the backend server using Bun
CMD ["bun", "apps/backend/index.ts"]

