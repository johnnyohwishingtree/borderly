/**
 * Integration tests for verify-and-fix function.
 *
 * Tests the durable verify → fix → retry loop:
 * - Verification passes on first attempt
 * - Verification fails → fix → retry → pass
 * - Max attempts reached → escalate
 * - Fix disabled → escalate immediately
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockStep } from './helpers/mock-step.js';

const mockGithub = {
  getHeadSha: vi.fn(),
  dispatchWorkflow: vi.fn(),
  commentOnIssue: vi.fn(),
};

const mockStateMachine = {
  transition: vi.fn().mockResolvedValue({ state: 'verifying' }),
};

vi.mock('../lib/github.js', () => ({
  GitHubClient: vi.fn(() => mockGithub),
}));

vi.mock('../lib/state-machine.js', () => ({
  PipelineStateMachine: vi.fn(() => mockStateMachine),
}));

vi.mock('inngest', async (importOriginal) => {
  const orig = await importOriginal<typeof import('inngest')>();
  return {
    ...orig,
    NonRetriableError: class NonRetriableError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'NonRetriableError';
      }
    },
  };
});

const { verifyAndFix } = await import('../functions/verify-and-fix.js');

function getHandler() {
  return (verifyAndFix as unknown as { fn: (...args: unknown[]) => unknown }).fn;
}

function makeEvent(overrides: Partial<{
  branch: string;
  workBranch: string;
  issueNumber: number;
  checks: string;
  fixEnabled: boolean;
  maxAttempts: number;
  attempt: number;
  mergeInto: string;
  createPr: boolean;
  fixContext: string;
  repo: string;
}> = {}) {
  return {
    event: {
      data: {
        branch: 'claude/issue-42',
        workBranch: '',
        issueNumber: 42,
        checks: 'all',
        fixEnabled: true,
        maxAttempts: 3,
        attempt: 1,
        mergeInto: '',
        createPr: false,
        fixContext: '',
        repo: 'owner/repo',
        ...overrides,
      },
    },
  };
}

describe('verify-and-fix integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['GITHUB_TOKEN'] = 'test-token';
    process.env['PREFERRED_AGENT'] = 'claude';

    mockGithub.getHeadSha.mockResolvedValue('sha123456');
    mockGithub.dispatchWorkflow.mockResolvedValue(undefined);
    mockGithub.commentOnIssue.mockResolvedValue(undefined);
    mockStateMachine.transition.mockResolvedValue({ state: 'verifying' });
  });

  it('verifies and returns on CI pass', async () => {
    const { step, context } = createMockStep();
    // Queue a ci.completed event for waitForEvent
    context.waitEventQueue.set('pipeline/ci.completed', {
      data: { headSha: 'sha123456', prNumber: 42 },
    });

    const result = await getHandler()({ ...makeEvent(), step }) as Record<string, unknown>;

    expect(result['status']).toBe('verified');
    expect(result['attempt']).toBe(1);

    // Should have dispatched CI
    expect(mockGithub.dispatchWorkflow).toHaveBeenCalledWith(
      'ci.yml',
      'claude/issue-42',
      expect.objectContaining({ branch: 'claude/issue-42' })
    );

    // Should transition to verified
    expect(mockStateMachine.transition).toHaveBeenCalledWith(42, 'verified');

    // Should emit review.ensure event
    const reviewEvent = context.sentEvents.find((e) => e.name === 'pipeline/review.ensure');
    expect(reviewEvent).toBeDefined();
  });

  it('escalates when CI times out and fix is disabled', async () => {
    // No event queued → waitForEvent returns null (timeout)
    const { step, context } = createMockStep();

    const result = await getHandler()({
      ...makeEvent({ fixEnabled: false }),
      step,
    }) as Record<string, unknown>;

    expect(result['status']).toBe('escalated');
    expect(result['attempt']).toBe(1);

    // Should emit doctor.requested
    const doctorEvent = context.sentEvents.find((e) => e.name === 'pipeline/doctor.requested');
    expect(doctorEvent).toBeDefined();
    expect(doctorEvent!.data['issueNumber']).toBe(42);
  });

  it('enters fix loop on CI failure', async () => {
    // First attempt: CI timeout (null), fix loop triggered
    // Second attempt: CI passes
    const { step, context } = createMockStep();

    // No event for first waitForEvent (timeout → fail)
    // But we need to queue an event for the second attempt
    let waitCallCount = 0;
    step.waitForEvent = async (_stepId: string, _opts: { event: string; timeout: string; if?: string }) => {
      waitCallCount++;
      if (waitCallCount === 1) {
        return null; // First attempt times out
      }
      // Second attempt succeeds
      return { data: { headSha: 'sha123456', prNumber: 42 } };
    };

    const result = await getHandler()({ ...makeEvent(), step }) as Record<string, unknown>;

    expect(result['status']).toBe('verified');
    expect(result['attempt']).toBe(2);

    // Should have transitioned to fix-loop
    expect(mockStateMachine.transition).toHaveBeenCalledWith(42, 'fix-loop', expect.anything());

    // Should have commented about the fix
    expect(mockGithub.commentOnIssue).toHaveBeenCalledWith(
      42,
      expect.stringContaining('@claude Fix attempt')
    );

    // Should have slept waiting for fix
    expect(context.sleeps).toHaveLength(1);
    expect(context.sleeps[0].duration).toBe('5m');
  });

  it('escalates after max attempts exhausted', async () => {
    // All attempts fail (waitForEvent returns null)
    const { step, context } = createMockStep();

    const result = await getHandler()({
      ...makeEvent({ maxAttempts: 2, attempt: 2 }),
      step,
    }) as Record<string, unknown>;

    expect(result['status']).toBe('escalated');

    // Should transition to escalated
    expect(mockStateMachine.transition).toHaveBeenCalledWith(
      42,
      'escalated',
      expect.objectContaining({ errorContext: expect.any(String) })
    );

    // Should emit doctor event
    const doctorEvent = context.sentEvents.find((e) => e.name === 'pipeline/doctor.requested');
    expect(doctorEvent).toBeDefined();
    expect((doctorEvent!.data['reason'] as string)).toContain('Max attempts');
  });

  it('uses workBranch when provided', async () => {
    const { step, context } = createMockStep();
    context.waitEventQueue.set('pipeline/ci.completed', {
      data: { headSha: 'sha123456', prNumber: 42 },
    });

    await getHandler()({
      ...makeEvent({ workBranch: 'tmp/verify-42' }),
      step,
    });

    // Should dispatch CI on the work branch
    expect(mockGithub.dispatchWorkflow).toHaveBeenCalledWith(
      'ci.yml',
      'tmp/verify-42',
      expect.objectContaining({ branch: 'tmp/verify-42' })
    );
    expect(mockGithub.getHeadSha).toHaveBeenCalledWith('tmp/verify-42');
  });

  it('posts verify attempt comment with sha', async () => {
    const { step, context } = createMockStep();
    context.waitEventQueue.set('pipeline/ci.completed', {
      data: { headSha: 'sha123456', prNumber: 42 },
    });

    await getHandler()({ ...makeEvent(), step });

    expect(mockGithub.commentOnIssue).toHaveBeenCalledWith(
      42,
      expect.stringContaining('sha1234')
    );
  });
});
