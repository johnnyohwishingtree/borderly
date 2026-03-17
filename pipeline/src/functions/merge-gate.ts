/**
 * Merge Gate — Inngest port of auto-merge.yml + evaluate-merge-gate.sh
 *
 * Evaluates 6 merge conditions and takes action:
 * - All pass + up to date → merge (squash)
 * - All pass + behind → update branch
 * - Any fail → wait (re-evaluated on next event)
 */

import { inngest } from '../inngest.js';
import { GitHubClient } from '../lib/github.js';
import { PipelineStateMachine } from '../lib/state-machine.js';
import { createShadowContext } from '../lib/shadow-context.js';
import type { MergeGateResult } from '../types.js';

export async function evaluateMergeGate(
  github: GitHubClient,
  prNumber: number
): Promise<MergeGateResult> {
  const pr = await github.getPR(prNumber);
  const sha = pr.head.sha;

  // Condition 1-3: CI status
  const ci = await github.checkCIStatus(sha);

  // Condition 4: Approved
  const approvals = await github.countApprovals(prNumber);
  const approved = approvals >= 1;

  // Condition 5: All review threads resolved
  const unresolvedThreads = await github.countUnresolvedThreads(prNumber);
  const threadsResolved = unresolvedThreads === 0;

  // Condition 6: Branch up to date with master
  const comparison = await github.compareBranches('master', pr.head.ref);
  const branchUpToDate = comparison !== 'behind' && comparison !== 'diverged';

  const conditions = {
    testsPass: ci.testsPass,
    e2ePass: ci.e2ePass,
    androidBuildPass: ci.androidBuildPass,
    approved,
    threadsResolved,
    branchUpToDate,
  };

  const failingConditions = Object.entries(conditions)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  const allConditionsMet = failingConditions.length === 0;
  const allExceptBranch =
    failingConditions.length === 1 &&
    failingConditions[0] === 'branchUpToDate';

  let action: MergeGateResult['action'];
  if (allConditionsMet) {
    action = 'merge';
  } else if (allExceptBranch) {
    action = 'update_branch';
  } else {
    action = 'wait';
  }

  return { action, conditions, failingConditions };
}

export const mergeGate = inngest.createFunction(
  {
    id: 'merge-gate',
    name: 'Merge Gate Evaluator',
    retries: 2,
    debounce: { period: '30s', key: 'event.data.prNumber' },
  },
  [
    { event: 'pipeline/merge.evaluate' },
    { event: 'pipeline/ci.completed' },
  ],
  async ({ event, step }) => {
    const prNumber = event.data.prNumber;
    const repo = event.data.repo;
    const token = process.env['GH_PAT'] ?? process.env['GITHUB_TOKEN'] ?? '';
    const rawGithub = new GitHubClient({ token, repo });
    const ctx = createShadowContext(rawGithub, 'merge-gate', event.name);
    const github = ctx.github;
    const stateMachine = new PipelineStateMachine(github);

    // Step 1: Evaluate all merge conditions
    const result = await step.run('evaluate-conditions', async () => {
      return evaluateMergeGate(github, prNumber);
    });

    // Step 2: Take action based on evaluation
    switch (result.action) {
      case 'merge': {
        // Transition state to merging
        const issueNumber = await step.run('get-linked-issue', async () => {
          return github.getLinkedIssueFromPR(prNumber);
        });

        if (issueNumber) {
          await step.run('transition-merging', async () => {
            try {
              await stateMachine.transition(issueNumber, 'merging');
            } catch {
              // Non-fatal
            }
          });
        }

        // Merge the PR
        await step.run('merge-pr', async () => {
          await github.mergePR(prNumber, 'squash');
        });

        // Update state to merged
        if (issueNumber) {
          await step.run('transition-merged', async () => {
            try {
              await stateMachine.transition(issueNumber, 'merged');
            } catch {
              // Non-fatal
            }
          });
        }

        // Emit PR merged event to trigger story lifecycle
        await step.sendEvent('emit-pr-merged', {
          name: 'pipeline/pr.merged',
          data: {
            prNumber,
            headBranch: '',
            mergedBy: 'auto-merge',
            repo,
          },
        });

        return ctx.finalize('merge', { action: 'merged', prNumber }, result.conditions);
      }

      case 'update_branch': {
        await step.run('update-branch', async () => {
          await github.updateBranch(prNumber);
        });

        // Re-evaluate after branch update (CI will re-run)
        return ctx.finalize('update_branch', {
          action: 'updated_branch',
          prNumber,
          note: 'Will re-evaluate when CI completes',
        }, result.conditions);
      }

      case 'wait': {
        return ctx.finalize('wait', {
          action: 'waiting',
          prNumber,
          failingConditions: result.failingConditions,
        }, result.conditions);
      }
    }
  }
);
