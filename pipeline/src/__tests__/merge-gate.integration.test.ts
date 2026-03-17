/**
 * Integration tests for merge-gate function.
 *
 * Tests the full merge gate evaluation → action flow:
 * - All conditions met → merge PR → emit pr.merged event
 * - Branch behind → update branch
 * - Conditions failing → wait
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockStep } from './helpers/mock-step.js';

const mockGithub = {
  getPR: vi.fn(),
  checkCIStatus: vi.fn(),
  countApprovals: vi.fn(),
  countUnresolvedThreads: vi.fn(),
  compareBranches: vi.fn(),
  mergePR: vi.fn(),
  updateBranch: vi.fn(),
  getLinkedIssueFromPR: vi.fn(),
};

const mockStateMachine = {
  transition: vi.fn().mockResolvedValue({ state: 'merging' }),
};

vi.mock('../lib/github.js', () => ({
  GitHubClient: vi.fn(() => mockGithub),
}));

vi.mock('../lib/state-machine.js', () => ({
  PipelineStateMachine: vi.fn(() => mockStateMachine),
}));

const { mergeGate } = await import('../functions/merge-gate.js');

function getHandler() {
  return (mergeGate as unknown as { fn: (...args: unknown[]) => unknown }).fn;
}

function makeEvent(prNumber: number, eventName = 'pipeline/merge.evaluate') {
  return {
    event: {
      name: eventName,
      data: { prNumber, repo: 'owner/repo', headSha: 'abc123', headBranch: 'claude/issue-1' },
    },
  };
}

describe('merge-gate integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['GITHUB_TOKEN'] = 'test-token';

    mockGithub.getPR.mockResolvedValue({
      head: { sha: 'abc123', ref: 'claude/issue-42' },
    });
    mockGithub.checkCIStatus.mockResolvedValue({
      testsPass: true,
      e2ePass: true,
      androidBuildPass: true,
    });
    mockGithub.countApprovals.mockResolvedValue(1);
    mockGithub.countUnresolvedThreads.mockResolvedValue(0);
    mockGithub.compareBranches.mockResolvedValue('ahead');
    mockGithub.mergePR.mockResolvedValue(undefined);
    mockGithub.updateBranch.mockResolvedValue(undefined);
    mockGithub.getLinkedIssueFromPR.mockResolvedValue(142);
    mockStateMachine.transition.mockResolvedValue({ state: 'merging' });
  });

  it('merges PR when all conditions pass', async () => {
    const { step, context } = createMockStep();
    const result = await getHandler()({ ...makeEvent(42), step }) as Record<string, unknown>;

    expect(result['action']).toBe('merged');
    expect(result['prNumber']).toBe(42);
    expect(mockGithub.mergePR).toHaveBeenCalledWith(42, 'squash');

    // Should emit pr.merged event
    const mergedEvent = context.sentEvents.find((e) => e.name === 'pipeline/pr.merged');
    expect(mergedEvent).toBeDefined();
    expect(mergedEvent!.data['prNumber']).toBe(42);
  });

  it('transitions state machine through merging → merged', async () => {
    const { step } = createMockStep();
    await getHandler()({ ...makeEvent(42), step });

    expect(mockStateMachine.transition).toHaveBeenCalledWith(142, 'merging');
    expect(mockStateMachine.transition).toHaveBeenCalledWith(142, 'merged');
  });

  it('updates branch when only behind', async () => {
    mockGithub.compareBranches.mockResolvedValue('behind');

    const { step } = createMockStep();
    const result = await getHandler()({ ...makeEvent(42), step }) as Record<string, unknown>;

    expect(result['action']).toBe('updated_branch');
    expect(mockGithub.updateBranch).toHaveBeenCalledWith(42);
    expect(mockGithub.mergePR).not.toHaveBeenCalled();
  });

  it('waits when tests fail', async () => {
    mockGithub.checkCIStatus.mockResolvedValue({
      testsPass: false,
      e2ePass: true,
      androidBuildPass: true,
    });

    const { step } = createMockStep();
    const result = await getHandler()({ ...makeEvent(42), step }) as Record<string, unknown>;

    expect(result['action']).toBe('waiting');
    expect((result['failingConditions'] as string[])).toContain('testsPass');
    expect(mockGithub.mergePR).not.toHaveBeenCalled();
  });

  it('waits when no approvals', async () => {
    mockGithub.countApprovals.mockResolvedValue(0);

    const { step } = createMockStep();
    const result = await getHandler()({ ...makeEvent(42), step }) as Record<string, unknown>;

    expect(result['action']).toBe('waiting');
    expect((result['failingConditions'] as string[])).toContain('approved');
  });

  it('waits when unresolved threads exist', async () => {
    mockGithub.countUnresolvedThreads.mockResolvedValue(3);

    const { step } = createMockStep();
    const result = await getHandler()({ ...makeEvent(42), step }) as Record<string, unknown>;

    expect(result['action']).toBe('waiting');
    expect((result['failingConditions'] as string[])).toContain('threadsResolved');
  });

  it('handles merge with no linked issue gracefully', async () => {
    mockGithub.getLinkedIssueFromPR.mockResolvedValue(null);

    const { step } = createMockStep();
    const result = await getHandler()({ ...makeEvent(42), step }) as Record<string, unknown>;

    expect(result['action']).toBe('merged');
    // State machine should NOT have been called when no issue
    expect(mockStateMachine.transition).not.toHaveBeenCalled();
  });

  it('responds to ci.completed event', async () => {
    const { step } = createMockStep();
    const result = await getHandler()({
      ...makeEvent(42, 'pipeline/ci.completed'),
      step,
    }) as Record<string, unknown>;

    // Should work the same regardless of trigger event
    expect(result['action']).toBe('merged');
  });

  it('updates branch when diverged', async () => {
    mockGithub.compareBranches.mockResolvedValue('diverged');

    const { step } = createMockStep();
    const result = await getHandler()({ ...makeEvent(42), step }) as Record<string, unknown>;

    expect(result['action']).toBe('updated_branch');
  });
});
