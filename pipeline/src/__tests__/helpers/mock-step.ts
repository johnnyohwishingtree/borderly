/**
 * Mock Inngest step primitives for integration testing.
 *
 * Simulates step.run, step.sendEvent, step.waitForEvent, and step.sleep
 * so we can test function logic end-to-end without the Inngest Dev Server.
 */

/**
 * Evaluate a simple CEL-like `if` condition against an event object.
 *
 * Supports the pattern used in this codebase:
 *   async.data.FIELD == 'VALUE'
 *
 * `async` refers to the received event being evaluated. Returns true
 * (permissive) for any pattern that cannot be parsed.
 */
function evaluateIfCondition(
  condition: string,
  event: Record<string, unknown>
): boolean {
  const eqMatch = condition.match(/^async\.data\.(\w+)\s*==\s*'([^']*)'$/);
  if (eqMatch) {
    const [, field, value] = eqMatch;
    const eventData = event['data'] as Record<string, unknown> | undefined;
    return eventData?.[field] === value;
  }
  // Unrecognized condition pattern — permissive fallback
  return true;
}

export interface SentEvent {
  stepId: string;
  name: string;
  data: Record<string, unknown>;
}

export interface StepExecution {
  stepId: string;
  result: unknown;
}

export interface MockStepContext {
  /** Events sent via step.sendEvent */
  sentEvents: SentEvent[];
  /** Steps that were executed */
  executedSteps: StepExecution[];
  /** Events queued for step.waitForEvent to consume */
  waitEventQueue: Map<string, Record<string, unknown> | null>;
  /** Sleep durations recorded */
  sleeps: Array<{ stepId: string; duration: string }>;
}

export function createMockStep() {
  const context: MockStepContext = {
    sentEvents: [],
    executedSteps: [],
    waitEventQueue: new Map(),
    sleeps: [],
  };

  const step = {
    run: async <T>(stepId: string, fn: () => Promise<T>): Promise<T> => {
      const result = await fn();
      context.executedSteps.push({ stepId, result });
      return result;
    },

    sendEvent: async (
      stepId: string,
      event: { name: string; data: Record<string, unknown> }
    ): Promise<void> => {
      context.sentEvents.push({ stepId, name: event.name, data: event.data });
    },

    waitForEvent: async (
      stepId: string,
      opts: { event: string; timeout: string; if?: string }
    ): Promise<Record<string, unknown> | null> => {
      // Return queued event or null (timeout)
      const queued = context.waitEventQueue.get(opts.event);
      if (queued !== undefined) {
        // If an `if` condition is specified, evaluate it against the queued
        // event. Return null (simulate timeout) when the event doesn't match,
        // so tests can verify that only matching events are consumed.
        if (opts.if && queued !== null && !evaluateIfCondition(opts.if, queued)) {
          return null;
        }
        context.waitEventQueue.delete(opts.event);
        return queued;
      }
      return null;
    },

    sleep: async (stepId: string, duration: string): Promise<void> => {
      context.sleeps.push({ stepId, duration });
    },
  };

  return { step, context };
}
