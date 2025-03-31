# Base image
FROM node:20-slim AS base

# ───────────────────────────────
# Dependencies
FROM base AS deps
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# ───────────────────────────────
# App Builder
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN mkdir -p ./data
RUN corepack enable pnpm && NODE_ENV=production pnpm exec drizzle-kit push --config=drizzle.config.ts

RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# ───────────────────────────────
# Production Runner
FROM base AS runner
WORKDIR /app

# Set environment defaults — override at runtime
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Default secrets (can be overridden via docker run -e ...)
ENV OPENAI_API_KEY=""
ENV AUTH_SECRET=""
ENV DATABASE_URL=""

# Create user
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 --home /home/nextjs nextjs

# Copy built app
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/utils ./utils

# Create writable data and home dirs
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data
RUN mkdir -p /home/nextjs && chown -R nextjs:nodejs /home/nextjs

# Entrypoint
COPY --chown=nextjs:nodejs entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./entrypoint.sh"]
