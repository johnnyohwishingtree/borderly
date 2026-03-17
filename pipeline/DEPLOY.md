# Pipeline Deployment Guide

## Overview

The Borderly pipeline server hosts Inngest functions that orchestrate the CI/CD pipeline. Inngest Cloud sends webhook requests to the server to execute durable workflow steps.

```
GitHub Events → inngest-relay.yml → Inngest Cloud → Pipeline Server → GitHub API
```

## Required Secrets

Configure these in **Settings → Secrets and variables → Actions → Secrets**:

| Secret | Description | How to get it |
|--------|-------------|---------------|
| `GH_PAT` | GitHub Personal Access Token | Settings → Developer settings → PATs → Fine-grained. Needs: issues (rw), pull requests (rw), actions (rw), contents (rw) |
| `INNGEST_EVENT_KEY` | Inngest event key for sending events | [Inngest Dashboard](https://app.inngest.com) → your app → Manage → Keys → Event Key |
| `INNGEST_SIGNING_KEY` | Inngest signing key for verifying requests | Inngest Dashboard → your app → Manage → Keys → Signing Key |

## Required Variables

Configure these in **Settings → Secrets and variables → Actions → Variables**:

| Variable | Description | Example |
|----------|-------------|---------|
| `INNGEST_API_URL` | Inngest event API URL (optional) | `https://inn.gs/e` (default) |
| `PIPELINE_DEPLOY_URL` | Deployed pipeline server URL (optional) | `https://pipeline.example.com` |
| `PREFERRED_AGENT` | AI agent for story implementation | `claude` (default) or `gemini` |

## Inngest Cloud Setup

1. **Create an Inngest account** at [inngest.com](https://www.inngest.com)

2. **Create a new app** named `borderly-pipeline`

3. **Copy your keys** from the Inngest dashboard:
   - Event Key → set as `INNGEST_EVENT_KEY` GitHub secret
   - Signing Key → set as `INNGEST_SIGNING_KEY` GitHub secret

4. **Register your serve endpoint** in Inngest Cloud:
   - Go to Apps → your app → Syncs
   - Add URL: `https://<your-deploy-url>/api/inngest`
   - Inngest will discover all registered functions automatically

## Deployment Options

### Option A: Container (recommended)

The pipeline ships with a Dockerfile. Deploy to any container platform:

```bash
# Build
docker build -t borderly-pipeline pipeline/

# Run locally
docker run -p 3000:3000 \
  -e GH_PAT=ghp_xxx \
  -e GITHUB_REPOSITORY=owner/repo \
  -e INNGEST_SIGNING_KEY=signkey-xxx \
  -e INNGEST_EVENT_KEY=xxx \
  -e NODE_ENV=production \
  borderly-pipeline
```

Supported platforms: Railway, Render, Fly.io, Cloud Run, ECS, any Docker host.

The `deploy-pipeline.yml` workflow automates building and pushing to a container registry on every push to `master` that changes `pipeline/` files.

### Option B: Direct Node process

```bash
cd pipeline
pnpm install --frozen-lockfile
NODE_ENV=production \
  GH_PAT=ghp_xxx \
  GITHUB_REPOSITORY=owner/repo \
  INNGEST_SIGNING_KEY=signkey-xxx \
  npx tsx src/serve.ts
```

## Environment Variables (Server)

The pipeline server requires these env vars at runtime:

| Variable | Required | Description |
|----------|----------|-------------|
| `GH_PAT` | Yes | GitHub PAT for API calls |
| `GITHUB_REPOSITORY` | Yes | `owner/repo` format |
| `INNGEST_SIGNING_KEY` | Prod only | Verifies Inngest webhook requests |
| `INNGEST_EVENT_KEY` | No | For sending events from the server |
| `PREFERRED_AGENT` | No | `claude` (default) or `gemini` |
| `PORT` | No | Server port (default: `3000`) |
| `NODE_ENV` | No | `production`, `development`, or `test` |

## Health Check

The server exposes two health endpoints:

- `GET /` — Basic status (for uptime monitors)
- `GET /health` — Detailed health with env summary (no secrets exposed)

```bash
curl https://pipeline.example.com/health
# {"status":"ok","uptime":3600,"env":{"repo":"owner/repo","ghToken":"***set***",...}}
```

## Verifying the Setup

1. **Check the relay works**: Manually dispatch `inngest-relay.yml` with a test event:
   ```
   Event name: pipeline/watcher.tick
   Event data: {"repo":"owner/repo","triggeredBy":"manual"}
   ```

2. **Check functions are registered**: Visit Inngest Dashboard → Functions. You should see:
   - `story-lifecycle`
   - `verify-and-fix`
   - `merge-gate`
   - `ensure-review`
   - `review-relay`
   - `review-fix`
   - `pipeline-watcher`

3. **Check the health endpoint**:
   ```bash
   curl https://<your-deploy-url>/health
   ```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Relay returns HTTP 401 | Invalid `INNGEST_EVENT_KEY` | Regenerate key in Inngest dashboard |
| Functions not appearing | Server not synced | Re-sync in Inngest dashboard → Apps → Syncs |
| Functions fail with auth error | Invalid `GH_PAT` | Regenerate PAT with correct scopes |
| Signing key mismatch | Wrong `INNGEST_SIGNING_KEY` | Copy signing key from Inngest dashboard |
| Server won't start | Missing env vars | Check `GH_PAT` and `GITHUB_REPOSITORY` are set |
