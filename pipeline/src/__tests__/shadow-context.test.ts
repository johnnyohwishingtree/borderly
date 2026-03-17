/**
 * Tests for shadow-context.ts — createShadowContext helper
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createShadowContext } from '../lib/shadow-context.js';
import { createMockGitHub } from './helpers/mock-github.js';

describe('createShadowContext', () => {
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

  describe('live mode (shadow off)', () => {
    beforeEach(() => {
      delete process.env['INNGEST_SHADOW_MODE'];
    });

    it('returns shadow=false', () => {
      const { client } = createMockGitHub();
      const ctx = createShadowContext(client, 'test-fn', 'test/event');
      expect(ctx.shadow).toBe(false);
    });

    it('returns the original github client', () => {
      const { client } = createMockGitHub();
      const ctx = createShadowContext(client, 'test-fn', 'test/event');
      expect(ctx.github).toBe(client);
    });

    it('finalize returns result without _shadow flag', async () => {
      const { client } = createMockGitHub();
      const ctx = createShadowContext(client, 'test-fn', 'test/event');
      const result = await ctx.finalize('triggered', { status: 'triggered', count: 5 });
      expect(result).toEqual({ status: 'triggered', count: 5 });
      expect(result).not.toHaveProperty('_shadow');
    });
  });

  describe('shadow mode (shadow on)', () => {
    beforeEach(() => {
      process.env['INNGEST_SHADOW_MODE'] = 'true';
      process.env['PARITY_TRACKING_ISSUE'] = '500';
    });

    it('returns shadow=true', () => {
      const { client } = createMockGitHub();
      const ctx = createShadowContext(client, 'test-fn', 'test/event');
      expect(ctx.shadow).toBe(true);
    });

    it('returns a proxied github client', () => {
      const { client } = createMockGitHub();
      const ctx = createShadowContext(client, 'test-fn', 'test/event');
      expect(ctx.github).not.toBe(client);
    });

    it('finalize records parity and adds _shadow flag', async () => {
      const { client } = createMockGitHub();
      const ctx = createShadowContext(client, 'story-lifecycle', 'pipeline/pr.merged');

      // Perform some shadow writes
      await ctx.github.mergePR(42, 'squash');
      await ctx.github.addLabels(10, ['completed']);

      const result = await ctx.finalize('triggered', {
        status: 'triggered',
        nextStory: 11,
      });

      expect(result).toEqual({
        status: 'triggered',
        nextStory: 11,
        _shadow: true,
      });

      // Parity record should have been posted
      expect(client.commentOnIssue).toHaveBeenCalledWith(
        500,
        expect.stringContaining('story-lifecycle')
      );
      expect(client.commentOnIssue).toHaveBeenCalledWith(
        500,
        expect.stringContaining('merge_pr')
      );
    });

    it('intercepted writes are recorded in parity log', async () => {
      const { client } = createMockGitHub();
      const ctx = createShadowContext(client, 'merge-gate', 'pipeline/merge.evaluate');

      await ctx.github.mergePR(42, 'squash');

      // The actual mergePR should NOT have been called
      expect(client.mergePR).not.toHaveBeenCalled();

      // But reads should still work
      const approvals = await ctx.github.countApprovals(42);
      expect(approvals).toBe(1); // default from mock
    });

    it('finalize includes conditions in the parity record', async () => {
      const { client } = createMockGitHub();
      const ctx = createShadowContext(client, 'merge-gate', 'pipeline/merge.evaluate');

      await ctx.finalize(
        'merge',
        { action: 'merged', prNumber: 42 },
        { testsPass: true, approved: true, branchUpToDate: true }
      );

      expect(client.commentOnIssue).toHaveBeenCalledWith(
        500,
        expect.stringContaining('testsPass')
      );
    });
  });
});
