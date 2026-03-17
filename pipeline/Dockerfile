# Pipeline server — Inngest function executor
#
# Multi-stage build:
# 1. builder — compile TypeScript to JavaScript (includes devDependencies)
# 2. production — copy compiled JS + prod-only dependencies, run with node
#
# Build:   docker build -t borderly-pipeline pipeline/
# Run:     docker run -p 3000:3000 --env-file .env borderly-pipeline

FROM node:20-slim AS base

RUN npm install -g pnpm@9

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# ─── Builder stage ────────────────────────────────────────────────────────────

FROM base AS builder

# Install all dependencies (including devDependencies for tsc)
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ src/

# Compile TypeScript → JavaScript into dist/
RUN pnpm exec tsc --project tsconfig.json

# ─── Production stage ─────────────────────────────────────────────────────────

FROM base AS production

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# ─── Runtime ──────────────────────────────────────────────────────────────────

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "dist/serve.js"]
