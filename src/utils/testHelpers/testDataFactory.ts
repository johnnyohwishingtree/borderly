/**
 * Test Data Factory - Creates realistic test data for testing
 */

import { FilledForm } from '../../services/forms/formEngine';
import { TripLeg } from '../../types/trip';
import { CountryFormSchema } from '../../types/schema';
import { SubmissionMetric } from '../../services/monitoring/submissionAnalytics';
import { PortalHealthStatus } from '../../services/testing/portalHealthChecker';

export class TestDataFactory {
  /**
   * Creates a sample trip leg for testing
   */
  static createSampleTripLeg(overrides: Partial<TripLeg> = {}): TripLeg {
    return {
      id: `test_leg_${Date.now()}`,
      tripId: `test_trip_${Date.now()}`,
      destinationCountry: 'JPN',
      arrivalDate: '2026-06-10',
      departureDate: '2026-06-15',
      flightNumber: 'NH123',
      airlineCode: 'NH',
      arrivalAirport: 'NRT',
      accommodation: {
        name: 'Test Hotel Tokyo',
        address: {
          line1: '123 Test Street',
          city: 'Tokyo',
          postalCode: '100-0001',
          country: 'JPN'
        }
      },
      formStatus: 'ready',
      submissionStatus: 'not_started',
      order: 1,
      ...overrides
    };
  }

  /**
   * Creates a sample filled form for testing
   */
  static createSampleFilledForm(overrides: Partial<FilledForm> = {}): FilledForm {
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
              source: 'auto',
              needsUserInput: false,
              countrySpecific: false
            },
            {
              id: 'givenName',
              label: 'Given Name',
              type: 'text',
              required: true,
              currentValue: 'John',
              source: 'auto',
              needsUserInput: false,
              countrySpecific: false
            },
            {
              id: 'passportNumber',
              label: 'Passport Number',
              type: 'text',
              required: true,
              currentValue: 'A1234567',
              source: 'auto',
              needsUserInput: false,
              countrySpecific: false
            }
          ]
        },
        {
          id: 'travel',
          title: 'Travel Information',
          fields: [
            {
              id: 'arrivalDate',
              label: 'Arrival Date',
              type: 'date',
              required: true,
              currentValue: '2026-06-10',
              source: 'auto',
              needsUserInput: false,
              countrySpecific: false
            }
          ]
        }
      ],
      stats: {
        totalFields: 4,
        autoFilled: 4,
        userFilled: 0,
        remaining: 0,
        completionPercentage: 100
      },
      ...overrides
    };
  }

  /**
   * Creates a sample country schema for testing
   */
  static createSampleSchema(overrides: Partial<CountryFormSchema> = {}): CountryFormSchema {
    return {
      countryCode: 'JPN',
      countryName: 'Japan',
      portalName: 'Visit Japan Web',
      portalUrl: 'https://vjw-lp.digital.go.jp/en/',
      schemaVersion: '1.0.0',
      lastUpdated: '2026-01-01',
      submissionDeadlineHours: 24,
      recommendedLeadTimeHours: 72,
      submissionWindowNote: 'Submit 24-72 h before arrival',
      metadata: {
        priority: 1,
        complexity: 'medium',
        popularity: 90,
        lastVerified: '2026-01-01',
        supportedLanguages: ['en', 'ja'],
        implementationStatus: 'complete',
        maintenanceFrequency: 'monthly',
      },
      changeDetection: {
        monitoredSelectors: [],
        changeThreshold: 20,
        fallbackActions: [],
      },
      submission: {
        earliestBeforeArrival: '14d',
        latestBeforeArrival: '0h',
        recommended: '72h',
      },
      portalFlow: {
        requiresAccount: true,
        multiStep: true,
        canSaveProgress: true,
      },
      submissionGuide: [],
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
              autoFillSource: 'passport.surname',
              countrySpecific: false
            },
            {
              id: 'givenName',
              label: 'Given Name',
              type: 'text',
              required: true,
              autoFillSource: 'passport.givenName',
              countrySpecific: false
            },
            {
              id: 'passportNumber',
              label: 'Passport Number',
              type: 'text',
              required: true,
              autoFillSource: 'passport.documentNumber',
              countrySpecific: false
            }
          ]
        }
      ],
      ...overrides
    };
  }

  /**
   * Creates sample submission metrics for testing
   */
  static createSampleSubmissionMetrics(count: number = 10, countryCode: string = 'JPN'): SubmissionMetric[] {
    const metrics: SubmissionMetric[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const success = Math.random() > 0.2; // 80% success rate
      const duration = 5000 + Math.random() * 15000; // 5-20 seconds

      metrics.push({
        id: `test_metric_${now}_${i}`,
        countryCode,
        timestamp: new Date(now - i * 60000).toISOString(), // Spread over last hour
        submissionMethod: Math.random() > 0.5 ? 'manual' : 'guided',
        status: success ? 'success' : 'failed',
        duration: {
          preparationMs: Math.floor(duration * 0.3),
          submissionMs: Math.floor(duration * 0.7),
          totalMs: duration
        },
        formStats: {
          totalFields: 10,
          autoFilledFields: 8,
          userInputFields: 2,
          completionPercentage: 100
        },
        portalPerformance: {
          responseTimeMs: 2000 + Math.random() * 5000,
          portalStatus: success ? 'healthy' : 'degraded'
        },
        userExperience: {
          retryAttempts: success ? 0 : Math.floor(Math.random() * 3),
          helpViewed: Math.random() > 0.7,
          guideStepsViewed: Math.floor(Math.random() * 5),
          errorsEncountered: success ? [] : ['validation_error']
        },
        deviceInfo: {
          platform: Math.random() > 0.5 ? 'ios' : 'android',
          appVersion: '1.0.0'
        }
      });
    }

    return metrics;
  }

  /**
   * Creates sample portal health status for testing
   */
  static createSamplePortalHealth(overrides: Partial<PortalHealthStatus> = {}): PortalHealthStatus {
    return {
      countryCode: 'JPN',
      portalName: 'Visit Japan Web',
      url: 'https://vjw-lp.digital.go.jp/en/',
      status: 'healthy',
      responseTime: 2500,
      lastChecked: new Date().toISOString(),
      issues: [],
      metadata: {
        sslValid: true,
        canConnect: true,
        expectedElements: true,
        httpStatus: 200
      },
      ...overrides
    };
  }

  /**
   * Creates incomplete form for testing validation
   */
  static createIncompleteForm(): FilledForm {
    const completeForm = this.createSampleFilledForm();

    // Remove some required values
    completeForm.sections[0].fields[0].currentValue = ''; // Remove surname
    completeForm.sections[0].fields[2].currentValue = ''; // Remove passport number

    // Update stats
    completeForm.stats = {
      totalFields: 4,
      autoFilled: 2,
      userFilled: 0,
      remaining: 2,
      completionPercentage: 50
    };

    return completeForm;
  }

  /**
   * Creates form with validation errors
   */
  static createInvalidForm(): FilledForm {
    const form = this.createSampleFilledForm();

    // Add invalid data
    form.sections[0].fields.push({
      id: 'email',
      label: 'Email Address',
      type: 'text',
      required: true,
      currentValue: 'invalid-email', // Invalid email format
      source: 'user',
      needsUserInput: true,
      countrySpecific: false
    });

    form.sections[1].fields[0].currentValue = 'invalid-date'; // Invalid date format

    return form;
  }
}
