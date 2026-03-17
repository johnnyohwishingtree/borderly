/**
 * Shadow context — shared helper for Inngest functions to support
 * parallel run mode. In shadow mode, functions observe but don't act.
 *
 * Usage in a function:
 *   const ctx = createShadowContext(github, 'story-lifecycle', 'pipeline/pr.merged');
 *   // Use ctx.github instead of github for all operations
 *   // At end: return ctx.finalize(decision, conditions);
 */

import { GitHubClient } from './github.js';
import {
  isShadowMode,
  wrapForShadow,
  recordParity,
  type ParityAction,
} from './parity.js';

export interface ShadowContext {
  /** GitHubClient — wrapped in shadow mode, passthrough in live mode */
  github: GitHubClient;
  /** Whether shadow mode is active */
  shadow: boolean;
  /** Finalize the parity record and return the result */
  finalize: <T extends Record<string, unknown>>(
    decision: string,
    result: T,
    conditions?: Record<string, unknown>
  ) => Promise<T & { _shadow?: boolean }>;
}

export function createShadowContext(
  github: GitHubClient,
  functionId: string,
  eventName: string
): ShadowContext {
  const shadow = isShadowMode();
  const actions: ParityAction[] = [];
  const wrappedGithub = wrapForShadow(github, actions);

  return {
    github: wrappedGithub,
    shadow,
    finalize: async <T extends Record<string, unknown>>(
      decision: string,
      result: T,
      conditions?: Record<string, unknown>
    ): Promise<T & { _shadow?: boolean }> => {
      if (shadow) {
        await recordParity(github, {
          functionId,
          event: eventName,
          timestamp: new Date().toISOString(),
          decision,
          actions,
          conditions,
        });
        return { ...result, _shadow: true };
      }
      return result;
    },
  };
}
