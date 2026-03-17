/**
 * Review Orchestration — Inngest port of review-guardian.yml, review-relay.yml, review-fix.yml
 *
 * Three concerns combined into one durable function:
 * 1. Ensure a PR gets reviewed (review-guardian)
 * 2. Relay bot review feedback (review-relay)
 * 3. Apply review fixes (review-fix)
 */

import { inngest } from '../inngest.js';
import { GitHubClient } from '../lib/github.js';
import { PipelineStateMachine } from '../lib/state-machine.js';
import { createShadowContext } from '../lib/shadow-context.js';

const MAX_RELAY_ROUNDS = 3;
const BOT_REVIEWERS = ['gemini-code-assist[bot]', 'copilot[bot]'];

// ─── Ensure Review ──────────────────────────────────────────────────────────

export const ensureReview = inngest.createFunction(
  {
    id: 'ensure-review',
    name: 'Ensure PR Gets Reviewed',
    retries: 2,
    debounce: { period: '90s', key: 'event.data.prNumber' },
  },
  { event: 'pipeline/review.ensure' },
  async ({ event, step }) => {
    const { prNumber, repo } = event.data;
    const token = process.env['GH_PAT'] ?? process.env['GITHUB_TOKEN'] ?? '';
    const rawGithub = new GitHubClient({ token, repo });
    const ctx = createShadowContext(rawGithub, 'ensure-review', event.name);
    const github = ctx.github;
    const stateMachine = new PipelineStateMachine(github);

    // Step 1: Check if already approved
    const approvals = await step.run('check-approvals', async () => {
      return github.countApprovals(prNumber);
    });

    if (approvals > 0) {
      // Already approved — trigger merge evaluation
      await step.sendEvent('emit-merge-eval', {
        name: 'pipeline/merge.evaluate',
        data: { prNumber, repo },
      });
      return ctx.finalize('already-approved', { status: 'already-approved', prNumber });
    }

    // Step 2: Check for existing reviews
    const reviewStatus = await step.run('check-review-status', async () => {
      const reviews = await github.getPRReviewComments(prNumber);
      const hasReviews = reviews.length > 0;
      const unresolvedThreads = await github.countUnresolvedThreads(prNumber);
      const criticalComments = await github.countCriticalComments(prNumber);

      return { hasReviews, unresolvedThreads, criticalComments };
    });

    if (reviewStatus.hasReviews) {
      // Has reviews but not approved
      if (
        reviewStatus.unresolvedThreads === 0 &&
        reviewStatus.criticalComments === 0
      ) {
        // Clean reviews — auto-approve
        await step.run('auto-approve', async () => {
          await github.approvePR(
            prNumber,
            'Auto-approved: reviews are clean, no critical issues.'
          );
        });

        await step.sendEvent('emit-merge-after-approve', {
          name: 'pipeline/merge.evaluate',
          data: { prNumber, repo },
        });

        return ctx.finalize('auto-approved', { status: 'auto-approved', prNumber });
      }

      // Has unresolved issues — wait for review-fix
      return ctx.finalize('waiting-for-fixes', {
        status: 'waiting-for-fixes',
        unresolvedThreads: reviewStatus.unresolvedThreads,
        criticalComments: reviewStatus.criticalComments,
      });
    }

    // No reviews yet — request Claude review
    await step.run('request-review', async () => {
      const issueNumber = await github.getLinkedIssueFromPR(prNumber);
      if (issueNumber) {
        try {
          await stateMachine.transition(issueNumber, 'reviewing');
        } catch {
          // Non-fatal
        }
      }
      await github.commentOnIssue(
        prNumber,
        '@claude Please review this PR. Check for correctness, security, and adherence to project conventions in CLAUDE.md.'
      );
    });

    return ctx.finalize('review-requested', { status: 'review-requested', prNumber });
  }
);

// ─── Review Relay + Fix ──────────────────────────────────────────────────────

export const reviewRelay = inngest.createFunction(
  {
    id: 'review-relay',
    name: 'Review Relay and Fix',
    retries: 1,
    concurrency: [{ limit: 1, key: 'event.data.prNumber' }],
  },
  { event: 'pipeline/review.submitted' },
  async ({ event, step }) => {
    const { prNumber, reviewer, reviewState, reviewBody, isBot, repo } =
      event.data;

    const token = process.env['GH_PAT'] ?? process.env['GITHUB_TOKEN'] ?? '';
    const rawGithub = new GitHubClient({ token, repo });
    const ctx = createShadowContext(rawGithub, 'review-relay', event.name);
    const github = ctx.github;
    const stateMachine = new PipelineStateMachine(github);

    // Only relay bot reviews
    if (!isBot || !BOT_REVIEWERS.includes(reviewer)) {
      return ctx.finalize('skipped', { status: 'skipped', reason: 'Not a bot review' });
    }

    // Only relay CHANGES_REQUESTED or COMMENTED (not APPROVED)
    if (reviewState === 'APPROVED') {
      await step.sendEvent('emit-merge-eval', {
        name: 'pipeline/merge.evaluate',
        data: { prNumber, repo },
      });
      return ctx.finalize('approved', { status: 'approved', prNumber });
    }

    // Check relay limit
    const relayCount = await step.run('check-relay-limit', async () => {
      return github.countFixAttempts(prNumber, /Review feedback relay #\d/);
    });

    if (relayCount >= MAX_RELAY_ROUNDS) {
      return ctx.finalize('relay-limit-reached', {
        status: 'relay-limit-reached',
        rounds: relayCount,
      });
    }

    // Collect inline comments
    const feedback = await step.run('collect-feedback', async () => {
      const comments = await github.getPRReviewComments(prNumber);
      const latestReview = comments.find((c) => c.reviewer === reviewer);

      const feedbackText = [
        `## Review Feedback (Round ${relayCount + 1})`,
        '',
        reviewBody,
        '',
        ...(latestReview?.inlineComments.map(
          (c) => `**${c.path}:${c.line}** — ${c.body}`
        ) ?? []),
      ].join('\n');

      return feedbackText;
    });

    // Transition to fix-reviews
    const issueNumber = await step.run('get-issue', async () => {
      return github.getLinkedIssueFromPR(prNumber);
    });

    if (issueNumber) {
      await step.run('transition-fix-reviews', async () => {
        try {
          await stateMachine.transition(issueNumber, 'fix-reviews');
        } catch {
          // Non-fatal
        }
      });
    }

    // Dispatch review fix
    await step.sendEvent('emit-review-fix', {
      name: 'pipeline/review.fix-requested',
      data: {
        prNumber,
        issueNumber: issueNumber ?? prNumber,
        branch: '',
        feedback,
        repo,
      },
    });

    return ctx.finalize('relayed', {
      status: 'relayed',
      round: relayCount + 1,
      prNumber,
    });
  }
);

// ─── Review Fix Handler ──────────────────────────────────────────────────────

export const reviewFix = inngest.createFunction(
  {
    id: 'review-fix',
    name: 'Apply Review Fixes',
    retries: 1,
    concurrency: [{ limit: 1, key: 'event.data.prNumber' }],
  },
  { event: 'pipeline/review.fix-requested' },
  async ({ event, step }) => {
    const { prNumber, issueNumber, feedback, repo } = event.data;
    const token = process.env['GH_PAT'] ?? process.env['GITHUB_TOKEN'] ?? '';
    const rawGithub = new GitHubClient({ token, repo });
    const ctx = createShadowContext(rawGithub, 'review-fix', event.name);
    const github = ctx.github;
    const preferredAgent = process.env['PREFERRED_AGENT'] ?? 'claude';

    // Step 1: Trigger agent to fix review feedback
    await step.run('trigger-fix', async () => {
      await github.commentOnIssue(
        prNumber,
        `@${preferredAgent} Fix the following review feedback:\n\n${feedback}\n\nAfter fixing, run \`pnpm typecheck\`, \`pnpm test\`, and \`pnpm e2e\` before pushing.`
      );
    });

    // Step 2: Resolve all review threads
    await step.run('resolve-threads', async () => {
      await github.resolveAllThreads(prNumber);
    });

    // Step 3: Wait for agent to push fixes, then trigger verify
    await step.sleep('wait-for-agent-fix', '3m');

    // Step 4: Dispatch verify-and-fix for the fixed code
    await step.sendEvent('emit-verify', {
      name: 'pipeline/verify.requested',
      data: {
        branch: '',
        workBranch: '',
        issueNumber,
        checks: 'all' as const,
        fixEnabled: true,
        maxAttempts: 3,
        attempt: 1,
        mergeInto: '',
        createPr: false,
        fixContext: 'Review feedback addressed',
        repo,
      },
    });

    return ctx.finalize('fix-dispatched', { status: 'fix-dispatched', prNumber });
  }
);
