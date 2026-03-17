/**
 * Inngest client and event definitions.
 *
 * All pipeline events flow through this client. Events map 1:1 to the triggers
 * that previously dispatched GitHub Actions workflows.
 */

import { Inngest, EventSchemas } from 'inngest';

// ─── Event Definitions ──────────────────────────────────────────────────────

type PipelineEvents = {
  /**
   * PR merged to master with a linked story.
   * Replaces: orchestrate.yml trigger (pull_request closed+merged)
   */
  'pipeline/pr.merged': {
    data: {
      prNumber: number;
      headBranch: string;
      mergedBy: string;
      repo: string;
    };
  };

  /**
   * Story implementation requested.
   * Replaces: trigger_story_agent() in lib.sh / claude.yml trigger
   */
  'pipeline/story.trigger': {
    data: {
      issueNumber: number;
      agent: 'claude' | 'gemini';
      epicLabel: string;
      repo: string;
      retrySuffix?: string;
    };
  };

  /**
   * Verify-and-fix cycle requested.
   * Replaces: verify-and-fix.yml workflow_dispatch
   */
  'pipeline/verify.requested': {
    data: {
      branch: string;
      workBranch: string;
      issueNumber: number;
      checks: 'all' | 'ci' | 'e2e';
      fixEnabled: boolean;
      maxAttempts: number;
      attempt: number;
      mergeInto: string;
      createPr: boolean;
      fixContext: string;
      repo: string;
    };
  };

  /**
   * CI checks completed on a PR.
   * Replaces: auto-merge.yml workflow_run trigger
   */
  'pipeline/ci.completed': {
    data: {
      prNumber: number;
      headSha: string;
      headBranch: string;
      repo: string;
    };
  };

  /**
   * Merge gate evaluation requested.
   * Replaces: auto-merge.yml workflow_dispatch
   */
  'pipeline/merge.evaluate': {
    data: {
      prNumber: number;
      repo: string;
    };
  };

  /**
   * PR review submitted (by bot or human).
   * Replaces: review-relay.yml pull_request_review trigger
   */
  'pipeline/review.submitted': {
    data: {
      prNumber: number;
      reviewer: string;
      reviewState: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';
      reviewBody: string;
      isBot: boolean;
      repo: string;
    };
  };

  /**
   * Review fix requested (from review-relay to review-fix).
   * Replaces: review-fix.yml workflow_dispatch
   */
  'pipeline/review.fix-requested': {
    data: {
      prNumber: number;
      issueNumber: number;
      branch: string;
      feedback: string;
      repo: string;
    };
  };

  /**
   * Watcher health check tick.
   * Replaces: watcher.yml schedule (every 20 min)
   */
  'pipeline/watcher.tick': {
    data: {
      repo: string;
      triggeredBy: 'schedule' | 'manual';
    };
  };

  /**
   * Pipeline doctor diagnosis requested.
   * Replaces: pipeline-doctor.yml workflow_dispatch
   */
  'pipeline/doctor.requested': {
    data: {
      issueNumber: number;
      prNumber?: number;
      reason: string;
      repo: string;
    };
  };

  /**
   * Daily planner tick (create epics + stories).
   * Replaces: daily-planner.yml schedule
   */
  'pipeline/planner.tick': {
    data: {
      repo: string;
      triggeredBy: 'schedule' | 'manual';
    };
  };

  /**
   * Review guardian: ensure PR gets reviewed.
   * Replaces: review-guardian.yml workflow_run trigger
   */
  'pipeline/review.ensure': {
    data: {
      prNumber: number;
      headSha: string;
      repo: string;
    };
  };
};

// ─── Inngest Client ─────────────────────────────────────────────────────────

export const inngest = new Inngest({
  id: 'borderly-pipeline',
  schemas: new EventSchemas().fromRecord<PipelineEvents>(),
});

export type { PipelineEvents };
