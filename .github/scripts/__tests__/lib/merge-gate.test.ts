import { describe, it, expect, vi } from 'vitest';
import { evaluateMergeGate } from '../../lib/merge-gate.js';
import type { GitHubClient } from '../../lib/github.js';

function createMockGitHub(
  overrides: Partial<{
    testsPass: boolean;
    e2ePass: boolean;
    approvals: number;
    reviews: number;
    unresolvedThreads: number;
    reviewFixActive: boolean;
    branchStatus: 'ahead' | 'behind' | 'diverged' | 'identical';
    mergeableState: string;
    comments: { body: string }[];
  }> = {}
): GitHubClient {
  const defaults = {
    testsPass: true,
    e2ePass: true,
    approvals: 1,
    reviews: 1,
    unresolvedThreads: 0,
    reviewFixActive: false,
    branchStatus: 'ahead' as const,
    mergeableState: 'clean',
    comments: [] as { body: string }[],
  };
  const config = { ...defaults, ...overrides };

  return {
    owner: 'testowner',
    getPR: vi.fn().mockResolvedValue({
      head: { sha: 'abc123', ref: 'claude/issue-42' },
      user: { login: 'bot-user' },
      mergeable_state: config.mergeableState,
    }),
    checkCIStatus: vi.fn().mockResolvedValue({
      testsPass: config.testsPass,
      e2ePass: config.e2ePass,
    }),
    countApprovals: vi.fn().mockResolvedValue(config.approvals),
    countReviews: vi.fn().mockResolvedValue(config.reviews),
    countUnresolvedThreads: vi
      .fn()
      .mockResolvedValue(config.unresolvedThreads),
    getIssueLabels: vi.fn().mockResolvedValue([]),
    getIssueComments: vi.fn().mockResolvedValue(config.comments),
    isWorkflowActive: vi.fn().mockResolvedValue(config.reviewFixActive),
    compareBranches: vi.fn().mockResolvedValue(config.branchStatus),
  } as unknown as GitHubClient;
}

describe('evaluateMergeGate', () => {
  it('returns "merge" when all conditions pass', async () => {
    const github = createMockGitHub();
    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('merge');
    expect(result.failingConditions).toHaveLength(0);
    expect(result.conditions).toEqual({
      testsPass: true,
      e2ePass: true,
      reviewed: true,
      approved: true,
      threadsResolved: true,
      noActiveReviewFix: true,
      noReviewInProgress: true,
      branchUpToDate: true,
    });
  });

  it('returns "update_branch" when only branch is behind', async () => {
    const github = createMockGitHub({ branchStatus: 'behind' });
    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('update_branch');
    expect(result.failingConditions).toEqual(['branchUpToDate']);
  });

  it('returns "wait" when tests fail', async () => {
    const github = createMockGitHub({ testsPass: false });
    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('wait');
    expect(result.failingConditions).toContain('testsPass');
  });

  it('returns "wait" when e2e fails', async () => {
    const github = createMockGitHub({ e2ePass: false });
    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('wait');
    expect(result.failingConditions).toContain('e2ePass');
  });

  it('returns "wait" when no approvals', async () => {
    const github = createMockGitHub({ approvals: 0 });
    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('wait');
    expect(result.failingConditions).toContain('approved');
  });

  it('returns "wait" when unresolved threads exist', async () => {
    const github = createMockGitHub({ unresolvedThreads: 3 });
    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('wait');
    expect(result.failingConditions).toContain('threadsResolved');
  });

  it('returns "wait" when review-fix is active', async () => {
    const github = createMockGitHub({ reviewFixActive: true });
    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('wait');
    expect(result.failingConditions).toContain('noActiveReviewFix');
  });

  it('returns "wait" when multiple conditions fail but branch is up to date', async () => {
    const github = createMockGitHub({
      testsPass: false,
      approvals: 0,
    });
    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('wait');
    expect(result.failingConditions).toContain('testsPass');
    expect(result.failingConditions).toContain('approved');
  });

  // Bug (#574): PR behind master with no CI checks → gate returned "wait"
  // instead of "update_branch". updateBranch triggers pull_request synchronize
  // which attaches CI checks. Without it, the PR sits in limbo — can't pass
  // tests without updating, can't update without passing tests.
  it('returns "update_branch" when behind master even if CI has not run', async () => {
    const github = createMockGitHub({
      testsPass: false,
      e2ePass: false,
      branchStatus: 'behind',
    });
    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('update_branch');
    expect(result.failingConditions).toContain('branchUpToDate');
  });

  it('returns "merge" when branch is identical (up to date)', async () => {
    const github = createMockGitHub({ branchStatus: 'identical' });
    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('merge');
  });

  it('returns "update_branch" when branch is diverged', async () => {
    const github = createMockGitHub({ branchStatus: 'diverged' });
    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('update_branch');
    expect(result.failingConditions).toEqual(['branchUpToDate']);
  });

  it('returns "merge" when PR author is repo owner and no formal approval exists', async () => {
    // In personal repos, GITHUB_TOKEN and GH_PAT both belong to the owner,
    // so neither can approve the owner's own PR. The merge gate should treat
    // owner-authored PRs as implicitly approved.
    const github = createMockGitHub({ approvals: 0 });
    // Override getPR to return owner as author
    (github.getPR as ReturnType<typeof vi.fn>).mockResolvedValue({
      head: { sha: 'abc123', ref: 'feat/my-feature' },
      user: { login: 'testowner' },
    });
    // github.owner is 'testowner' (from createMockGitHub's repo split)

    const result = await evaluateMergeGate(github, 42);

    // Should merge — owner's PR is implicitly approved (and has a review)
    expect(result.action).toBe('merge');
    expect(result.conditions.approved).toBe(true);
    expect(result.failingConditions).not.toContain('approved');
  });

  // Bug (#579): PR merged before any code review happened. The owner-approval
  // bypass skipped the review requirement entirely. Auto-merge should wait
  // until at least one formal review (COMMENTED/CHANGES_REQUESTED/APPROVED)
  // has been submitted, even on owner PRs.
  it('returns "wait" when no reviews exist, even with owner-approval', async () => {
    const github = createMockGitHub({ approvals: 0, reviews: 0 });
    (github.getPR as ReturnType<typeof vi.fn>).mockResolvedValue({
      head: { sha: 'abc123', ref: 'fix/something' },
      user: { login: 'testowner' },
    });

    const result = await evaluateMergeGate(github, 42);

    expect(result.action).not.toBe('merge');
    expect(result.conditions.reviewed).toBe(false);
    expect(result.failingConditions).toContain('reviewed');
  });

  it('returns "merge" when owner PR has at least one review', async () => {
    const github = createMockGitHub({ approvals: 0, reviews: 1 });
    (github.getPR as ReturnType<typeof vi.fn>).mockResolvedValue({
      head: { sha: 'abc123', ref: 'fix/something' },
      user: { login: 'testowner' },
    });

    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('merge');
    expect(result.conditions.reviewed).toBe(true);
  });

  // Bug (#684): PR merged while a code review was still in progress.
  // Claude posts a "Code Review in Progress" checklist comment at the start
  // of a review. The merge gate should wait until that review completes
  // (the comment is edited to remove the "in Progress" marker).
  it('returns "wait" when a code review is in progress', async () => {
    const github = createMockGitHub({
      comments: [
        { body: '### Code Review in Progress\n\n- [ ] Read core files\n- [ ] Review changes' },
      ],
    });

    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('wait');
    expect(result.failingConditions).toContain('noReviewInProgress');
  });

  it('returns "merge" when code review has completed (no in-progress marker)', async () => {
    const github = createMockGitHub({
      comments: [
        { body: '### Code Review Complete\n\nLooks good!' },
      ],
    });

    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('merge');
  });

  it('returns "merge" when no comments exist at all', async () => {
    const github = createMockGitHub({ comments: [] });

    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('merge');
  });

  // Bug (#721): PR stuck in loop — auto-merge returned update_branch but
  // GitHub's update-branch API silently fails on content conflicts. The PR
  // stayed CONFLICTING and auto-merge kept retrying update_branch forever.
  it('returns "resolve_conflicts" when branch is behind and has merge conflicts', async () => {
    const github = createMockGitHub({ branchStatus: 'behind', mergeableState: 'dirty' });
    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('resolve_conflicts');
  });

  it('returns "resolve_conflicts" when multiple conditions fail and PR has conflicts', async () => {
    const github = createMockGitHub({
      testsPass: false,
      branchStatus: 'diverged',
      mergeableState: 'dirty',
    });
    const result = await evaluateMergeGate(github, 42);

    // Conflicts take priority over update_branch — resolve them first
    expect(result.action).toBe('resolve_conflicts');
  });

  it('returns "update_branch" when behind but no conflicts', async () => {
    const github = createMockGitHub({ branchStatus: 'behind', mergeableState: 'clean' });
    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('update_branch');
  });
});
