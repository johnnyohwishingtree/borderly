import { describe, it, expect, vi } from 'vitest';
import { evaluateMergeGate } from '../../lib/merge-gate.js';
import type { GitHubClient } from '../../lib/github.js';

function createMockGitHub(
  overrides: Partial<{
    testsPass: boolean;
    e2ePass: boolean;
    androidBuildPass: boolean;
    approvals: number;
    unresolvedThreads: number;
    branchStatus: 'ahead' | 'behind' | 'diverged' | 'identical';
  }> = {}
): GitHubClient {
  const defaults = {
    testsPass: true,
    e2ePass: true,
    androidBuildPass: true,
    approvals: 1,
    unresolvedThreads: 0,
    branchStatus: 'ahead' as const,
  };
  const config = { ...defaults, ...overrides };

  return {
    getPR: vi.fn().mockResolvedValue({
      head: { sha: 'abc123', ref: 'claude/issue-42' },
    }),
    checkCIStatus: vi.fn().mockResolvedValue({
      testsPass: config.testsPass,
      e2ePass: config.e2ePass,
      androidBuildPass: config.androidBuildPass,
    }),
    countApprovals: vi.fn().mockResolvedValue(config.approvals),
    countUnresolvedThreads: vi
      .fn()
      .mockResolvedValue(config.unresolvedThreads),
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
      androidBuildPass: true,
      approved: true,
      threadsResolved: true,
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

  it('returns "wait" when multiple conditions fail', async () => {
    const github = createMockGitHub({
      testsPass: false,
      approvals: 0,
      branchStatus: 'behind',
    });
    const result = await evaluateMergeGate(github, 42);

    expect(result.action).toBe('wait');
    expect(result.failingConditions).toContain('testsPass');
    expect(result.failingConditions).toContain('approved');
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
});
