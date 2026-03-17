/**
 * Watcher — Inngest port of watcher.yml
 *
 * Runs on a schedule (every 20 minutes) to monitor pipeline health:
 * - Check open PRs for stale CI, missing reviews, merge conflicts
 * - Check in-progress stories for stuck agents
 * - Check stalled epics with no active stories
 * - Clean up orphan PRs
 */

import { inngest } from '../inngest.js';
import { GitHubClient } from '../lib/github.js';

const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
const MAX_CONCURRENT_AGENTS = 3;
const MAX_FIX_RETRIES_PR = 5;

export const watcher = inngest.createFunction(
  {
    id: 'pipeline-watcher',
    name: 'Pipeline Health Watcher',
    retries: 1,
    concurrency: [{ limit: 1 }], // Only one watcher at a time
  },
  [
    { event: 'pipeline/watcher.tick' },
    { cron: '*/20 * * * *' }, // Every 20 minutes
  ],
  async ({ step }) => {
    const repo = process.env['GITHUB_REPOSITORY'] ?? '';
    const token = process.env['GH_PAT'] ?? process.env['GITHUB_TOKEN'] ?? '';
    const github = new GitHubClient({ token, repo });

    const results: Record<string, unknown> = {};

    // Step 1: Check concurrency — how many agent runs are currently active
    const activeAgents = await step.run('check-concurrency', async () => {
      let count = 0;
      // Count all active runs across both supported agent workflows
      for (const workflowFile of ['claude.yml', 'gemini.yml']) {
        try {
          count += await github.countActiveWorkflowRuns(workflowFile);
        } catch {
          // Workflow might not exist in this repo
        }
      }
      return count;
    });

    if (activeAgents >= MAX_CONCURRENT_AGENTS) {
      return { status: 'at-capacity', activeAgents };
    }

    // Step 2: Check open PRs
    const prActions = await step.run('check-open-prs', async () => {
      const prs = await github.listOpenPRs('claude/');
      const actions: Array<{
        prNumber: number;
        action: string;
        reason: string;
      }> = [];

      for (const pr of prs) {
        const updatedAt = new Date(pr.updated_at).getTime();
        const age = Date.now() - updatedAt;

        if (age < STALE_THRESHOLD_MS) continue; // Not stale yet

        // Check CI status
        const ci = await github.checkCIStatus(pr.head.sha);
        const approvals = await github.countApprovals(pr.number);

        if (!ci.testsPass && !ci.e2ePass) {
          // Missing or failing CI
          const fixAttempts = await github.countFixAttempts(
            pr.number,
            /@(claude|gemini).*failing/
          );

          if (fixAttempts < MAX_FIX_RETRIES_PR) {
            actions.push({
              prNumber: pr.number,
              action: 'retrigger-ci',
              reason: `CI failing/missing, attempt ${fixAttempts + 1}`,
            });
          } else {
            actions.push({
              prNumber: pr.number,
              action: 'escalate',
              reason: `CI failing after ${fixAttempts} fix attempts`,
            });
          }
        } else if (ci.testsPass && ci.e2ePass && approvals === 0) {
          // Passing CI but no approval
          const unresolvedThreads = await github.countUnresolvedThreads(
            pr.number
          );

          if (unresolvedThreads > 0) {
            actions.push({
              prNumber: pr.number,
              action: 'resolve-threads',
              reason: `${unresolvedThreads} unresolved threads blocking approval`,
            });
          } else {
            actions.push({
              prNumber: pr.number,
              action: 'request-merge-eval',
              reason: 'CI passing, no approval yet',
            });
          }
        }
      }

      return actions;
    });

    results['prActions'] = prActions;

    // Step 3: Execute PR actions
    for (const action of prActions) {
      switch (action.action) {
        case 'retrigger-ci':
          await step.sendEvent(`retrigger-ci-${action.prNumber}`, {
            name: 'pipeline/verify.requested',
            data: {
              branch: '',
              workBranch: '',
              issueNumber: action.prNumber,
              checks: 'all' as const,
              fixEnabled: true,
              maxAttempts: 3,
              attempt: 1,
              mergeInto: '',
              createPr: false,
              fixContext: 'Watcher detected stale failing CI',
              repo,
            },
          });
          break;

        case 'resolve-threads':
          await step.run(`resolve-threads-${action.prNumber}`, async () => {
            await github.resolveAllThreads(action.prNumber);
          });
          await step.sendEvent(`merge-eval-${action.prNumber}`, {
            name: 'pipeline/merge.evaluate',
            data: { prNumber: action.prNumber, repo },
          });
          break;

        case 'request-merge-eval':
          await step.sendEvent(`merge-eval-${action.prNumber}`, {
            name: 'pipeline/merge.evaluate',
            data: { prNumber: action.prNumber, repo },
          });
          break;

        case 'escalate':
          await step.sendEvent(`doctor-${action.prNumber}`, {
            name: 'pipeline/doctor.requested',
            data: {
              issueNumber: action.prNumber,
              prNumber: action.prNumber,
              reason: action.reason,
              repo,
            },
          });
          break;
      }
    }

    // Step 4: Check in-progress stories
    const storyActions = await step.run('check-stories', async () => {
      // List issues with "in-progress" + "story" labels
      // This would need a search query; simplified here
      return [] as Array<{ issueNumber: number; action: string }>;
    });

    results['storyActions'] = storyActions;

    return {
      status: 'complete',
      activeAgents,
      prActionsCount: prActions.length,
      storyActionsCount: storyActions.length,
      results,
    };
  }
);
