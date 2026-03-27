/**
 * Tests for SubmissionEngine — core submission workflow orchestration
 */

import { SubmissionEngine } from '@/services/submission/submissionEngine/SubmissionEngine';
import { TripLeg } from '@/types/trip';
import { FilledForm } from '@/services/forms/formEngine';
import { AutomationScript } from '@/types/submission';

// ---------------------------------------------------------------------------
// Module-level mock references (stable across renders)
// ---------------------------------------------------------------------------

const mockInitialize = jest.fn().mockResolvedValue(undefined);
const mockNavigateTo = jest.fn().mockResolvedValue(undefined);
const mockExecuteScript = jest.fn().mockResolvedValue({});

jest.mock('@/services/submission/webviewController', () => ({
  WebViewController: jest.fn().mockImplementation(() => ({
    initialize: mockInitialize,
    navigateTo: mockNavigateTo,
    executeScript: mockExecuteScript,
  })),
}));

const mockGetScript = jest.fn();

jest.mock('@/services/submission/automationScripts', () => ({
  AutomationScriptRegistry: jest.fn().mockImplementation(() => ({
    getScript: mockGetScript,
  })),
}));

const mockValidateSubmission = jest.fn();

jest.mock('@/services/submission/submissionValidator', () => ({
  SubmissionValidator: jest.fn().mockImplementation(() => ({
    validateSubmission: mockValidateSubmission,
  })),
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const defaultFieldProps = {
  source: 'auto' as const,
  needsUserInput: false,
  countrySpecific: false,
};

function makeTripLeg(overrides?: Partial<TripLeg>): TripLeg {
  return {
    id: 'leg-123',
    tripId: 'trip-123',
    destinationCountry: 'JPN',
    arrivalDate: '2026-06-10',
    departureDate: '2026-06-15',
    flightNumber: 'NH123',
    airlineCode: 'NH',
    arrivalAirport: 'NRT',
    accommodation: {
      name: 'Test Hotel',
      address: {
        line1: '123 Test St',
        city: 'Tokyo',
        postalCode: '100-0001',
        country: 'JPN',
      },
    },
    formStatus: 'ready',
    submissionStatus: 'not_started',
    order: 1,
    ...overrides,
  };
}

function makeFilledForm(overrides?: Partial<FilledForm>): FilledForm {
  return {
    countryCode: 'JPN',
    countryName: 'Japan',
    portalName: 'Visit Japan Web',
    portalUrl: 'https://vjw-lp.digital.go.jp/en/',
    sections: [
      {
        id: 'personal',
        title: 'Personal Information',
        fields: [
          {
            id: 'surname',
            label: 'Surname',
            type: 'text',
            required: true,
            currentValue: 'Doe',
            ...defaultFieldProps,
          },
          {
            id: 'givenNames',
            label: 'Given Names',
            type: 'text',
            required: true,
            currentValue: 'John',
            ...defaultFieldProps,
          },
        ],
      },
    ],
    stats: {
      totalFields: 2,
      autoFilled: 2,
      userFilled: 0,
      remaining: 0,
      completionPercentage: 100,
    },
    ...overrides,
  };
}

function makeScript(overrides?: Partial<AutomationScript>): AutomationScript {
  return {
    countryCode: 'JPN',
    portalUrl: 'https://vjw-lp.digital.go.jp/en/',
    version: '1.0.0',
    lastUpdated: '2026-01-01',
    prerequisites: { cookiesEnabled: true, javascriptEnabled: true },
    steps: [
      {
        id: 'step-1',
        name: 'Fill personal info',
        description: 'Fill in the personal information section',
        script: 'document.querySelector("#surname").value = {{surname}};',
        timing: { timeout: 5000 },
        critical: true,
      },
      {
        id: 'step-2',
        name: 'Submit form',
        description: 'Click the submit button',
        script: 'document.querySelector("#submit").click();',
        timing: { timeout: 5000 },
        critical: true,
      },
    ],
    fieldMappings: {
      surname: { fieldId: 'surname', selector: '#surname', inputType: 'text' as const },
    },
    session: {
      maxDurationMs: 600000,
      keepAlive: true,
      clearCookiesOnStart: true,
    },
    ...overrides,
  };
}

function validSecurityResult() {
  return {
    isValid: true,
    warnings: [],
    errors: [],
    checks: {
      noPIILeakage: true,
      validDomain: true,
      secureConnection: true,
      dataWithinLimits: true,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SubmissionEngine', () => {
  let engine: SubmissionEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new SubmissionEngine();

    // Default: validation passes
    mockValidateSubmission.mockResolvedValue(validSecurityResult());

    // Default: script available for JPN
    mockGetScript.mockImplementation((countryCode: string) => {
      if (countryCode === 'JPN') return Promise.resolve(makeScript());
      return Promise.resolve(null);
    });

    // Default: WebView script execution succeeds
    mockExecuteScript.mockResolvedValue({});

    // Mock validateSubmissionComplete to return success
    jest.spyOn(engine as never, 'validateSubmissionComplete' as never).mockResolvedValue({
      success: true,
      confirmationNumber: 'CONF-TEST-123',
      qrCode: 'mock-qr-code-data',
    } as never);
  });

  // -------------------------------------------------------------------------
  // constructor
  // -------------------------------------------------------------------------
  describe('constructor', () => {
    it('creates an instance with default config', () => {
      const e = new SubmissionEngine();
      expect(e).toBeInstanceOf(SubmissionEngine);
    });

    it('creates an instance with partial config', () => {
      const e = new SubmissionEngine({ debug: { captureScreenshots: true, logJavaScript: false, saveSessionData: false } });
      expect(e).toBeInstanceOf(SubmissionEngine);
    });
  });

  // -------------------------------------------------------------------------
  // startSubmission — happy path
  // -------------------------------------------------------------------------
  describe('startSubmission — happy path', () => {
    it('completes automated submission with confirmation number and QR code', async () => {
      const result = await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      expect(result.status).toBe('completed');
      expect(result.method).toBe('automated');
      expect(result.confirmationNumber).toBe('CONF-TEST-123');
      expect(result.qrCode).toBe('mock-qr-code-data');
      expect(result.nextSteps.type).toBe('completed');
    });

    it('initializes WebView and navigates to portal URL', async () => {
      await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      expect(mockInitialize).toHaveBeenCalledTimes(1);
      expect(mockNavigateTo).toHaveBeenCalledWith('https://vjw-lp.digital.go.jp/en/');
    });

    it('executes each automation step', async () => {
      const script = makeScript();
      mockGetScript.mockResolvedValue(script);

      await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      expect(mockExecuteScript).toHaveBeenCalledTimes(script.steps.length);
    });

    it('records metrics after successful submission', async () => {
      await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      const metrics = engine.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].countryCode).toBe('JPN');
      expect(metrics[0].outcome).toBe('success');
      expect(metrics[0].fallbackTriggered).toBe(false);
    });

    it('cleans up session after completion', async () => {
      const result = await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      expect(engine.getActiveSession(result.sessionId)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // startSubmission — manual submission
  // -------------------------------------------------------------------------
  describe('startSubmission — manual submission', () => {
    it('returns manual fallback result with guidance actions', async () => {
      const result = await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'manual');

      expect(result.status).toBe('manual_fallback');
      expect(result.method).toBe('manual');
      expect(result.nextSteps.type).toBe('manual_completion');
      expect(result.nextSteps.actions).toContain('Open government portal');
    });

    it('does not call WebView for manual submissions', async () => {
      await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'manual');

      expect(mockInitialize).not.toHaveBeenCalled();
      expect(mockNavigateTo).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Error path: network failure during submission
  // -------------------------------------------------------------------------
  describe('error path — network failure during submission', () => {
    it('falls back to manual when WebView initialization fails', async () => {
      mockInitialize.mockRejectedValueOnce(new Error('Network error: unable to connect'));

      const result = await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      expect(result.status).toBe('manual_fallback');
      expect(result.method).toBe('manual');
      expect(result.fallbackReason).toContain('Network error');
    });

    it('falls back to manual when navigation fails', async () => {
      mockNavigateTo.mockRejectedValueOnce(new Error('Navigation timeout'));

      const result = await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      expect(result.status).toBe('manual_fallback');
      expect(result.fallbackReason).toContain('Navigation timeout');
    });

    it('falls back to manual when a critical step script execution fails', async () => {
      mockExecuteScript.mockRejectedValueOnce(new Error('Connection reset'));

      const result = await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      expect(result.status).toBe('manual_fallback');
      // executeAutomationStep catches the error, returns { success: false },
      // so the fallback reason references the step name, not the original error
      expect(result.fallbackReason).toContain('Critical step failed');
    });
  });

  // -------------------------------------------------------------------------
  // Error path: portal detection failure (no automation script)
  // -------------------------------------------------------------------------
  describe('error path — portal detection failure', () => {
    it('falls back to manual when no automation script exists for country', async () => {
      const leg = makeTripLeg({ destinationCountry: 'XXX' });

      const result = await engine.startSubmission(leg, makeFilledForm(), 'automated');

      expect(result.status).toBe('manual_fallback');
      expect(result.method).toBe('manual');
      expect(result.fallbackReason).toContain('No automation script available');
    });

    it('does not record metrics when falling back due to missing script', async () => {
      // The engine returns early from fallbackToManual before recordMetrics
      const leg = makeTripLeg({ destinationCountry: 'XXX' });
      await engine.startSubmission(leg, makeFilledForm(), 'automated');

      const metrics = engine.getMetrics();
      expect(metrics).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Error path: form validation failure before submission
  // -------------------------------------------------------------------------
  describe('error path — form validation failure', () => {
    it('returns failed status when security validation rejects the form', async () => {
      mockValidateSubmission.mockResolvedValueOnce({
        isValid: false,
        warnings: [],
        errors: ['PII detected in metadata', 'Invalid domain'],
        checks: {
          noPIILeakage: false,
          validDomain: false,
          secureConnection: true,
          dataWithinLimits: true,
        },
      });

      const result = await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      expect(result.status).toBe('failed');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Security validation failed');
      expect(result.errors[0].error).toContain('PII detected in metadata');
    });

    it('does not attempt automation when validation fails', async () => {
      mockValidateSubmission.mockResolvedValueOnce({
        isValid: false,
        warnings: [],
        errors: ['Data exceeds size limit'],
        checks: { noPIILeakage: true, validDomain: true, secureConnection: true, dataWithinLimits: false },
      });

      await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      expect(mockInitialize).not.toHaveBeenCalled();
      expect(mockGetScript).not.toHaveBeenCalled();
    });

    it('records metrics with failure outcome on validation error', async () => {
      mockValidateSubmission.mockResolvedValueOnce({
        isValid: false,
        warnings: [],
        errors: ['Validation failed'],
        checks: { noPIILeakage: true, validDomain: false, secureConnection: true, dataWithinLimits: true },
      });

      await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      const metrics = engine.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].outcome).toBe('failure');
    });
  });

  // -------------------------------------------------------------------------
  // Edge case: retry after partial submission (non-critical step failure)
  // -------------------------------------------------------------------------
  describe('edge case — partial submission with non-critical step failure', () => {
    it('continues past non-critical step failure and completes submission', async () => {
      const script = makeScript({
        steps: [
          {
            id: 'optional-step',
            name: 'Optional analytics',
            description: 'Non-critical step',
            script: 'trackAnalytics();',
            timing: { timeout: 3000 },
            critical: false,
          },
          {
            id: 'critical-step',
            name: 'Submit form',
            description: 'Submit the form',
            script: 'submitForm();',
            timing: { timeout: 5000 },
            critical: true,
          },
        ],
      });
      mockGetScript.mockResolvedValue(script);

      // First step throws (non-critical), second succeeds
      mockExecuteScript
        .mockRejectedValueOnce(new Error('Analytics unavailable'))
        .mockResolvedValueOnce({});

      const result = await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      expect(result.status).toBe('completed');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stepId).toBe('optional-step');
    });

    it('falls back to manual when critical step throws after successful non-critical steps', async () => {
      const script = makeScript({
        steps: [
          {
            id: 'step-ok',
            name: 'Fill form',
            description: 'Fill form fields',
            script: 'fillForm();',
            timing: { timeout: 5000 },
            critical: false,
          },
          {
            id: 'step-fail',
            name: 'Submit',
            description: 'Submit the form',
            script: 'submit();',
            timing: { timeout: 5000 },
            critical: true,
          },
        ],
      });
      mockGetScript.mockResolvedValue(script);

      // First step succeeds, second throws
      mockExecuteScript
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Server error'));

      const result = await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      expect(result.status).toBe('manual_fallback');
      expect(result.fallbackReason).toContain('Critical step failed: Submit');
      expect(result.stepsCompleted).toBeGreaterThanOrEqual(0);
    });
  });

  // -------------------------------------------------------------------------
  // Edge case: submission completion verification fails
  // -------------------------------------------------------------------------
  describe('edge case — submission completion verification fails', () => {
    it('falls back to manual when completion verification returns false', async () => {
      jest.spyOn(engine as never, 'validateSubmissionComplete' as never).mockResolvedValue({
        success: false,
        confirmationNumber: '',
        qrCode: '',
      } as never);

      const result = await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      expect(result.status).toBe('manual_fallback');
      expect(result.fallbackReason).toContain('Could not verify submission completion');
    });
  });

  // -------------------------------------------------------------------------
  // Session management
  // -------------------------------------------------------------------------
  describe('session management', () => {
    it('cleans up session after submission completes', async () => {
      const result = await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      expect(engine.getActiveSession(result.sessionId)).toBeUndefined();
    });

    it('cleans up session after submission fails', async () => {
      mockValidateSubmission.mockResolvedValueOnce({
        isValid: false,
        warnings: [],
        errors: ['Bad data'],
        checks: { noPIILeakage: true, validDomain: false, secureConnection: true, dataWithinLimits: true },
      });

      const result = await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      expect(engine.getActiveSession(result.sessionId)).toBeUndefined();
    });

    it('cancelSubmission removes session from active map', () => {
      engine.cancelSubmission('non-existent-session');
      expect(engine.getActiveSession('non-existent-session')).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Metrics and success rate
  // -------------------------------------------------------------------------
  describe('metrics', () => {
    it('returns empty metrics array initially', () => {
      expect(engine.getMetrics()).toEqual([]);
    });

    it('returns 0 success rate with no metrics', () => {
      expect(engine.getSuccessRate()).toBe(0);
    });

    it('returns 0 success rate for specific country with no metrics', () => {
      expect(engine.getSuccessRate('JPN')).toBe(0);
    });

    it('calculates correct success rate across multiple submissions', async () => {
      // Successful submission
      await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      // Failed submission (validation failure)
      mockValidateSubmission.mockResolvedValueOnce({
        isValid: false,
        warnings: [],
        errors: ['Validation error'],
        checks: { noPIILeakage: true, validDomain: false, secureConnection: true, dataWithinLimits: true },
      });
      await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      const rate = engine.getSuccessRate();
      expect(rate).toBe(0.5);
    });

    it('filters success rate by country code', async () => {
      // Successful JPN submission
      await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      // Failed JPN submission (validation failure)
      mockValidateSubmission.mockResolvedValueOnce({
        isValid: false,
        warnings: [],
        errors: ['Bad data'],
        checks: { noPIILeakage: true, validDomain: false, secureConnection: true, dataWithinLimits: true },
      });
      await engine.startSubmission(makeTripLeg(), makeFilledForm(), 'automated');

      // 1 success + 1 failure for JPN → 50%
      expect(engine.getSuccessRate('JPN')).toBe(0.5);
      // No MYS submissions
      expect(engine.getSuccessRate('MYS')).toBe(0);
    });

    it('returns a copy of metrics array (not a reference)', () => {
      const m1 = engine.getMetrics();
      const m2 = engine.getMetrics();
      expect(m1).not.toBe(m2);
    });
  });
});
