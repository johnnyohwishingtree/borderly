/**
 * Inngest HTTP server — serves all pipeline functions.
 *
 * In production, deploy this as a serverless function or long-running process.
 * Inngest calls these endpoints to execute durable workflow steps.
 */

import { Hono } from 'hono';
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

const app = new Hono();

app.get('/', (c) => c.text('Borderly Pipeline Orchestration'));

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
  })
);

export default app;
