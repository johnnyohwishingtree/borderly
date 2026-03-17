/**
 * Integration tests for watcher function.
 *
 * Tests the scheduled health monitor:
 * - At capacity → return early
 * - Stale PRs with failing CI → retrigger
 * - Stale PRs with passing CI → request merge eval
 * - Stale PRs with unresolved threads → resolve + merge eval
 * - Stale PRs exceeding fix limit → escalate to doctor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockStep } from './helpers/mock-step.js';

const mockGithub = {
  countActiveWorkflowRuns: vi.fn(),
  listOpenPRs: vi.fn(),
  checkCIStatus: vi.fn(),
  countApprovals: vi.fn(),
  countUnresolvedThreads: vi.fn(),
  countFixAttempts: vi.fn(),
  resolveAllThreads: vi.fn(),
};

vi.mock('../lib/github.js', () => ({
  GitHubClient: vi.fn(() => mockGithub),
}));

const { watcher } = await import('../functions/watcher.js');

function getHandler() {
  return (watcher as unknown as { fn: (...args: unknown[]) => unknown }).fn;
}

describe('watcher integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['GITHUB_TOKEN'] = 'test-token';
    process.env['GITHUB_REPOSITORY'] = 'owner/repo';

    mockGithub.countActiveWorkflowRuns.mockResolvedValue(0);
    mockGithub.listOpenPRs.mockResolvedValue([]);
    mockGithub.checkCIStatus.mockResolvedValue({
      testsPass: true,
      e2ePass: true,
      androidBuildPass: true,
    });
    mockGithub.countApprovals.mockResolvedValue(0);
    mockGithub.countUnresolvedThreads.mockResolvedValue(0);
    mockGithub.countFixAttempts.mockResolvedValue(0);
    mockGithub.resolveAllThreads.mockResolvedValue(0);
  });

  it('returns at-capacity when too many active agents', async () => {
    mockGithub.countActiveWorkflowRuns.mockResolvedValue(3);

    const { step } = createMockStep();
    const result = await getHandler()({ step }) as Record<string, unknown>;

    expect(result['status']).toBe('at-capacity');
    expect(result['activeAgents']).toBe(6); // 3 per workflow × 2 workflows
  });

  it('returns complete with no actions when no stale PRs', async () => {
    const { step } = createMockStep();
    const result = await getHandler()({ step }) as Record<string, unknown>;

    expect(result['status']).toBe('complete');
    expect(result['prActionsCount']).toBe(0);
  });

  it('retriggers CI for stale PRs with failing tests', async () => {
    const fifteenMinAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    mockGithub.listOpenPRs.mockResolvedValue([
      { number: 42, head: { sha: 'abc123', ref: 'claude/issue-42' }, updated_at: fifteenMinAgo },
    ]);
    mockGithub.checkCIStatus.mockResolvedValue({
      testsPass: false,
      e2ePass: false,
      androidBuildPass: true,
    });

    const { step, context } = createMockStep();
    const result = await getHandler()({ step }) as Record<string, unknown>;

    expect(result['prActionsCount']).toBe(1);

    // Should emit verify.requested
    const verifyEvent = context.sentEvents.find((e) => e.name === 'pipeline/verify.requested');
    expect(verifyEvent).toBeDefined();
    expect(verifyEvent!.data['issueNumber']).toBe(42);
  });

  it('requests merge eval for stale PRs with passing CI but no approval', async () => {
    const fifteenMinAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    mockGithub.listOpenPRs.mockResolvedValue([
      { number: 42, head: { sha: 'abc123', ref: 'claude/issue-42' }, updated_at: fifteenMinAgo },
    ]);
    mockGithub.checkCIStatus.mockResolvedValue({
      testsPass: true,
      e2ePass: true,
      androidBuildPass: true,
    });
    mockGithub.countApprovals.mockResolvedValue(0);
    mockGithub.countUnresolvedThreads.mockResolvedValue(0);

    const { step, context } = createMockStep();
    const result = await getHandler()({ step }) as Record<string, unknown>;

    expect(result['prActionsCount']).toBe(1);

    const mergeEvent = context.sentEvents.find((e) => e.name === 'pipeline/merge.evaluate');
    expect(mergeEvent).toBeDefined();
    expect(mergeEvent!.data['prNumber']).toBe(42);
  });

  it('resolves threads and requests merge eval for PRs with unresolved threads', async () => {
    const fifteenMinAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    mockGithub.listOpenPRs.mockResolvedValue([
      { number: 42, head: { sha: 'abc123', ref: 'claude/issue-42' }, updated_at: fifteenMinAgo },
    ]);
    mockGithub.checkCIStatus.mockResolvedValue({
      testsPass: true,
      e2ePass: true,
      androidBuildPass: true,
    });
    mockGithub.countApprovals.mockResolvedValue(0);
    mockGithub.countUnresolvedThreads.mockResolvedValue(5);

    const { step, context } = createMockStep();
    await getHandler()({ step });

    // Should resolve threads
    expect(mockGithub.resolveAllThreads).toHaveBeenCalledWith(42);

    // Should emit merge.evaluate
    const mergeEvent = context.sentEvents.find((e) => e.name === 'pipeline/merge.evaluate');
    expect(mergeEvent).toBeDefined();
  });

  it('escalates to doctor after too many fix attempts', async () => {
    const fifteenMinAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    mockGithub.listOpenPRs.mockResolvedValue([
      { number: 42, head: { sha: 'abc123', ref: 'claude/issue-42' }, updated_at: fifteenMinAgo },
    ]);
    mockGithub.checkCIStatus.mockResolvedValue({
      testsPass: false,
      e2ePass: false,
      androidBuildPass: true,
    });
    mockGithub.countFixAttempts.mockResolvedValue(5); // >= MAX_FIX_RETRIES_PR

    const { step, context } = createMockStep();
    await getHandler()({ step });

    const doctorEvent = context.sentEvents.find((e) => e.name === 'pipeline/doctor.requested');
    expect(doctorEvent).toBeDefined();
    expect(doctorEvent!.data['issueNumber']).toBe(42);
    expect((doctorEvent!.data['reason'] as string)).toContain('fix attempts');
  });

  it('skips recently updated PRs', async () => {
    // PR updated 5 minutes ago (under 15 min threshold)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    mockGithub.listOpenPRs.mockResolvedValue([
      { number: 42, head: { sha: 'abc123', ref: 'claude/issue-42' }, updated_at: fiveMinAgo },
    ]);

    const { step, context } = createMockStep();
    const result = await getHandler()({ step }) as Record<string, unknown>;

    expect(result['prActionsCount']).toBe(0);
    expect(context.sentEvents).toHaveLength(0);
  });
});
