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

# Install Chromium + system deps for Playwright scraping at runtime
RUN npx playwright install --with-deps chromium

WORKDIR /app

# Production dependencies only
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/package.json ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

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
RUN mkdir -p /app/logs /app/data/research /app/generated/listicles

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["pnpm", "start"]
