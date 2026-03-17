/**
 * Parity logger — records Inngest function decisions for comparison
 * against the old GitHub Actions workflows during parallel run.
 *
 * In shadow mode, functions evaluate conditions and record decisions
 * but skip all write actions (merge, comment, label changes, etc.).
 * Results are posted to a dedicated GitHub issue for review.
 */

import { GitHubClient } from './github.js';

export type ActionType =
  | 'merge_pr'
  | 'update_branch'
  | 'close_issue'
  | 'add_labels'
  | 'remove_label'
  | 'comment'
  | 'approve_pr'
  | 'trigger_agent'
  | 'dispatch_workflow'
  | 'resolve_threads'
  | 'transition_state'
  | 'send_event'
  | 'sleep';

export interface ParityAction {
  type: ActionType;
  target: string; // e.g., "PR #42", "issue #100"
  detail: string; // e.g., "squash merge", "add label completed"
}

export interface ParityRecord {
  functionId: string;
  event: string;
  timestamp: string;
  decision: string; // e.g., "merge", "wait", "triggered"
  actions: ParityAction[];
  conditions?: Record<string, unknown>;
}

/**
 * Returns true if shadow mode is enabled.
 * In shadow mode, Inngest functions observe but don't act.
 */
export function isShadowMode(): boolean {
  return process.env['INNGEST_SHADOW_MODE'] === 'true';
}

/**
 * Records a parity decision. In shadow mode, posts the decision
 * to the parity tracking issue. In live mode, this is a no-op.
 */
export async function recordParity(
  github: GitHubClient,
  record: ParityRecord
): Promise<void> {
  const issueNumber = parseInt(
    process.env['PARITY_TRACKING_ISSUE'] ?? '0',
    10
  );
  if (!issueNumber) return;

  const actionsTable = record.actions
    .map((a) => `| \`${a.type}\` | ${a.target} | ${a.detail} |`)
    .join('\n');

  const conditionsBlock = record.conditions
    ? `\n<details><summary>Conditions</summary>\n\n\`\`\`json\n${JSON.stringify(record.conditions, null, 2)}\n\`\`\`\n</details>`
    : '';

  const body = [
    `### ${isShadowMode() ? '👻 Shadow' : '✅ Live'}: \`${record.functionId}\``,
    '',
    `**Event:** \`${record.event}\``,
    `**Decision:** \`${record.decision}\``,
    `**Time:** ${record.timestamp}`,
    '',
    '| Action | Target | Detail |',
    '|--------|--------|--------|',
    actionsTable || '| _(none)_ | — | — |',
    conditionsBlock,
  ].join('\n');

  try {
    await github.commentOnIssue(issueNumber, body);
  } catch {
    // Non-fatal — don't break function execution if logging fails
    console.error(`[parity] Failed to log to issue #${issueNumber}`);
  }
}

/**
 * Creates a GitHubClient wrapper that records actions instead of executing
 * them when in shadow mode. Read-only operations pass through; write
 * operations are intercepted and logged.
 */
export function wrapForShadow(
  github: GitHubClient,
  actions: ParityAction[]
): GitHubClient {
  if (!isShadowMode()) return github;

  // Create a proxy that intercepts write methods
  return new Proxy(github, {
    get(target, prop: string) {
      const original = target[prop as keyof GitHubClient];

      // Read-only methods — pass through
      const readMethods = [
        'checkCIStatus',
        'countApprovals',
        'countUnresolvedThreads',
        'getPR',
        'getLinkedIssueFromPR',
        'getIssueComments',
        'getIssue',
        'getIssueLabels',
        'getNextPendingStory',
        'getPRReviewComments',
        'countCriticalComments',
        'isWorkflowActive',
        'countActiveWorkflowRuns',
        'countFixAttempts',
        'listOpenPRs',
        'compareBranches',
        'getHeadSha',
      ];

      if (readMethods.includes(prop)) {
        return original;
      }

      // Write methods — record and skip
      const writeMethodMap: Record<string, (args: unknown[]) => ParityAction> = {
        mergePR: (args) => ({
          type: 'merge_pr',
          target: `PR #${args[0]}`,
          detail: `method: ${args[1] ?? 'squash'}`,
        }),
        updateBranch: (args) => ({
          type: 'update_branch',
          target: `PR #${args[0]}`,
          detail: 'update with master',
        }),
        approvePR: (args) => ({
          type: 'approve_pr',
          target: `PR #${args[0]}`,
          detail: String(args[1] ?? '').slice(0, 100),
        }),
        closeIssue: (args) => ({
          type: 'close_issue',
          target: `issue #${args[0]}`,
          detail: 'close',
        }),
        addLabels: (args) => ({
          type: 'add_labels',
          target: `issue #${args[0]}`,
          detail: `labels: ${(args[1] as string[]).join(', ')}`,
        }),
        removeLabel: (args) => ({
          type: 'remove_label',
          target: `issue #${args[0]}`,
          detail: `label: ${args[1]}`,
        }),
        commentOnIssue: (args) => ({
          type: 'comment',
          target: `issue #${args[0]}`,
          detail: String(args[1] ?? '').slice(0, 100),
        }),
        updateComment: (args) => ({
          type: 'comment',
          target: `comment #${args[0]}`,
          detail: String(args[1] ?? '').slice(0, 100),
        }),
        triggerStoryAgent: (args) => ({
          type: 'trigger_agent',
          target: `issue #${args[0]}`,
          detail: `agent: ${args[1] ?? 'claude'}`,
        }),
        dispatchWorkflow: (args) => ({
          type: 'dispatch_workflow',
          target: String(args[0]),
          detail: `branch: ${args[1]}`,
        }),
        resolveAllThreads: (args) => ({
          type: 'resolve_threads',
          target: `PR #${args[0]}`,
          detail: 'resolve all',
        }),
      };

      if (prop in writeMethodMap) {
        return (...args: unknown[]) => {
          actions.push(writeMethodMap[prop](args));
          return Promise.resolve();
        };
      }

      return original;
    },
  });
}
