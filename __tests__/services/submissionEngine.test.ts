/**
 * Tests for SubmissionEngine
 */

import { SubmissionEngine } from '@/services/submission/submissionEngine';
import { TripLeg } from '@/types/trip';
import { FilledForm } from '@/services/forms/formEngine';

// Mock dependencies
jest.mock('@/services/submission/webviewController');
jest.mock('@/services/submission/automationScripts');
jest.mock('@/utils/submissionValidator');

describe('SubmissionEngine', () => {
  let submissionEngine: SubmissionEngine;

  beforeEach(() => {
    submissionEngine = new SubmissionEngine({
      debug: {
        captureScreenshots: false,
        logJavaScript: false,
        saveSessionData: false
      }
    });
  });

  describe('constructor', () => {
    it('should initialize with default config when no config provided', () => {
      const engine = new SubmissionEngine();
      expect(engine).toBeInstanceOf(SubmissionEngine);
    });

    it('should merge provided config with defaults', () => {
      const customConfig = {
        timeouts: {
          sessionMaxMs: 5 * 60 * 1000,
          stepMaxMs: 15 * 1000,
          pageLoadMaxMs: 10 * 1000
        }
      };
      
      const engine = new SubmissionEngine(customConfig);
      expect(engine).toBeInstanceOf(SubmissionEngine);
    });
  });

  describe('startSubmission', () => {
    const mockLeg: TripLeg = {
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
          country: 'JPN'
        }
      },
      formStatus: 'ready',
      order: 1
    };

    const mockFilledForm: FilledForm = {
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
              source: 'auto',
              needsUserInput: false,
              countrySpecific: false
            }
          ]
        }
      ],
      stats: {
        totalFields: 1,
        autoFilled: 1,
        userFilled: 0,
        remaining: 0,
        completionPercentage: 100
      }
    };

    it('should start automated submission successfully', async () => {
      const result = await submissionEngine.startSubmission(
        mockLeg,
        mockFilledForm,
        'automated'
      );

      expect(result).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(result.method).toBe('automated');
    });

    it('should fallback to manual submission when automation not available', async () => {
      const legWithoutAutomation = { ...mockLeg, destinationCountry: 'XXX' };
      
      const result = await submissionEngine.startSubmission(
        legWithoutAutomation,
        mockFilledForm,
        'automated'
      );

      expect(result.method).toBe('manual');
      expect(result.status).toBe('manual_fallback');
    });

    it('should handle manual submission method', async () => {
      const result = await submissionEngine.startSubmission(
        mockLeg,
        mockFilledForm,
        'manual'
      );

      expect(result.method).toBe('manual');
      expect(result.status).toBe('manual_fallback');
      expect(result.nextSteps.type).toBe('manual_completion');
    });
  });

  describe('session management', () => {
    it('should track active sessions', async () => {
      const mockLeg: TripLeg = {
        id: 'leg-123',
        tripId: 'trip-123',
        destinationCountry: 'JPN',
        arrivalDate: '2026-06-10',
        accommodation: {
          name: 'Test Hotel',
          address: {
            line1: '123 Test St',
            city: 'Tokyo',
            postalCode: '100-0001',
            country: 'JPN'
          }
        },
        formStatus: 'ready',
        order: 1
      };

      const mockFilledForm: FilledForm = {
        countryCode: 'JPN',
        countryName: 'Japan',
        portalName: 'Visit Japan Web',
        portalUrl: 'https://vjw-lp.digital.go.jp/en/',
        sections: [],
        stats: { totalFields: 0, autoFilled: 0, userFilled: 0, remaining: 0, completionPercentage: 0 }
      };

      const result = await submissionEngine.startSubmission(
        mockLeg,
        mockFilledForm,
        'manual'
      );

      // Session should not be active for manual submissions
      const session = submissionEngine.getActiveSession(result.sessionId);
      expect(session).toBeUndefined();
    });

    it('should cancel submission', () => {
      const sessionId = 'test-session';
      submissionEngine.cancelSubmission(sessionId);
      
      const session = submissionEngine.getActiveSession(sessionId);
      expect(session).toBeUndefined();
    });
  });

  describe('metrics', () => {
    it('should return empty metrics initially', () => {
      const metrics = submissionEngine.getMetrics();
      expect(metrics).toEqual([]);
    });

    it('should return 0 success rate with no metrics', () => {
      const successRate = submissionEngine.getSuccessRate();
      expect(successRate).toBe(0);
    });

    it('should return 0 success rate for specific country with no metrics', () => {
      const successRate = submissionEngine.getSuccessRate('JPN');
      expect(successRate).toBe(0);
    });
  });
});