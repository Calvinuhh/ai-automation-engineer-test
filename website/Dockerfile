# Stage 1: Build
FROM node:24-slim AS builder

RUN corepack enable && corepack prepare pnpm@11 --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

# Stage 2: Production runtime
# Use Playwright's official noble image as base: Ubuntu 24.04 + all Chromium system deps + browsers pre-installed
FROM mcr.microsoft.com/playwright:v1.61.1-noble AS runner

RUN corepack enable && corepack prepare pnpm@11 --activate

WORKDIR /app

# Production dependencies only (Playwright browsers already in base image)
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/package.json ./
RUN pnpm install --frozen-lockfile --prod

# Copy built output and runtime assets
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/proxy.ts ./
COPY --from=builder /app/instrumentation.ts ./

# Copy templates (referenced at runtime for EJS rendering)
COPY --from=builder /app/templates ./templates

# Copy drizzle config for potential migrations
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/drizzle ./drizzle

# Runtime directories (logs, uploads)
RUN mkdir -p /app/logs /app/data/research

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["pnpm", "start"]
