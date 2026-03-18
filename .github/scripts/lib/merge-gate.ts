/**
 * Merge gate evaluator — TypeScript port of evaluate-merge-gate.sh.
 *
 * Evaluates 6 merge conditions and returns an action:
 * - All pass + up to date → merge (squash)
 * - All pass + behind → update branch
 * - Any fail → wait (re-evaluated on next event)
 * - PR doesn't target master → skip
 */

import { GitHubClient } from './github.js';
import type { MergeGateResult } from './types.js';

export async function evaluateMergeGate(
  github: GitHubClient,
  prNumber: number
): Promise<MergeGateResult> {
  const pr = await github.getPR(prNumber);
  const sha = pr.head.sha;

  // Condition 1-2: CI status
  const ci = await github.checkCIStatus(sha);

  // Condition 3: Approved
  const approvals = await github.countApprovals(prNumber);
  const approved = approvals >= 1;

  // Condition 4: All review threads resolved
  const unresolvedThreads = await github.countUnresolvedThreads(prNumber);
  const threadsResolved = unresolvedThreads === 0;

  // Condition 5: No active review-fix runs
  const noActiveReviewFix = !(await github.isWorkflowActive(
    'review-fix.yml',
    prNumber
  ));

  // Condition 6: Branch up to date with master
  const comparison = await github.compareBranches('master', pr.head.ref);
  const branchUpToDate = comparison !== 'behind' && comparison !== 'diverged';

  const conditions = {
    testsPass: ci.testsPass,
    e2ePass: ci.e2ePass,
    approved,
    threadsResolved,
    noActiveReviewFix,
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
