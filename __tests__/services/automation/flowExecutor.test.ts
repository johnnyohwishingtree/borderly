import { FlowExecutor } from '../../../src/services/automation/navigation/flowExecutor';
import type {
  NavigationConfig,
  NavigationFlow,
  FlowStep,
  FlowStepAction,
} from '../../../src/services/automation/navigation/navigationTypes';

function createConfig(
  overrides: Partial<NavigationConfig> = {},
): NavigationConfig {
  return {
    maxHistorySize: 50,
    defaultTimeout: 5000,
    retryAttempts: 2,
    navigationDelay: 100,
    enableStateTracking: true,
    enableScreenshots: false,
    ...overrides,
  };
}

function createFlowStep(overrides: Partial<FlowStep> = {}): FlowStep {
  return {
    id: 'step-1',
    name: 'Test Step',
    expectedUrl: 'https://portal.example.com/step1',
    urlPatterns: ['portal.example.com/step1'],
    actions: [],
    validations: [],
    timeout: 5000,
    retryable: false,
    optional: false,
    ...overrides,
  };
}

function createFlow(overrides: Partial<NavigationFlow> = {}): NavigationFlow {
  return {
    id: 'test-flow',
    name: 'Test Flow',
    description: 'A test flow',
    steps: [createFlowStep()],
    maxDuration: 60000,
    sessionPersistence: false,
    ...overrides,
  };
}

describe('FlowExecutor', () => {
  let executor: FlowExecutor;
  let executeScript: jest.Mock;
  let emitEvent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    executor = new FlowExecutor(createConfig());
    executeScript = jest.fn();
    emitEvent = jest.fn();
  });

  describe('executeFlow', () => {
    it('runs all steps and returns success with flow metadata', async () => {
      // URL validation returns matching URL
      executeScript.mockResolvedValue(
        'https://portal.example.com/step1',
      );

      const step1 = createFlowStep({
        id: 'step-1',
        name: 'Step 1',
        validations: [],
      });
      const step2 = createFlowStep({
        id: 'step-2',
        name: 'Step 2',
        expectedUrl: 'https://portal.example.com/step2',
        urlPatterns: ['portal.example.com/step2'],
        validations: [],
      });

      // For step2 URL validation
      executeScript
        .mockResolvedValueOnce('https://portal.example.com/step1')
        .mockResolvedValueOnce('https://portal.example.com/step2');

      const flow = createFlow({ steps: [step1, step2] });

      const result = await executor.executeFlow(
        flow,
        executeScript,
        undefined,
        emitEvent,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({
          flowId: 'test-flow',
          stepsCompleted: 2,
        }),
      );
    });

    it('emits flow:start event at the beginning', async () => {
      executeScript.mockResolvedValue(
        'https://portal.example.com/step1',
      );

      const flow = createFlow();

      await executor.executeFlow(flow, executeScript, undefined, emitEvent);

      expect(emitEvent).toHaveBeenCalledWith(
        'flow:start',
        expect.objectContaining({ flow }),
      );
    });

    it('emits flow:step_complete for each successful step', async () => {
      executeScript.mockResolvedValue(
        'https://portal.example.com/step1',
      );

      const flow = createFlow();

      await executor.executeFlow(flow, executeScript, undefined, emitEvent);

      expect(emitEvent).toHaveBeenCalledWith(
        'flow:step_complete',
        expect.objectContaining({
          flow,
          step: flow.steps[0],
        }),
      );
    });

    it('emits flow:complete event on success', async () => {
      executeScript.mockResolvedValue(
        'https://portal.example.com/step1',
      );

      const flow = createFlow();

      await executor.executeFlow(flow, executeScript, undefined, emitEvent);

      expect(emitEvent).toHaveBeenCalledWith(
        'flow:complete',
        expect.objectContaining({ flow }),
      );
    });

    it('returns failure when a required step fails', async () => {
      // URL validation fails (returns wrong URL)
      executeScript.mockResolvedValue('https://wrong-url.com');

      const flow = createFlow({
        steps: [
          createFlowStep({
            retryable: false,
            optional: false,
          }),
        ],
      });

      const result = await executor.executeFlow(
        flow,
        executeScript,
        undefined,
        emitEvent,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Flow failed at step');
    });

    it('emits flow:step_failed when a required step fails', async () => {
      executeScript.mockResolvedValue('https://wrong-url.com');

      const flow = createFlow({
        steps: [
          createFlowStep({
            retryable: false,
            optional: false,
          }),
        ],
      });

      await executor.executeFlow(flow, executeScript, undefined, emitEvent);

      expect(emitEvent).toHaveBeenCalledWith(
        'flow:step_failed',
        expect.objectContaining({
          error: expect.any(String),
        }),
      );
    });

    it('returns failure when executeScript rejects during URL validation', async () => {
      // validateStepUrl catches errors internally and returns false,
      // which causes the step to fail with a URL validation error
      executeScript.mockRejectedValue(new Error('WebView crashed'));

      const flow = createFlow({
        steps: [createFlowStep({ optional: false, retryable: false })],
      });

      const result = await executor.executeFlow(
        flow,
        executeScript,
        undefined,
        emitEvent,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Flow failed at step');
      expect(emitEvent).toHaveBeenCalledWith(
        'flow:step_failed',
        expect.objectContaining({
          error: expect.any(String),
        }),
      );
    });

    it('skips optional steps that fail without aborting the flow', async () => {
      // First step URL check fails, second step URL check succeeds
      executeScript
        .mockResolvedValueOnce('https://wrong-url.com')
        .mockResolvedValueOnce('https://portal.example.com/step2');

      const flow = createFlow({
        steps: [
          createFlowStep({
            id: 'optional-step',
            name: 'Optional Step',
            optional: true,
          }),
          createFlowStep({
            id: 'required-step',
            name: 'Required Step',
            expectedUrl: 'https://portal.example.com/step2',
            urlPatterns: ['portal.example.com/step2'],
            validations: [],
          }),
        ],
      });

      const result = await executor.executeFlow(
        flow,
        executeScript,
        undefined,
        emitEvent,
      );

      expect(result.success).toBe(true);
      expect(result.data?.stepsCompleted).toBe(2);
    });
  });

  describe('executeFlowStep', () => {
    it('validates URL, runs actions, and validates completion', async () => {
      // URL validation returns matching URL
      executeScript.mockResolvedValueOnce(
        'https://portal.example.com/step1',
      );

      const step = createFlowStep({
        actions: [{ type: 'wait', value: 10 }],
        validations: [],
      });

      const result = await executor.executeFlowStep(
        step,
        executeScript,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({
          stepId: step.id,
          stepName: step.name,
        }),
      );
    });

    it('returns failure when URL validation fails for required step', async () => {
      executeScript.mockResolvedValue('https://unexpected-url.com');

      const step = createFlowStep({ optional: false });

      const result = await executor.executeFlowStep(
        step,
        executeScript,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('URL validation failed');
    });

    it('returns failure when an action fails in a required step', async () => {
      // URL validation passes
      executeScript.mockResolvedValueOnce(
        'https://portal.example.com/step1',
      );

      const step = createFlowStep({
        actions: [
          { type: 'click' } as FlowStepAction, // missing target
        ],
        validations: [],
      });

      const result = await executor.executeFlowStep(
        step,
        executeScript,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Action failed');
    });

    it('returns failure when completion validation fails', async () => {
      // URL check passes
      executeScript.mockResolvedValueOnce(
        'https://portal.example.com/step1',
      );

      // Element validation fails
      executeScript.mockResolvedValueOnce(false);

      const step = createFlowStep({
        actions: [],
        validations: [
          {
            type: 'element',
            target: '#success-message',
          },
        ],
      });

      const result = await executor.executeFlowStep(
        step,
        executeScript,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('executes custom action by running the provided script', async () => {
      // URL validation
      executeScript.mockResolvedValueOnce(
        'https://portal.example.com/step1',
      );
      // Custom action script
      executeScript.mockResolvedValueOnce({ clicked: true });

      const step = createFlowStep({
        actions: [
          {
            type: 'custom',
            script: 'document.querySelector("button").click()',
          },
        ],
        validations: [],
      });

      const result = await executor.executeFlowStep(
        step,
        executeScript,
      );

      expect(result.success).toBe(true);
    });

    it('returns URL validation failure when executeScript rejects', async () => {
      // validateStepUrl catches the rejection and returns false,
      // so the step fails with URL validation error, not a raw exception
      executeScript.mockRejectedValue(new Error('Timeout'));

      const step = createFlowStep({ optional: false });

      const result = await executor.executeFlowStep(
        step,
        executeScript,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('URL validation failed');
    });
  });

  describe('step failure with retry', () => {
    it('retries a failed retryable step and succeeds on retry', async () => {
      // First attempt: URL fails; retry: URL passes
      executeScript
        .mockResolvedValueOnce('https://wrong-url.com')
        .mockResolvedValueOnce('https://wrong-url.com')
        .mockResolvedValueOnce(
          'https://portal.example.com/step1',
        );

      const flow = createFlow({
        steps: [
          createFlowStep({
            retryable: true,
            optional: false,
          }),
        ],
      });

      const result = await executor.executeFlow(
        flow,
        executeScript,
        undefined,
        emitEvent,
      );

      expect(result.success).toBe(true);
    });

    it('returns failure when all retry attempts are exhausted', async () => {
      // All attempts return wrong URL
      executeScript.mockResolvedValue('https://wrong-url.com');

      const executor2 = new FlowExecutor(
        createConfig({ retryAttempts: 1 }),
      );

      const flow = createFlow({
        steps: [
          createFlowStep({
            retryable: true,
            optional: false,
          }),
        ],
      });

      const result = await executor2.executeFlow(
        flow,
        executeScript,
        undefined,
        emitEvent,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Flow failed at step');
    });
  });

  describe('flow events emitted during execution', () => {
    it('emits events in order: start, step_complete, complete', async () => {
      executeScript.mockResolvedValue(
        'https://portal.example.com/step1',
      );

      const flow = createFlow();
      const eventOrder: string[] = [];

      const trackingEmit = (event: string) => {
        eventOrder.push(event);
      };

      await executor.executeFlow(
        flow,
        executeScript,
        undefined,
        trackingEmit,
      );

      expect(eventOrder).toEqual([
        'flow:start',
        'flow:step_complete',
        'flow:complete',
      ]);
    });

    it('works without emitEvent callback', async () => {
      executeScript.mockResolvedValue(
        'https://portal.example.com/step1',
      );

      const flow = createFlow();

      const result = await executor.executeFlow(
        flow,
        executeScript,
      );

      expect(result.success).toBe(true);
    });

    it('emits flow:step_failed followed by flow:step_complete on successful retry', async () => {
      executeScript
        .mockResolvedValueOnce('https://wrong-url.com')
        .mockResolvedValueOnce('https://wrong-url.com')
        .mockResolvedValueOnce(
          'https://portal.example.com/step1',
        );

      const flow = createFlow({
        steps: [
          createFlowStep({
            retryable: true,
            optional: false,
          }),
        ],
      });

      const events: string[] = [];
      const trackingEmit = (event: string) => events.push(event);

      await executor.executeFlow(
        flow,
        executeScript,
        undefined,
        trackingEmit,
      );

      expect(events).toContain('flow:step_failed');
      expect(events).toContain('flow:step_complete');
      expect(events).toContain('flow:complete');
    });
  });
});
