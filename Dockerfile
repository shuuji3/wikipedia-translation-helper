# Stage 1: Build
FROM node:25-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Run
FROM node:25-slim

WORKDIR /app

# Copy the build output
COPY --from=builder /app/.output ./.output

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run uses the PORT environment variable
EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]
