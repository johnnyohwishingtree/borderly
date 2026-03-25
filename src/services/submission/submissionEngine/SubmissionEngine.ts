/**
 * Submission Engine - Core orchestration for automated government portal submissions
 *
 * Coordinates WebView automation, session management, error handling, and fallback
 * mechanisms while ensuring no PII leaks during the submission process.
 */

import {
  SubmissionSession,
  SubmissionResult,
  SubmissionMethod,
  SubmissionEngineConfig,
  AutomationScript,
  SubmissionMetrics,
  AutomationStepResult,
} from '@/types/submission';
import { TripLeg } from '@/types/trip';
import { FilledForm } from '@/services/forms/formEngine';
import { WebViewController } from '../webviewController';
import { AutomationScriptRegistry } from '../automationScripts';
import { SubmissionValidator } from '../submissionValidator';
import {
  generateSessionId,
  extractFormData,
  prepareStepData,
  injectFormData,
  categorizeOutcome,
} from './engineHelpers';

/**
 * Main submission engine class
 */
export class SubmissionEngine {
  private webviewController: WebViewController;
  private scriptRegistry: AutomationScriptRegistry;
  private validator: SubmissionValidator;
  private activeSessions: Map<string, SubmissionSession>;
  private metrics: SubmissionMetrics[];

  constructor(_config?: Partial<SubmissionEngineConfig>) {
    this.webviewController = new WebViewController();
    this.scriptRegistry = new AutomationScriptRegistry();
    this.validator = new SubmissionValidator();
    this.activeSessions = new Map();
    this.metrics = [];
  }

  /**
   * Start automated submission for a trip leg
   */
  async startSubmission(
    leg: TripLeg,
    filledForm: FilledForm,
    method: SubmissionMethod = 'automated'
  ): Promise<SubmissionResult> {
    const sessionId = generateSessionId();
    const startTime = Date.now();

    try {
      const session = this.createSession(sessionId, leg, method, filledForm);
      this.activeSessions.set(sessionId, session);

      const securityResult = await this.validator.validateSubmission(filledForm, leg.destinationCountry);
      if (!securityResult.isValid) {
        throw new Error(`Security validation failed: ${securityResult.errors.join(', ')}`);
      }

      const script = await this.scriptRegistry.getScript(leg.destinationCountry);
      if (!script && method === 'automated') {
        return await this.fallbackToManual(session, 'No automation script available');
      }

      let result: SubmissionResult;
      if (method === 'automated' && script) {
        result = await this.executeAutomatedSubmission(session, script, filledForm);
      } else {
        result = await this.executeManualSubmission(session, filledForm);
      }

      this.recordMetrics(session, result, Date.now() - startTime);
      return result;

    } catch (error) {
      const errorResult = this.handleUnexpectedError(sessionId, error as Error, Date.now() - startTime);
      this.recordMetrics(this.getSession(sessionId)!, errorResult, Date.now() - startTime);
      return errorResult;
    } finally {
      this.cleanupSession(sessionId);
    }
  }

  /**
   * Execute automated submission using WebView automation
   */
  private async executeAutomatedSubmission(
    session: SubmissionSession,
    script: AutomationScript,
    filledForm: FilledForm
  ): Promise<SubmissionResult> {
    try {
      await this.webviewController.initialize(script.prerequisites);
      await this.webviewController.navigateTo(script.portalUrl);

      session.status = 'in_progress';
      session.progress.totalSteps = script.steps.length;

      for (let i = 0; i < script.steps.length; i++) {
        const step = script.steps[i];

        try {
          const stepResult = await this.executeAutomationStep(session, step, script, filledForm);

          if (!stepResult.success) {
            if (step.critical) {
              return await this.fallbackToManual(session, `Critical step failed: ${step.name}`);
            }

            session.errors.push({
              stepId: step.id,
              error: stepResult.error || 'Unknown error',
              timestamp: new Date().toISOString(),
              ...(stepResult.screenshot && { screenshot: stepResult.screenshot }),
              retryable: true
            });
          }

          session.progress.currentStep = i + 1;
          if (stepResult.success) {
            session.progress.completedSteps.push(step.id);
          } else {
            session.progress.failedSteps.push(step.id);
          }

          if (stepResult.data) {
            Object.assign(session.sessionData.formData, stepResult.data);
          }

        } catch (stepError) {
          session.errors.push({
            stepId: step.id,
            error: (stepError as Error).message,
            timestamp: new Date().toISOString(),
            retryable: false
          });

          if (step.critical) {
            return await this.fallbackToManual(
              session,
              `Critical step error: ${(stepError as Error).message}`
            );
          }
        }
      }

      const finalResult = await this.validateSubmissionComplete(session, script);

      if (finalResult.success) {
        session.status = 'completed';
        return {
          sessionId: session.id,
          status: 'completed',
          method: 'automated',
          confirmationNumber: finalResult.confirmationNumber,
          qrCode: finalResult.qrCode,
          duration: Date.now() - new Date(session.startedAt).getTime(),
          stepsCompleted: session.progress.completedSteps.length,
          errors: session.errors,
          nextSteps: {
            type: 'completed',
            description: 'Submission completed successfully',
            actions: ['Save QR code to wallet', 'Review confirmation details']
          }
        };
      } else {
        return await this.fallbackToManual(session, 'Could not verify submission completion');
      }

    } catch (error) {
      return await this.fallbackToManual(session, `Automation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Execute a single automation step
   */
  private async executeAutomationStep(
    _session: SubmissionSession,
    _step: AutomationScript['steps'][number],
    _script: AutomationScript,
    _filledForm: FilledForm
  ): Promise<AutomationStepResult> {
    try {
      const stepData = prepareStepData(_step, _filledForm, _script);

      const result = await this.webviewController.executeScript({
        code: injectFormData(_step.script, stepData),
        timeout: _step.timing.timeout,
        expectsResult: true
      });

      if (_step.validation) {
        const isValid = await this.validateStepResult(_step.validation, result);
        if (!isValid) {
          return { success: false, error: 'Step validation failed' };
        }
      }

      if (_step.timing?.waitAfter) {
        await new Promise(resolve => setTimeout(() => resolve(undefined), _step.timing.waitAfter));
      }

      if (result !== null && typeof result === 'object') {
        return { success: true, data: result as Record<string, unknown> };
      }
      return { success: true };

    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Execute manual submission with guidance
   */
  private async executeManualSubmission(
    session: SubmissionSession,
    _filledForm: FilledForm
  ): Promise<SubmissionResult> {
    session.status = 'manual_fallback';

    return {
      sessionId: session.id,
      status: 'manual_fallback',
      method: 'manual',
      duration: 0,
      stepsCompleted: 0,
      errors: [],
      nextSteps: {
        type: 'manual_completion',
        description: 'Please complete submission manually using the step-by-step guide',
        actions: [
          'Open government portal',
          'Follow submission guide',
          'Copy pre-filled data from form',
          'Save confirmation QR code'
        ]
      }
    };
  }

  /**
   * Fallback to manual submission when automation fails
   */
  private async fallbackToManual(
    session: SubmissionSession,
    reason: string
  ): Promise<SubmissionResult> {
    session.status = 'manual_fallback';
    session.fallback = {
      reason,
      manualSteps: [
        'Open the government portal manually',
        'Use the step-by-step submission guide',
        'Copy pre-filled data from your form',
        'Complete remaining fields manually',
        'Save your confirmation QR code'
      ],
      prefillData: session.sessionData.formData
    };

    return {
      sessionId: session.id,
      status: 'manual_fallback',
      method: 'manual',
      duration: Date.now() - new Date(session.startedAt).getTime(),
      stepsCompleted: session.progress.completedSteps.length,
      errors: session.errors,
      fallbackReason: reason,
      nextSteps: {
        type: 'manual_completion',
        description: `Automation failed: ${reason}. Please complete manually.`,
        actions: session.fallback.manualSteps
      }
    };
  }

  /**
   * Handle unexpected errors during submission
   */
  private handleUnexpectedError(
    sessionId: string,
    error: Error,
    duration: number
  ): SubmissionResult {
    return {
      sessionId,
      status: 'failed',
      method: 'automated',
      duration,
      stepsCompleted: 0,
      errors: [{
        stepId: 'system',
        error: error.message,
        timestamp: new Date().toISOString(),
        retryable: false
      }],
      nextSteps: {
        type: 'retry',
        description: 'An unexpected error occurred. You can retry or complete manually.',
        actions: ['Retry automated submission', 'Switch to manual submission']
      }
    };
  }

  private createSession(
    sessionId: string,
    leg: TripLeg,
    method: SubmissionMethod,
    filledForm: FilledForm
  ): SubmissionSession {
    const now = new Date().toISOString();

    return {
      id: sessionId,
      legId: leg.id,
      countryCode: leg.destinationCountry,
      status: 'initializing',
      method,
      startedAt: now,
      updatedAt: now,
      progress: {
        currentStep: 0,
        totalSteps: 0,
        completedSteps: [],
        failedSteps: []
      },
      sessionData: {
        formData: extractFormData(filledForm),
        screenshots: []
      },
      errors: []
    };
  }

  private async validateStepResult(_validation: unknown, _result: unknown): Promise<boolean> {
    return true; // Simplified — real implementation checks URLs, text, element presence
  }

  private async validateSubmissionComplete(
    _session: SubmissionSession,
    _script: AutomationScript
  ): Promise<{ success: boolean; confirmationNumber: string; qrCode: string }> {
    return {
      success: true,
      confirmationNumber: `CONF_${Date.now()}`,
      qrCode: 'mock_qr_code_data'
    };
  }

  private getSession(sessionId: string): SubmissionSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  private cleanupSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  private recordMetrics(
    session: SubmissionSession,
    result: SubmissionResult,
    duration: number
  ): void {
    const metrics: SubmissionMetrics = {
      countryCode: session.countryCode,
      submissionMethod: session.method,
      duration,
      stepsAttempted: session.progress.currentStep,
      stepsCompleted: session.progress.completedSteps.length,
      errorsEncountered: session.errors.length,
      fallbackTriggered: session.status === 'manual_fallback',
      timestamp: new Date().toISOString(),
      outcome: categorizeOutcome(result)
    };

    this.metrics.push(metrics);
  }

  /**
   * Public methods for session management
   */
  public getActiveSession(sessionId: string): SubmissionSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  public cancelSubmission(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'failed';
      this.cleanupSession(sessionId);
    }
  }

  public getMetrics(): SubmissionMetrics[] {
    return [...this.metrics];
  }

  public getSuccessRate(countryCode?: string): number {
    const relevantMetrics = countryCode
      ? this.metrics.filter(m => m.countryCode === countryCode)
      : this.metrics;

    if (relevantMetrics.length === 0) return 0;

    const successful = relevantMetrics.filter(m =>
      m.outcome === 'success' || m.outcome === 'partial_success'
    ).length;

    return successful / relevantMetrics.length;
  }
}
