FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lockb* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN bun install --frozen-lockfile

# Build shared package
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build shared package first (required dependency)
WORKDIR /app/packages/shared
RUN bun run build

# Build API
WORKDIR /app/apps/api
RUN bun run build

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built API
COPY --from=builder /app/apps/api/.dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json

# Copy built shared package to node_modules for runtime resolution
COPY --from=builder /app/packages/shared/.dist ./node_modules/@my-scope/shared/.dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@my-scope/shared/package.json

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
