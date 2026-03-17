/**
 * Mock Inngest step primitives for integration testing.
 *
 * Simulates step.run, step.sendEvent, step.waitForEvent, and step.sleep
 * so we can test function logic end-to-end without the Inngest Dev Server.
 */

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
