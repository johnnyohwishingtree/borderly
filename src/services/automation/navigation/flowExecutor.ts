/**
 * Flow Executor — Handles multi-step navigation flow execution and validation
 */

import type {
  AutomationStepResult,
  NavigationConfig,
  FlowStep,
  FlowStepAction,
  FlowStepValidation,
  NavigationFlow,
} from './navigationTypes';

/**
 * Executes navigation flows composed of multiple steps with retry and validation
 */
export class FlowExecutor {
  constructor(private config: NavigationConfig) {}

  /**
   * Execute a complete navigation flow
   */
  async executeFlow(
    flow: NavigationFlow,
    executeScript: (code: string) => Promise<any>,
    initialData?: Record<string, unknown>,
    emitEvent?: (event: string, data: any) => void
  ): Promise<AutomationStepResult> {
    const flowStartTime = Date.now();

    try {
      emitEvent?.('flow:start', { flow, initialData });

      for (let i = 0; i < flow.steps.length; i++) {
        const step = flow.steps[i];

        const stepResult = await this.executeFlowStep(step, executeScript, initialData);

        if (!stepResult.success && !step.optional) {
          emitEvent?.('flow:step_failed', { flow, step, error: stepResult.error });

          if (step.retryable) {
            const retryResult = await this.retryFlowStep(step, executeScript, initialData);
            if (!retryResult.success) {
              return {
                success: false,
                error: `Flow failed at step ${step.name}: ${retryResult.error}`
              };
            }
          } else {
            return {
              success: false,
              error: `Flow failed at step ${step.name}: ${stepResult.error}`
            };
          }
        }

        if (Date.now() - flowStartTime > flow.maxDuration) {
          return {
            success: false,
            error: 'Flow execution timeout'
          };
        }

        emitEvent?.('flow:step_complete', { flow, step, result: stepResult });
      }

      emitEvent?.('flow:complete', { flow, duration: Date.now() - flowStartTime });

      return {
        success: true,
        data: {
          flowId: flow.id,
          stepsCompleted: flow.steps.length,
          duration: Date.now() - flowStartTime
        }
      };

    } catch (error) {
      emitEvent?.('flow:error', { flow, error: (error as Error).message });

      return {
        success: false,
        error: `Flow execution error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Execute a single flow step
   */
  async executeFlowStep(
    step: FlowStep,
    executeScript: (code: string) => Promise<any>,
    data?: Record<string, unknown>
  ): Promise<AutomationStepResult> {
    const startTime = Date.now();

    try {
      const urlValid = await this.validateStepUrl(step, executeScript);
      if (!urlValid && !step.optional) {
        return {
          success: false,
          error: `URL validation failed for step ${step.name}`
        };
      }

      for (const action of step.actions) {
        const actionResult = await this.executeStepAction(action, executeScript, data);
        if (!actionResult.success && !step.optional) {
          return {
            success: false,
            error: `Action failed in step ${step.name}: ${actionResult.error}`
          };
        }
      }

      const validationResult = await this.validateStepCompletion(step, executeScript);
      if (!validationResult.success && !step.optional) {
        return {
          success: false,
          error: `Validation failed for step ${step.name}: ${validationResult.error}`
        };
      }

      return {
        success: true,
        data: {
          stepId: step.id,
          stepName: step.name,
          duration: Date.now() - startTime
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Step execution error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Retry a failed flow step
   */
  private async retryFlowStep(
    step: FlowStep,
    executeScript: (code: string) => Promise<any>,
    data?: Record<string, unknown>
  ): Promise<AutomationStepResult> {
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      await new Promise<void>(resolve => setTimeout(() => resolve(), this.config.navigationDelay * attempt));

      const result = await this.executeFlowStep(step, executeScript, data);
      if (result.success) {
        return result;
      }

      if (attempt === this.config.retryAttempts) {
        return result;
      }
    }

    return { success: false, error: 'All retry attempts failed' };
  }

  /**
   * Execute a step action
   */
  private async executeStepAction(
    action: FlowStepAction,
    executeScript: (code: string) => Promise<any>,
    _data?: Record<string, unknown>
  ): Promise<AutomationStepResult> {
    switch (action.type) {
      case 'click':
        if (!action.target) {
          return { success: false, error: 'Click action missing target' };
        }
        return { success: true };

      case 'fill':
        if (!action.target || action.value === undefined) {
          return { success: false, error: 'Fill action missing target or value' };
        }
        return { success: true };

      case 'wait':
        await new Promise<void>(resolve => setTimeout(() => resolve(), action.value || 1000));
        return { success: true };

      case 'custom':
        if (!action.script) {
          return { success: false, error: 'Custom action missing script' };
        }
        try {
          const result = await executeScript(action.script);
          return { success: true, data: result };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  }

  /**
   * Validate step URL
   */
  private async validateStepUrl(
    step: FlowStep,
    executeScript: (code: string) => Promise<any>
  ): Promise<boolean> {
    try {
      const currentUrl = await executeScript('window.location.href');

      if (typeof step.expectedUrl === 'string') {
        return currentUrl === step.expectedUrl;
      } else if (step.expectedUrl instanceof RegExp) {
        return step.expectedUrl.test(currentUrl);
      }

      return step.urlPatterns.some(pattern =>
        currentUrl.includes(pattern) || new RegExp(pattern).test(currentUrl)
      );

    } catch {
      return false;
    }
  }

  /**
   * Validate step completion
   */
  private async validateStepCompletion(
    step: FlowStep,
    executeScript: (code: string) => Promise<any>
  ): Promise<AutomationStepResult> {
    for (const validation of step.validations) {
      const result = await this.executeValidation(validation, executeScript);
      if (!result.success) {
        return result;
      }
    }

    return { success: true };
  }

  /**
   * Execute a validation
   */
  private async executeValidation(
    validation: FlowStepValidation,
    executeScript: (code: string) => Promise<any>
  ): Promise<AutomationStepResult> {
    try {
      switch (validation.type) {
        case 'url': {
          const currentUrl = await executeScript('window.location.href');
          const urlMatch = currentUrl.includes(validation.target);
          const urlResult: AutomationStepResult = { success: urlMatch };
          if (!urlMatch) {
            urlResult.error = `URL validation failed: ${currentUrl} does not contain ${validation.target}`;
          }
          return urlResult;
        }

        case 'element': {
          const elementExists = await executeScript(
            `document.querySelector('${validation.target}') !== null`
          );
          const elementResult: AutomationStepResult = { success: elementExists };
          if (!elementExists) {
            elementResult.error = `Element not found: ${validation.target}`;
          }
          return elementResult;
        }

        case 'text': {
          const pageText = await executeScript('document.body.textContent || document.body.innerText');
          const hasText = pageText.includes(validation.expectedValue || validation.target);
          const textResult: AutomationStepResult = { success: hasText };
          if (!hasText) {
            textResult.error = `Text not found: ${validation.expectedValue || validation.target}`;
          }
          return textResult;
        }

        case 'custom': {
          if (!validation.script) {
            return { success: false, error: 'Custom validation missing script' };
          }
          const customResult = await executeScript(validation.script);
          return {
            success: Boolean(customResult),
            data: customResult
          };
        }

        default:
          return { success: false, error: `Unknown validation type: ${validation.type}` };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
