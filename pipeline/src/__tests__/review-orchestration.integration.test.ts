/**
 * Integration tests for review orchestration functions:
 * - ensureReview: Ensure a PR gets reviewed
 * - reviewRelay: Relay bot review feedback
 * - reviewFix: Apply review fixes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockStep } from './helpers/mock-step.js';

const mockGithub = {
  countApprovals: vi.fn(),
  getPRReviewComments: vi.fn(),
  countUnresolvedThreads: vi.fn(),
  countCriticalComments: vi.fn(),
  approvePR: vi.fn(),
  commentOnIssue: vi.fn(),
  getLinkedIssueFromPR: vi.fn(),
  countFixAttempts: vi.fn(),
  resolveAllThreads: vi.fn(),
};

const mockStateMachine = {
  transition: vi.fn().mockResolvedValue({ state: 'reviewing' }),
};

vi.mock('../lib/github.js', () => ({
  GitHubClient: vi.fn(() => mockGithub),
}));

vi.mock('../lib/state-machine.js', () => ({
  PipelineStateMachine: vi.fn(() => mockStateMachine),
}));

const { ensureReview, reviewRelay, reviewFix, AGENT_FIX_WAIT_DURATION } = await import(
  '../functions/review-orchestration.js'
);

function getHandler(fn: unknown) {
  return (fn as { fn: (...args: unknown[]) => unknown }).fn;
}

describe('ensureReview integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['GITHUB_TOKEN'] = 'test-token';

    mockGithub.countApprovals.mockResolvedValue(0);
    mockGithub.getPRReviewComments.mockResolvedValue([]);
    mockGithub.countUnresolvedThreads.mockResolvedValue(0);
    mockGithub.countCriticalComments.mockResolvedValue(0);
    mockGithub.approvePR.mockResolvedValue(undefined);
    mockGithub.commentOnIssue.mockResolvedValue(undefined);
    mockGithub.getLinkedIssueFromPR.mockResolvedValue(142);
    mockStateMachine.transition.mockResolvedValue({ state: 'reviewing' });
  });

  it('emits merge eval when already approved', async () => {
    mockGithub.countApprovals.mockResolvedValue(1);

    const { step, context } = createMockStep();
    const result = await getHandler(ensureReview)({
      event: { data: { prNumber: 42, headSha: 'abc123', repo: 'owner/repo' } },
      step,
    }) as Record<string, unknown>;

    expect(result['status']).toBe('already-approved');
    const mergeEvent = context.sentEvents.find((e) => e.name === 'pipeline/merge.evaluate');
    expect(mergeEvent).toBeDefined();
  });

  it('auto-approves when reviews are clean', async () => {
    mockGithub.getPRReviewComments.mockResolvedValue([
      { prNumber: 42, reviewer: 'reviewer', body: 'LGTM', inlineComments: [], state: 'COMMENTED' },
    ]);
    mockGithub.countUnresolvedThreads.mockResolvedValue(0);
    mockGithub.countCriticalComments.mockResolvedValue(0);

    const { step, context } = createMockStep();
    const result = await getHandler(ensureReview)({
      event: { data: { prNumber: 42, headSha: 'abc123', repo: 'owner/repo' } },
      step,
    }) as Record<string, unknown>;

    expect(result['status']).toBe('auto-approved');
    expect(mockGithub.approvePR).toHaveBeenCalledWith(42, expect.stringContaining('Auto-approved'));
    const mergeEvent = context.sentEvents.find((e) => e.name === 'pipeline/merge.evaluate');
    expect(mergeEvent).toBeDefined();
  });

  it('waits for fixes when unresolved threads exist', async () => {
    mockGithub.getPRReviewComments.mockResolvedValue([
      { prNumber: 42, reviewer: 'reviewer', body: 'Fix this', inlineComments: [], state: 'CHANGES_REQUESTED' },
    ]);
    mockGithub.countUnresolvedThreads.mockResolvedValue(3);

    const { step } = createMockStep();
    const result = await getHandler(ensureReview)({
      event: { data: { prNumber: 42, headSha: 'abc123', repo: 'owner/repo' } },
      step,
    }) as Record<string, unknown>;

    expect(result['status']).toBe('waiting-for-fixes');
    expect(result['unresolvedThreads']).toBe(3);
  });

  it('requests Claude review when no reviews exist', async () => {
    const { step } = createMockStep();
    const result = await getHandler(ensureReview)({
      event: { data: { prNumber: 42, headSha: 'abc123', repo: 'owner/repo' } },
      step,
    }) as Record<string, unknown>;

    expect(result['status']).toBe('review-requested');
    expect(mockGithub.commentOnIssue).toHaveBeenCalledWith(
      42,
      expect.stringContaining('@claude')
    );
    expect(mockStateMachine.transition).toHaveBeenCalledWith(142, 'reviewing');
  });
});

describe('reviewRelay integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['GITHUB_TOKEN'] = 'test-token';

    mockGithub.countFixAttempts.mockResolvedValue(0);
    mockGithub.getPRReviewComments.mockResolvedValue([]);
    mockGithub.getLinkedIssueFromPR.mockResolvedValue(142);
    mockStateMachine.transition.mockResolvedValue({ state: 'fix-reviews' });
  });

  it('skips non-bot reviews', async () => {
    const { step } = createMockStep();
    const result = await getHandler(reviewRelay)({
      event: {
        data: {
          prNumber: 42,
          reviewer: 'human-user',
          reviewState: 'CHANGES_REQUESTED',
          reviewBody: 'Fix this',
          isBot: false,
          repo: 'owner/repo',
        },
      },
      step,
    }) as Record<string, unknown>;

    expect(result['status']).toBe('skipped');
  });

  it('emits merge eval on bot approval', async () => {
    const { step, context } = createMockStep();
    const result = await getHandler(reviewRelay)({
      event: {
        data: {
          prNumber: 42,
          reviewer: 'gemini-code-assist[bot]',
          reviewState: 'APPROVED',
          reviewBody: 'LGTM',
          isBot: true,
          repo: 'owner/repo',
        },
      },
      step,
    }) as Record<string, unknown>;

    expect(result['status']).toBe('approved');
    const mergeEvent = context.sentEvents.find((e) => e.name === 'pipeline/merge.evaluate');
    expect(mergeEvent).toBeDefined();
  });

  it('relays bot review feedback and emits fix event', async () => {
    mockGithub.getPRReviewComments.mockResolvedValue([
      {
        prNumber: 42,
        reviewer: 'gemini-code-assist[bot]',
        body: 'Security issue',
        inlineComments: [{ path: 'src/auth.ts', line: 42, body: 'SQL injection risk' }],
        state: 'CHANGES_REQUESTED',
      },
    ]);

    const { step, context } = createMockStep();
    const result = await getHandler(reviewRelay)({
      event: {
        data: {
          prNumber: 42,
          reviewer: 'gemini-code-assist[bot]',
          reviewState: 'CHANGES_REQUESTED',
          reviewBody: 'Security issue found',
          isBot: true,
          repo: 'owner/repo',
        },
      },
      step,
    }) as Record<string, unknown>;

    expect(result['status']).toBe('relayed');
    expect(result['round']).toBe(1);

    // Should transition to fix-reviews
    expect(mockStateMachine.transition).toHaveBeenCalledWith(142, 'fix-reviews');

    // Should emit review.fix-requested
    const fixEvent = context.sentEvents.find((e) => e.name === 'pipeline/review.fix-requested');
    expect(fixEvent).toBeDefined();
    expect(fixEvent!.data['prNumber']).toBe(42);
  });

  it('stops relaying after max rounds', async () => {
    mockGithub.countFixAttempts.mockResolvedValue(3); // MAX_RELAY_ROUNDS

    const { step } = createMockStep();
    const result = await getHandler(reviewRelay)({
      event: {
        data: {
          prNumber: 42,
          reviewer: 'gemini-code-assist[bot]',
          reviewState: 'CHANGES_REQUESTED',
          reviewBody: 'Still broken',
          isBot: true,
          repo: 'owner/repo',
        },
      },
      step,
    }) as Record<string, unknown>;

    expect(result['status']).toBe('relay-limit-reached');
  });
});

describe('reviewFix integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['GITHUB_TOKEN'] = 'test-token';
    process.env['PREFERRED_AGENT'] = 'claude';

    mockGithub.commentOnIssue.mockResolvedValue(undefined);
    mockGithub.resolveAllThreads.mockResolvedValue(0);
  });

  it('triggers agent fix and emits verify event', async () => {
    const { step, context } = createMockStep();
    const result = await getHandler(reviewFix)({
      event: {
        data: {
          prNumber: 42,
          issueNumber: 142,
          branch: 'claude/issue-42',
          feedback: 'Fix the SQL injection in auth.ts',
          repo: 'owner/repo',
        },
      },
      step,
    }) as Record<string, unknown>;

    expect(result['status']).toBe('fix-dispatched');

    // Should trigger agent
    expect(mockGithub.commentOnIssue).toHaveBeenCalledWith(
      42,
      expect.stringContaining('@claude')
    );
    expect(mockGithub.commentOnIssue).toHaveBeenCalledWith(
      42,
      expect.stringContaining('Fix the SQL injection')
    );

    // Should resolve threads
    expect(mockGithub.resolveAllThreads).toHaveBeenCalledWith(42);

    // Should sleep waiting for fix
    expect(context.sleeps).toHaveLength(1);
    expect(context.sleeps[0].duration).toBe(AGENT_FIX_WAIT_DURATION);

    // Should emit verify event
    const verifyEvent = context.sentEvents.find((e) => e.name === 'pipeline/verify.requested');
    expect(verifyEvent).toBeDefined();
    expect(verifyEvent!.data['issueNumber']).toBe(142);
  });
});
