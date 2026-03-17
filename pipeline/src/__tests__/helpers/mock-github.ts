/**
 * Mock GitHubClient for integration testing.
 *
 * Provides a fully configurable mock that records all API calls and
 * returns preset data. Tests configure the mock's state, then verify
 * the function made the correct API calls in the correct order.
 */

import { vi } from 'vitest';
import type { GitHubClient } from '../../lib/github.js';
import type { CIStatus, ReviewFeedback } from '../../types.js';

export interface MockGitHubState {
  /** Map of issue number → labels */
  issueLabels: Map<number, string[]>;
  /** Map of issue number → comments posted */
  issueComments: Map<number, Array<{ id: number; body: string }>>;
  /** Map of PR number → PR data */
  prs: Map<
    number,
    {
      number: number;
      body: string;
      head: { sha: string; ref: string };
      updated_at: string;
      merged: boolean;
    }
  >;
  /** CI status to return for checkCIStatus */
  ciStatus: CIStatus;
  /** Number of approvals to return */
  approvalCount: number;
  /** Unresolved thread count */
  unresolvedThreads: number;
  /** Branch comparison result */
  branchComparison: 'ahead' | 'behind' | 'diverged' | 'identical';
  /** Next pending story number (or null) */
  nextPendingStory: number | null;
  /** Open PRs list */
  openPRs: Array<{
    number: number;
    head: { sha: string; ref: string };
    updated_at: string;
  }>;
  /** Review feedback to return */
  reviewFeedback: ReviewFeedback[];
  /** Critical comment count */
  criticalComments: number;
  /** Fix attempt count */
  fixAttemptCount: number;
  /** Active workflow run count */
  activeWorkflowRuns: number;
  /** Head SHA for branches */
  headSha: string;
}

export interface MockGitHubCallLog {
  method: string;
  args: unknown[];
}

export function createMockGitHub(
  overrides: Partial<MockGitHubState> = {}
): { client: GitHubClient; state: MockGitHubState; calls: MockGitHubCallLog[] } {
  const state: MockGitHubState = {
    issueLabels: new Map(),
    issueComments: new Map(),
    prs: new Map(),
    ciStatus: { testsPass: true, e2ePass: true, androidBuildPass: true },
    approvalCount: 1,
    unresolvedThreads: 0,
    branchComparison: 'ahead',
    nextPendingStory: null,
    openPRs: [],
    reviewFeedback: [],
    criticalComments: 0,
    fixAttemptCount: 0,
    activeWorkflowRuns: 0,
    headSha: 'abc1234567890',
    ...overrides,
  };

  const calls: MockGitHubCallLog[] = [];

  function log(method: string, ...args: unknown[]) {
    calls.push({ method, args });
  }

  let commentIdCounter = 1000;

  const client = {
    owner: 'test-owner',
    repo: 'test-repo',

    checkCIStatus: vi.fn(async (sha: string) => {
      log('checkCIStatus', sha);
      return state.ciStatus;
    }),

    countApprovals: vi.fn(async (prNumber: number) => {
      log('countApprovals', prNumber);
      return state.approvalCount;
    }),

    countUnresolvedThreads: vi.fn(async (prNumber: number) => {
      log('countUnresolvedThreads', prNumber);
      return state.unresolvedThreads;
    }),

    resolveAllThreads: vi.fn(async (prNumber: number) => {
      log('resolveAllThreads', prNumber);
      state.unresolvedThreads = 0;
      return state.unresolvedThreads;
    }),

    getPR: vi.fn(async (prNumber: number) => {
      log('getPR', prNumber);
      return (
        state.prs.get(prNumber) ?? {
          number: prNumber,
          body: `Closes #${prNumber + 100}`,
          head: { sha: state.headSha, ref: `claude/issue-${prNumber}` },
          updated_at: new Date().toISOString(),
          merged: false,
        }
      );
    }),

    mergePR: vi.fn(async (prNumber: number, method?: string) => {
      log('mergePR', prNumber, method);
    }),

    updateBranch: vi.fn(async (prNumber: number) => {
      log('updateBranch', prNumber);
    }),

    approvePR: vi.fn(async (prNumber: number, body: string) => {
      log('approvePR', prNumber, body);
      state.approvalCount++;
    }),

    getLinkedIssueFromPR: vi.fn(async (prNumber: number) => {
      log('getLinkedIssueFromPR', prNumber);
      const pr = state.prs.get(prNumber);
      const body = pr?.body ?? `Closes #${prNumber + 100}`;
      const match = body.match(/Closes\s+#(\d+)/i);
      return match ? parseInt(match[1], 10) : null;
    }),

    commentOnIssue: vi.fn(async (issueNumber: number, body: string) => {
      log('commentOnIssue', issueNumber, body);
      const existing = state.issueComments.get(issueNumber) ?? [];
      existing.push({ id: commentIdCounter++, body });
      state.issueComments.set(issueNumber, existing);
    }),

    getIssueComments: vi.fn(async (issueNumber: number) => {
      log('getIssueComments', issueNumber);
      return state.issueComments.get(issueNumber) ?? [];
    }),

    updateComment: vi.fn(async (commentId: number, body: string) => {
      log('updateComment', commentId, body);
    }),

    getIssue: vi.fn(async (issueNumber: number) => {
      log('getIssue', issueNumber);
      return {
        number: issueNumber,
        labels: (state.issueLabels.get(issueNumber) ?? []).map((name) => ({
          name,
        })),
      };
    }),

    getIssueLabels: vi.fn(async (issueNumber: number) => {
      log('getIssueLabels', issueNumber);
      return state.issueLabels.get(issueNumber) ?? [];
    }),

    addLabels: vi.fn(async (issueNumber: number, labels: string[]) => {
      log('addLabels', issueNumber, labels);
      const existing = state.issueLabels.get(issueNumber) ?? [];
      state.issueLabels.set(issueNumber, [...existing, ...labels]);
    }),

    removeLabel: vi.fn(async (issueNumber: number, label: string) => {
      log('removeLabel', issueNumber, label);
      const existing = state.issueLabels.get(issueNumber) ?? [];
      state.issueLabels.set(
        issueNumber,
        existing.filter((l) => l !== label)
      );
    }),

    closeIssue: vi.fn(async (issueNumber: number) => {
      log('closeIssue', issueNumber);
    }),

    getNextPendingStory: vi.fn(async (_epicLabel: string) => {
      log('getNextPendingStory', _epicLabel);
      return state.nextPendingStory;
    }),

    getPRReviewComments: vi.fn(async (prNumber: number) => {
      log('getPRReviewComments', prNumber);
      return state.reviewFeedback;
    }),

    countCriticalComments: vi.fn(async (prNumber: number) => {
      log('countCriticalComments', prNumber);
      return state.criticalComments;
    }),

    isWorkflowActive: vi.fn(async (_file: string, _issue: number) => {
      log('isWorkflowActive', _file, _issue);
      return false;
    }),

    countActiveWorkflowRuns: vi.fn(async (_file: string) => {
      log('countActiveWorkflowRuns', _file);
      return state.activeWorkflowRuns;
    }),

    countFixAttempts: vi.fn(async (_issue: number, _pattern: RegExp) => {
      log('countFixAttempts', _issue, _pattern);
      return state.fixAttemptCount;
    }),

    listOpenPRs: vi.fn(async (_prefix?: string) => {
      log('listOpenPRs', _prefix);
      return state.openPRs;
    }),

    compareBranches: vi.fn(async (_base: string, _head: string) => {
      log('compareBranches', _base, _head);
      return state.branchComparison;
    }),

    getHeadSha: vi.fn(async (_branch: string) => {
      log('getHeadSha', _branch);
      return state.headSha;
    }),

    dispatchWorkflow: vi.fn(
      async (_file: string, _branch: string, _inputs?: Record<string, string>) => {
        log('dispatchWorkflow', _file, _branch, _inputs);
      }
    ),

    triggerStoryAgent: vi.fn(
      async (_issue: number, _agent?: string, _suffix?: string) => {
        log('triggerStoryAgent', _issue, _agent, _suffix);
      }
    ),
  } as unknown as GitHubClient;

  return { client, state, calls };
}
