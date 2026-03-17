/**
 * Inngest HTTP server — serves all pipeline functions.
 *
 * Production deployment: runs as a long-lived Node process behind a container.
 * Inngest Cloud sends webhook requests to /api/inngest to execute function steps.
 *
 * Required env vars: GH_PAT, GITHUB_REPOSITORY
 * Optional: INNGEST_SIGNING_KEY, INNGEST_EVENT_KEY, PORT, PREFERRED_AGENT
 */

import { serve as honoServe } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serve } from 'inngest/hono';
import { inngest } from './inngest.js';
import {
  storyLifecycle,
  verifyAndFix,
  mergeGate,
  ensureReview,
  reviewRelay,
  reviewFix,
  watcher,
} from './functions/index.js';
import { loadEnv, envSummary } from './lib/env.js';

// ─── Validate environment ───────────────────────────────────────────────────

const env = loadEnv();

// ─── App ────────────────────────────────────────────────────────────────────

const app = new Hono();

// Request logging in production
if (env.nodeEnv === 'production') {
  app.use('*', logger());
}

// Health check — used by container orchestrators and deploy probes
app.get('/', (c) =>
  c.json({
    service: 'borderly-pipeline',
    status: 'ok',
    version: process.env['npm_package_version'] ?? '0.1.0',
  })
);

// Detailed health check (non-sensitive)
app.get('/health', (c) =>
  c.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    env: envSummary(env),
  })
);

// Inngest serve endpoint — Inngest Cloud calls this to execute function steps
app.on(
  ['GET', 'POST', 'PUT'],
  '/api/inngest',
  serve({
    client: inngest,
    functions: [
      storyLifecycle,
      verifyAndFix,
      mergeGate,
      ensureReview,
      reviewRelay,
      reviewFix,
      watcher,
    ],
    ...(env.inngestSigningKey
      ? { signingKey: env.inngestSigningKey }
      : {}),
  })
);

// ─── Start server ───────────────────────────────────────────────────────────

honoServe(
  { fetch: app.fetch, port: env.port },
  (info) => {
    console.log(`Pipeline server listening on port ${info.port}`);
    console.log(`Environment: ${env.nodeEnv}`);
    console.log(`Repo: ${env.repo}`);
    console.log(`Inngest endpoint: http://localhost:${info.port}/api/inngest`);
  }
);

export default app;
