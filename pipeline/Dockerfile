# Pipeline server — Inngest function executor
#
# Multi-stage build:
# 1. Install dependencies
# 2. Run the server with tsx (TypeScript execution)
#
# Build:   docker build -t borderly-pipeline pipeline/
# Run:     docker run -p 3000:3000 --env-file .env borderly-pipeline

FROM node:20-slim AS base

RUN npm install -g pnpm@10

WORKDIR /app

# ─── Install dependencies ────────────────────────────────────────────────────

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# ─── Copy source ──────────────────────────────────────────────────────────────

COPY tsconfig.json ./
COPY src/ src/

# ─── Runtime ──────────────────────────────────────────────────────────────────

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["npx", "tsx", "src/serve.ts"]
