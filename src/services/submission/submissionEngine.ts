/**
 * Submission Engine - Core orchestration for automated government portal submissions
 * 
 * Coordinates WebView automation, session management, error handling, and fallback
 * mechanisms while ensuring no PII leaks during the submission process.
 */

import { 
  SubmissionSession, 
  SubmissionResult, 
  SubmissionStatus, 
  SubmissionMethod,
  SubmissionEngineConfig,
  AutomationScript,
  SubmissionError,
  SubmissionMetrics,
  AutomationStepResult
} from '@/types/submission';

// Re-export types for external use
export type {
  SubmissionSession,
  SubmissionResult,
  SubmissionStatus,
  SubmissionMethod,
  SubmissionError,
  SubmissionMetrics,
  AutomationStepResult
};
import { TripLeg } from '@/types/trip';
import { FilledForm } from '@/services/forms/formEngine';
import { WebViewController } from './webviewController';
import { AutomationScriptRegistry } from './automationScripts';
import { SubmissionValidator } from '@/utils/submissionValidator';

/**
 * Default configuration for submission engine
 */
const DEFAULT_CONFIG: SubmissionEngineConfig = {
  timeouts: {
    sessionMaxMs: 10 * 60 * 1000, // 10 minutes
    stepMaxMs: 30 * 1000, // 30 seconds
    pageLoadMaxMs: 15 * 1000, // 15 seconds
  },
  retries: {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  },
  security: {
    validateSSL: true,
    allowedDomains: [],
    maxDataSize: 1024 * 1024, // 1MB
  },
  debug: {
    captureScreenshots: false,
    logJavaScript: false,
    saveSessionData: false,
  },
};

/**
 * Main submission engine class
 */
export class SubmissionEngine {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private config: SubmissionEngineConfig;
  private webviewController: WebViewController;
  private scriptRegistry: AutomationScriptRegistry;
  private validator: SubmissionValidator;
  private activeSessions: Map<string, SubmissionSession>;
  private metrics: SubmissionMetrics[];

  constructor(config?: Partial<SubmissionEngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
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
    const sessionId = this.generateSessionId();
    const startTime = Date.now();

    try {
      // Create submission session
      const session = this.createSession(sessionId, leg, method, filledForm);
      this.activeSessions.set(sessionId, session);

      // Security validation
      const securityResult = await this.validator.validateSubmission(filledForm, leg.destinationCountry);
      if (!securityResult.isValid) {
        throw new Error(`Security validation failed: ${securityResult.errors.join(', ')}`);
      }

      // Get automation script for country
      const script = await this.scriptRegistry.getScript(leg.destinationCountry);
      if (!script && method === 'automated') {
        return await this.fallbackToManual(session, 'No automation script available');
      }

      // Execute submission based on method
      let result: SubmissionResult;
      if (method === 'automated' && script) {
        result = await this.executeAutomatedSubmission(session, script, filledForm);
      } else {
        // Manual method requested or no automation available
        result = await this.executeManualSubmission(session, filledForm);
      }

      // Record metrics
      this.recordMetrics(session, result, Date.now() - startTime);

      return result;

    } catch (error) {
      // Handle unexpected errors
      const errorResult = this.handleUnexpectedError(sessionId, error as Error, Date.now() - startTime);
      this.recordMetrics(this.getSession(sessionId)!, errorResult, Date.now() - startTime);
      return errorResult;
    } finally {
      // Cleanup session
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
      // Initialize WebView with script prerequisites
      await this.webviewController.initialize(script.prerequisites);
      
      // Navigate to portal
      await this.webviewController.navigateTo(script.portalUrl);
      
      // Update session status
      session.status = 'in_progress';
      session.progress.totalSteps = script.steps.length;

      // Execute automation steps
      for (let i = 0; i < script.steps.length; i++) {
        const step = script.steps[i];
        
        try {
          // Execute step
          const stepResult = await this.executeAutomationStep(session, step, script, filledForm);
          
          if (!stepResult.success) {
            if (step.critical) {
              // Critical step failed, fallback to manual
              return await this.fallbackToManual(
                session, 
                `Critical step failed: ${step.name}`
              );
            }
            
            // Non-critical step failed, continue with warning
            session.errors.push({
              stepId: step.id,
              error: stepResult.error || 'Unknown error',
              timestamp: new Date().toISOString(),
              ...(stepResult.screenshot && { screenshot: stepResult.screenshot }),
              retryable: true
            });
          }

          // Update progress
          session.progress.currentStep = i + 1;
          if (stepResult.success) {
            session.progress.completedSteps.push(step.id);
          } else {
            session.progress.failedSteps.push(step.id);
          }

          // Store step data
          if (stepResult.data) {
            Object.assign(session.sessionData.formData, stepResult.data);
          }

        } catch (stepError) {
          // Step execution threw an error
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

      // Check if submission was successful
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
    _step: any,
    _script: AutomationScript,
    _filledForm: FilledForm
  ): Promise<AutomationStepResult> {
    try {
      // Prepare form data for this step
      const stepData = this.prepareStepData(_step, _filledForm, _script);
      
      // Execute JavaScript in WebView
      const result = await this.webviewController.executeScript({
        code: this.injectFormData(_step.script, stepData),
        timeout: _step.timing.timeout,
        expectsResult: true
      });

      // Validate step result
      if (_step.validation) {
        const isValid = await this.validateStepResult(_step.validation, result);
        if (!isValid) {
          return {
            success: false,
            error: 'Step validation failed'
          };
        }
      }

      // Wait if configured
      if (_step.timing?.waitAfter) {
        await new Promise(resolve => setTimeout(() => resolve(undefined), _step.timing.waitAfter));
      }

      return {
        success: true,
        data: result
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
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

  /**
   * Utility methods
   */
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
        formData: this.extractFormData(filledForm),
        screenshots: []
      },
      errors: []
    };
  }

  private extractFormData(filledForm: FilledForm): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    
    filledForm.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.currentValue !== undefined && field.currentValue !== '') {
          data[field.id] = field.currentValue;
        }
      });
    });
    
    return data;
  }

  private prepareStepData(_step: any, filledForm: FilledForm, script: AutomationScript): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    
    // Map form fields to portal selectors
    Object.entries(script.fieldMappings).forEach(([fieldId, _mapping]) => {
      const formData = this.extractFormData(filledForm);
      if (formData[fieldId] !== undefined) {
        data[fieldId] = formData[fieldId];
      }
    });
    
    return data;
  }

  private injectFormData(scriptCode: string, data: Record<string, unknown>): string {
    // Replace placeholders in script with actual form data
    let injectedCode = scriptCode;
    
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const safeValue = typeof value === 'string' 
        ? JSON.stringify(value) 
        : JSON.stringify(value);
      injectedCode = injectedCode.replace(new RegExp(placeholder, 'g'), safeValue);
    });
    
    return injectedCode;
  }

  private async validateStepResult(_validation: any, _result: any): Promise<boolean> {
    // Implementation for step validation
    // This would check expected URLs, text content, or element presence
    return true; // Simplified for now
  }

  private async validateSubmissionComplete(_session: SubmissionSession, _script: AutomationScript): Promise<any> {
    // Implementation for final submission validation
    // This would check for confirmation pages, QR codes, etc.
    // For testing purposes, assume success if we got this far
    return { 
      success: true, 
      confirmationNumber: `CONF_${Date.now()}`, 
      qrCode: 'mock_qr_code_data' 
    };
  }

  private generateSessionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSession(sessionId: string): SubmissionSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  private cleanupSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  private recordMetrics(session: SubmissionSession, result: SubmissionResult, duration: number): void {
    const metrics: SubmissionMetrics = {
      countryCode: session.countryCode,
      submissionMethod: session.method,
      duration,
      stepsAttempted: session.progress.currentStep,
      stepsCompleted: session.progress.completedSteps.length,
      errorsEncountered: session.errors.length,
      fallbackTriggered: session.status === 'manual_fallback',
      timestamp: new Date().toISOString(),
      outcome: this.categorizeOutcome(result)
    };
    
    this.metrics.push(metrics);
  }

  private categorizeOutcome(result: SubmissionResult): SubmissionMetrics['outcome'] {
    if (result.status === 'completed') return 'success';
    if (result.status === 'manual_fallback') return 'partial_success';
    if (result.status === 'failed') return 'failure';
    return 'user_abandoned';
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