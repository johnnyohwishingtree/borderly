/**
 * Integration tests for story-lifecycle function.
 *
 * Tests the full PR merged → close story → find next → trigger agent flow
 * with mocked GitHub API and Inngest step primitives.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockStep } from './helpers/mock-step.js';

// ─── Shared mock instances ──────────────────────────────────────────────────

let mockState: {
  prBody: Map<number, string>;
  issueLabels: Map<number, string[]>;
  nextPendingStory: number | null;
  openPRs: Array<{ number: number; head: { sha: string; ref: string }; updated_at: string }>;
};

const mockGithub = {
  getLinkedIssueFromPR: vi.fn(),
  getIssueLabels: vi.fn(),
  removeLabel: vi.fn(),
  addLabels: vi.fn(),
  closeIssue: vi.fn(),
  commentOnIssue: vi.fn(),
  getNextPendingStory: vi.fn(),
  listOpenPRs: vi.fn(),
  triggerStoryAgent: vi.fn(),
};

const mockStateMachine = {
  transition: vi.fn().mockResolvedValue({
    state: 'planned',
    attempt: 0,
    maxAttempts: 6,
    branches: { pr: null, tmp: null, internal: null },
    prNumber: null,
    lastTransition: new Date().toISOString(),
    history: [],
    lockId: null,
    errorContext: null,
  }),
};

vi.mock('../lib/github.js', () => ({
  GitHubClient: vi.fn(() => mockGithub),
}));

vi.mock('../lib/state-machine.js', () => ({
  PipelineStateMachine: vi.fn(() => mockStateMachine),
}));

const { storyLifecycle, CONSECUTIVE_FAILURE_THRESHOLD } = await import('../functions/story-lifecycle.js');

function getHandler() {
  return (storyLifecycle as unknown as { fn: (...args: unknown[]) => unknown }).fn;
}

function makeEvent(prNumber: number) {
  return {
    event: {
      data: {
        prNumber,
        headBranch: `claude/issue-${prNumber}`,
        mergedBy: 'user',
        repo: 'owner/repo',
      },
    },
  };
}

describe('story-lifecycle integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockState = {
      prBody: new Map(),
      issueLabels: new Map(),
      nextPendingStory: null,
      openPRs: [],
    };

    // Wire up mock implementations based on state
    mockGithub.getLinkedIssueFromPR.mockImplementation(async (prNumber: number) => {
      const body = mockState.prBody.get(prNumber) ?? `Closes #${prNumber + 100}`;
      const match = body.match(/Closes\s+#(\d+)/i);
      return match ? parseInt(match[1], 10) : null;
    });

    mockGithub.getIssueLabels.mockImplementation(async (issueNumber: number) => {
      return mockState.issueLabels.get(issueNumber) ?? [];
    });

    mockGithub.getNextPendingStory.mockImplementation(async () => {
      return mockState.nextPendingStory;
    });

    mockGithub.listOpenPRs.mockImplementation(async () => {
      return mockState.openPRs;
    });

    mockGithub.removeLabel.mockResolvedValue(undefined);
    mockGithub.addLabels.mockResolvedValue(undefined);
    mockGithub.closeIssue.mockResolvedValue(undefined);
    mockGithub.commentOnIssue.mockResolvedValue(undefined);
    mockGithub.triggerStoryAgent.mockResolvedValue(undefined);
    mockStateMachine.transition.mockResolvedValue({
      state: 'planned',
      attempt: 0,
      maxAttempts: 6,
      branches: { pr: null, tmp: null, internal: null },
      prNumber: null,
      lastTransition: new Date().toISOString(),
      history: [],
      lockId: null,
      errorContext: null,
    });

    process.env['GITHUB_TOKEN'] = 'test-token';
    process.env['PREFERRED_AGENT'] = 'claude';
  });

  it('skips when PR has no linked story', async () => {
    mockState.prBody.set(42, 'Just a regular PR, no closes link');

    const { step, context } = createMockStep();
    const result = await getHandler()({ ...makeEvent(42), step });

    expect(result).toEqual({ status: 'skipped', reason: 'No linked story found' });
    expect(context.sentEvents).toHaveLength(0);
  });

  it('skips when linked issue is not a story', async () => {
    // PR #42 links to issue #142, but #142 is a bug not a story
    mockState.issueLabels.set(142, ['bug']);

    const { step } = createMockStep();
    const result = await getHandler()({ ...makeEvent(42), step });

    expect(result).toEqual({ status: 'skipped', reason: 'No linked story found' });
  });

  it('closes completed story and triggers next story', async () => {
    // PR #42 → story #142, which has epic label, next story is #143
    mockState.issueLabels.set(142, ['story', 'epic:mvp', 'in-progress']);
    mockState.nextPendingStory = 143;
    mockState.openPRs = [];

    const { step, context } = createMockStep();
    const result = await getHandler()({ ...makeEvent(42), step });

    expect(result).toEqual({
      status: 'triggered',
      completedStory: 142,
      nextStory: 143,
      agent: 'claude',
    });

    // Story #142 closed
    expect(mockGithub.removeLabel).toHaveBeenCalledWith(142, 'pending');
    expect(mockGithub.removeLabel).toHaveBeenCalledWith(142, 'in-progress');
    expect(mockGithub.addLabels).toHaveBeenCalledWith(142, ['completed']);
    expect(mockGithub.closeIssue).toHaveBeenCalledWith(142);

    // Next story #143 initialized
    expect(mockGithub.removeLabel).toHaveBeenCalledWith(143, 'pending');
    expect(mockGithub.addLabels).toHaveBeenCalledWith(143, ['in-progress']);

    // Agent triggered
    expect(mockGithub.triggerStoryAgent).toHaveBeenCalledWith(143, 'claude');

    // story.trigger event emitted
    const storyEvent = context.sentEvents.find((e) => e.name === 'pipeline/story.trigger');
    expect(storyEvent).toBeDefined();
    expect(storyEvent!.data).toEqual({
      issueNumber: 143,
      agent: 'claude',
      epicLabel: 'epic:mvp',
      repo: 'owner/repo',
    });
  });

  it('completes epic when no more pending stories', async () => {
    mockState.issueLabels.set(142, ['story', 'epic:mvp']);
    mockState.nextPendingStory = null;

    const { step } = createMockStep();
    const result = await getHandler()({ ...makeEvent(42), step });

    expect(result).toEqual({ status: 'epic-complete', epicLabel: 'epic:mvp' });
    expect(mockGithub.commentOnIssue).toHaveBeenCalledWith(
      142,
      expect.stringContaining('epic:mvp')
    );
  });

  it('pauses pipeline when too many unmerged PRs', async () => {
    mockState.issueLabels.set(142, ['story', 'epic:mvp']);
    mockState.nextPendingStory = 143;
    mockState.openPRs = Array.from({ length: CONSECUTIVE_FAILURE_THRESHOLD }, (_, i) => ({
      number: 10 + i,
      head: { sha: String.fromCharCode(97 + i), ref: `claude/${String.fromCharCode(97 + i)}` },
      updated_at: new Date().toISOString(),
    }));

    const { step, context } = createMockStep();
    const result = await getHandler()({ ...makeEvent(42), step });

    expect(result).toEqual({
      status: 'paused',
      reason: 'Too many consecutive unmerged PRs',
    });

    expect(mockGithub.commentOnIssue).toHaveBeenCalledWith(
      143,
      expect.stringContaining('Pipeline paused')
    );
    expect(mockGithub.triggerStoryAgent).not.toHaveBeenCalled();
    expect(context.sentEvents).toHaveLength(0);
  });

  it('uses preferred agent from env', async () => {
    process.env['PREFERRED_AGENT'] = 'gemini';
    mockState.issueLabels.set(142, ['story', 'epic:mvp']);
    mockState.nextPendingStory = 143;
    mockState.openPRs = [];

    const { step, context } = createMockStep();
    const result = await getHandler()({ ...makeEvent(42), step }) as Record<string, unknown>;

    expect(result['agent']).toBe('gemini');
    expect(mockGithub.triggerStoryAgent).toHaveBeenCalledWith(143, 'gemini');

    const storyEvent = context.sentEvents.find((e) => e.name === 'pipeline/story.trigger');
    expect(storyEvent!.data['agent']).toBe('gemini');
  });

  it('returns done when story has no epic label', async () => {
    mockState.issueLabels.set(142, ['story']); // no epic: label

    const { step } = createMockStep();
    const result = await getHandler()({ ...makeEvent(42), step });

    expect(result).toEqual({ status: 'done', reason: 'No epic label found' });
  });

  it('transitions state machine through merged', async () => {
    mockState.issueLabels.set(142, ['story', 'epic:mvp']);
    mockState.nextPendingStory = 143;
    mockState.openPRs = [];

    const { step } = createMockStep();
    await getHandler()({ ...makeEvent(42), step });

    // Should transition completed story to 'merged'
    expect(mockStateMachine.transition).toHaveBeenCalledWith(142, 'merged');
    // Should transition next story to 'planned'
    expect(mockStateMachine.transition).toHaveBeenCalledWith(143, 'planned');
  });
});
