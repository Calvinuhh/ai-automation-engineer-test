# Stage 1: Build
FROM node:24-slim AS builder

RUN corepack enable && corepack prepare pnpm@11 --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

# Stage 2: Production runtime
FROM node:24-slim AS runner

RUN corepack enable && corepack prepare pnpm@11 --activate

# Install system deps for Chromium BEFORE any npm/pnpm
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libasound2 libpango-1.0-0 libcairo2 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Production dependencies only
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/package.json ./
RUN pnpm install --frozen-lockfile --prod

# Now install Chromium with playwright available in node_modules
RUN npx playwright install chromium

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
