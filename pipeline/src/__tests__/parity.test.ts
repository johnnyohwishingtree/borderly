/**
 * Tests for parity.ts — shadow mode, action recording, parity logging
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  isShadowMode,
  wrapForShadow,
  recordParity,
  type ParityAction,
} from '../lib/parity.js';
import { createMockGitHub } from './helpers/mock-github.js';

describe('isShadowMode', () => {
  const originalEnv = process.env['INNGEST_SHADOW_MODE'];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['INNGEST_SHADOW_MODE'] = originalEnv;
    } else {
      delete process.env['INNGEST_SHADOW_MODE'];
    }
  });

  it('returns false when INNGEST_SHADOW_MODE is not set', () => {
    delete process.env['INNGEST_SHADOW_MODE'];
    expect(isShadowMode()).toBe(false);
  });

  it('returns false when INNGEST_SHADOW_MODE is not "true"', () => {
    process.env['INNGEST_SHADOW_MODE'] = 'false';
    expect(isShadowMode()).toBe(false);
  });

  it('returns true when INNGEST_SHADOW_MODE is "true"', () => {
    process.env['INNGEST_SHADOW_MODE'] = 'true';
    expect(isShadowMode()).toBe(true);
  });
});

describe('wrapForShadow', () => {
  const originalEnv = process.env['INNGEST_SHADOW_MODE'];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['INNGEST_SHADOW_MODE'] = originalEnv;
    } else {
      delete process.env['INNGEST_SHADOW_MODE'];
    }
  });

  it('returns the original client when shadow mode is off', () => {
    delete process.env['INNGEST_SHADOW_MODE'];
    const { client } = createMockGitHub();
    const actions: ParityAction[] = [];
    const wrapped = wrapForShadow(client, actions);
    expect(wrapped).toBe(client);
  });

  it('returns a proxy when shadow mode is on', () => {
    process.env['INNGEST_SHADOW_MODE'] = 'true';
    const { client } = createMockGitHub();
    const actions: ParityAction[] = [];
    const wrapped = wrapForShadow(client, actions);
    expect(wrapped).not.toBe(client);
  });

  it('passes through read methods in shadow mode', async () => {
    process.env['INNGEST_SHADOW_MODE'] = 'true';
    const { client, state } = createMockGitHub({
      approvalCount: 3,
    });
    const actions: ParityAction[] = [];
    const wrapped = wrapForShadow(client, actions);

    const result = await wrapped.countApprovals(42);
    expect(result).toBe(3);
    expect(state.approvalCount).toBe(3);
    expect(actions).toHaveLength(0);
  });

  it('intercepts write methods and records actions', async () => {
    process.env['INNGEST_SHADOW_MODE'] = 'true';
    const { client } = createMockGitHub();
    const actions: ParityAction[] = [];
    const wrapped = wrapForShadow(client, actions);

    await wrapped.mergePR(42, 'squash');
    await wrapped.addLabels(10, ['completed']);
    await wrapped.commentOnIssue(10, 'Pipeline paused');
    await wrapped.closeIssue(10);

    expect(actions).toHaveLength(4);
    expect(actions[0]).toEqual({
      type: 'merge_pr',
      target: 'PR #42',
      detail: 'method: squash',
    });
    expect(actions[1]).toEqual({
      type: 'add_labels',
      target: 'issue #10',
      detail: 'labels: completed',
    });
    expect(actions[2]).toEqual({
      type: 'comment',
      target: 'issue #10',
      detail: 'Pipeline paused',
    });
    expect(actions[3]).toEqual({
      type: 'close_issue',
      target: 'issue #10',
      detail: 'close',
    });

    // Verify the actual mock was NOT called (shadow intercept)
    expect(client.mergePR).not.toHaveBeenCalled();
    expect(client.addLabels).not.toHaveBeenCalled();
    expect(client.closeIssue).not.toHaveBeenCalled();
  });

  it('intercepts triggerStoryAgent', async () => {
    process.env['INNGEST_SHADOW_MODE'] = 'true';
    const { client } = createMockGitHub();
    const actions: ParityAction[] = [];
    const wrapped = wrapForShadow(client, actions);

    await wrapped.triggerStoryAgent(55, 'claude');
    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual({
      type: 'trigger_agent',
      target: 'issue #55',
      detail: 'agent: claude',
    });
    expect(client.triggerStoryAgent).not.toHaveBeenCalled();
  });

  it('intercepts dispatchWorkflow', async () => {
    process.env['INNGEST_SHADOW_MODE'] = 'true';
    const { client } = createMockGitHub();
    const actions: ParityAction[] = [];
    const wrapped = wrapForShadow(client, actions);

    await wrapped.dispatchWorkflow('ci.yml', 'claude/issue-42', { sha: 'abc' });
    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual({
      type: 'dispatch_workflow',
      target: 'ci.yml',
      detail: 'branch: claude/issue-42',
    });
    expect(client.dispatchWorkflow).not.toHaveBeenCalled();
  });

  it('intercepts resolveAllThreads', async () => {
    process.env['INNGEST_SHADOW_MODE'] = 'true';
    const { client } = createMockGitHub();
    const actions: ParityAction[] = [];
    const wrapped = wrapForShadow(client, actions);

    await wrapped.resolveAllThreads(42);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual({
      type: 'resolve_threads',
      target: 'PR #42',
      detail: 'resolve all',
    });
    expect(client.resolveAllThreads).not.toHaveBeenCalled();
  });
});

describe('recordParity', () => {
  const originalEnv = {
    shadow: process.env['INNGEST_SHADOW_MODE'],
    issue: process.env['PARITY_TRACKING_ISSUE'],
  };

  afterEach(() => {
    if (originalEnv.shadow !== undefined) {
      process.env['INNGEST_SHADOW_MODE'] = originalEnv.shadow;
    } else {
      delete process.env['INNGEST_SHADOW_MODE'];
    }
    if (originalEnv.issue !== undefined) {
      process.env['PARITY_TRACKING_ISSUE'] = originalEnv.issue;
    } else {
      delete process.env['PARITY_TRACKING_ISSUE'];
    }
  });

  it('does nothing when PARITY_TRACKING_ISSUE is not set', async () => {
    delete process.env['PARITY_TRACKING_ISSUE'];
    const { client } = createMockGitHub();

    await recordParity(client, {
      functionId: 'test',
      event: 'test/event',
      timestamp: '2025-01-01T00:00:00Z',
      decision: 'merge',
      actions: [],
    });

    expect(client.commentOnIssue).not.toHaveBeenCalled();
  });

  it('does nothing when PARITY_TRACKING_ISSUE is 0', async () => {
    process.env['PARITY_TRACKING_ISSUE'] = '0';
    const { client } = createMockGitHub();

    await recordParity(client, {
      functionId: 'test',
      event: 'test/event',
      timestamp: '2025-01-01T00:00:00Z',
      decision: 'merge',
      actions: [],
    });

    expect(client.commentOnIssue).not.toHaveBeenCalled();
  });

  it('posts parity record to tracking issue', async () => {
    process.env['PARITY_TRACKING_ISSUE'] = '500';
    process.env['INNGEST_SHADOW_MODE'] = 'true';
    const { client } = createMockGitHub();

    await recordParity(client, {
      functionId: 'merge-gate',
      event: 'pipeline/merge.evaluate',
      timestamp: '2025-01-01T12:00:00Z',
      decision: 'merge',
      actions: [
        { type: 'merge_pr', target: 'PR #42', detail: 'method: squash' },
      ],
      conditions: { testsPass: true, approved: true },
    });

    expect(client.commentOnIssue).toHaveBeenCalledWith(
      500,
      expect.stringContaining('merge-gate')
    );
    expect(client.commentOnIssue).toHaveBeenCalledWith(
      500,
      expect.stringContaining('Shadow')
    );
    expect(client.commentOnIssue).toHaveBeenCalledWith(
      500,
      expect.stringContaining('merge_pr')
    );
  });

  it('does not crash if commentOnIssue fails', async () => {
    process.env['PARITY_TRACKING_ISSUE'] = '500';
    const { client } = createMockGitHub();
    vi.mocked(client.commentOnIssue).mockRejectedValueOnce(
      new Error('API error')
    );

    // Should not throw
    await recordParity(client, {
      functionId: 'test',
      event: 'test/event',
      timestamp: '2025-01-01T00:00:00Z',
      decision: 'test',
      actions: [],
    });
  });
});
