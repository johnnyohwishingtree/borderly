import { serve } from 'inngest/next';
import { inngest } from '../pipeline/src/inngest.js';
import {
  storyLifecycle,
  verifyAndFix,
  mergeGate,
  ensureReview,
  reviewRelay,
  reviewFix,
  watcher,
} from '../pipeline/src/functions/index.js';

export default serve({
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
});
