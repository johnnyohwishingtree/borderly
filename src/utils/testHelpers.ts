/**
 * Test Helpers and Utilities
 * 
 * Common utilities for testing government portal interactions,
 * form validation, and compliance checking. All utilities are
 * designed for defensive testing without real data submission.
 */

import { FilledForm } from '../services/forms/formEngine';
import { TripLeg } from '../types/trip';
import { CountryFormSchema } from '../types/schema';
import { SubmissionMetric } from '../services/monitoring/submissionAnalytics';
import { PortalHealthStatus } from '../services/testing/portalHealthChecker';
import { ComplianceCheckResult } from '../services/testing/complianceValidator';

/**
 * Test Data Factory - Creates realistic test data for testing
 */
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
      version: '1.0.0',
      lastUpdated: '2026-01-01',
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
      type: 'email',
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

/**
 * Assertion Helpers - Common test assertions
 */
export class TestAssertions {
  /**
   * Asserts that a form is valid for submission
   */
  static assertValidForm(form: FilledForm): void {
    if (form.stats.completionPercentage < 100) {
      throw new Error(`Form incomplete: ${form.stats.completionPercentage}% completed`);
    }

    const hasRequiredFields = form.sections.every(section =>
      section.fields.every(field => 
        !field.required || (field.currentValue && field.currentValue.trim() !== '')
      )
    );

    if (!hasRequiredFields) {
      throw new Error('Form missing required fields');
    }
  }

  /**
   * Asserts that portal health is acceptable
   */
  static assertPortalHealthy(health: PortalHealthStatus): void {
    if (health.status === 'offline') {
      throw new Error(`Portal ${health.portalName} is offline`);
    }

    if (health.status === 'error') {
      throw new Error(`Portal ${health.portalName} has errors: ${health.issues.map(i => i.message).join(', ')}`);
    }

    const criticalIssues = health.issues.filter(issue => issue.severity === 'critical');
    if (criticalIssues.length > 0) {
      throw new Error(`Portal ${health.portalName} has critical issues: ${criticalIssues.map(i => i.message).join(', ')}`);
    }
  }

  /**
   * Asserts that compliance check passed
   */
  static assertCompliant(compliance: ComplianceCheckResult): void {
    if (!compliance.isCompliant) {
      const criticalViolations = compliance.violations.filter(v => v.severity === 'critical');
      const highViolations = compliance.violations.filter(v => v.severity === 'high');
      
      if (criticalViolations.length > 0) {
        throw new Error(`Critical compliance violations: ${criticalViolations.map(v => v.message).join(', ')}`);
      }
      
      if (highViolations.length > 0) {
        throw new Error(`High-severity compliance violations: ${highViolations.map(v => v.message).join(', ')}`);
      }
    }
  }

  /**
   * Asserts that success rate meets threshold
   */
  static assertSuccessRate(actualRate: number, minimumRate: number): void {
    if (actualRate < minimumRate) {
      throw new Error(`Success rate ${actualRate.toFixed(1)}% is below minimum ${minimumRate}%`);
    }
  }

  /**
   * Asserts that response time is acceptable
   */
  static assertResponseTime(actualTime: number, maxTime: number): void {
    if (actualTime > maxTime) {
      throw new Error(`Response time ${actualTime}ms exceeds maximum ${maxTime}ms`);
    }
  }
}

/**
 * Mock Generators - Creates mock data for testing
 */
export class MockGenerators {
  /**
   * Generates random passport data for testing
   */
  static generateMockPassportData(): {
    surname: string;
    givenName: string;
    documentNumber: string;
    nationality: string;
    dateOfBirth: string;
    gender: string;
    expiryDate: string;
  } {
    const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const givenNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Jessica'];
    const genders = ['M', 'F'];

    return {
      surname: surnames[Math.floor(Math.random() * surnames.length)],
      givenName: givenNames[Math.floor(Math.random() * givenNames.length)],
      documentNumber: 'A' + Math.floor(Math.random() * 9999999).toString().padStart(7, '0'),
      nationality: 'USA',
      dateOfBirth: '1990-01-15',
      gender: genders[Math.floor(Math.random() * genders.length)],
      expiryDate: '2030-12-31'
    };
  }

  /**
   * Generates random travel details for testing
   */
  static generateMockTravelData(): {
    arrivalDate: string;
    departureDate: string;
    flightNumber: string;
    accommodation: string;
    purposeOfVisit: string;
  } {
    const airlines = ['NH', 'JL', 'UA', 'DL', 'AA'];
    const purposes = ['Tourism', 'Business', 'Transit', 'Visiting Friends'];
    
    const arrivalDate = new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000);
    const departureDate = new Date(arrivalDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);

    return {
      arrivalDate: arrivalDate.toISOString().split('T')[0],
      departureDate: departureDate.toISOString().split('T')[0],
      flightNumber: airlines[Math.floor(Math.random() * airlines.length)] + Math.floor(Math.random() * 9999),
      accommodation: 'Test Hotel ' + Math.floor(Math.random() * 100),
      purposeOfVisit: purposes[Math.floor(Math.random() * purposes.length)]
    };
  }

  /**
   * Generates mock submission errors for testing
   */
  static generateMockErrors(count: number = 3): Array<{
    field: string;
    type: string;
    message: string;
  }> {
    const errorTypes = [
      { field: 'surname', type: 'required', message: 'Surname is required' },
      { field: 'passportNumber', type: 'format', message: 'Invalid passport number format' },
      { field: 'arrivalDate', type: 'validation', message: 'Arrival date must be in the future' },
      { field: 'email', type: 'format', message: 'Invalid email address' },
      { field: 'phone', type: 'format', message: 'Invalid phone number format' }
    ];

    return errorTypes
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
  }
}

/**
 * Test Environment Utilities
 */
export class TestEnvironment {
  /**
   * Checks if running in test environment
   */
  static isTestEnvironment(): boolean {
    return process.env.NODE_ENV === 'test' || 
           process.env.JEST_WORKER_ID !== undefined ||
           (globalThis as any).it !== undefined;
  }

  /**
   * Creates isolated test environment
   */
  static createIsolatedEnvironment(): {
    cleanup: () => void;
    logs: string[];
    errors: string[];
  } {
    const logs: string[] = [];
    const errors: string[] = [];

    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    console.log = (...args) => {
      logs.push(args.map(arg => String(arg)).join(' '));
      if (!this.isTestEnvironment()) {
        originalConsoleLog(...args);
      }
    };

    console.error = (...args) => {
      errors.push(args.map(arg => String(arg)).join(' '));
      if (!this.isTestEnvironment()) {
        originalConsoleError(...args);
      }
    };

    return {
      cleanup: () => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
      },
      logs,
      errors
    };
  }

  /**
   * Creates mock timers for testing
   */
  static mockTime(dateString: string = '2026-06-01T00:00:00.000Z'): {
    restore: () => void;
    advanceTime: (ms: number) => void;
  } {
    const originalDate = Date;
    const mockDate = new Date(dateString);
    let currentTime = mockDate.getTime();

    // Mock Date constructor and Date.now()
    global.Date = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(currentTime);
        } else {
          super(...args);
        }
      }

      static now(): number {
        return currentTime;
      }
    } as any;

    return {
      restore: () => {
        global.Date = originalDate;
      },
      advanceTime: (ms: number) => {
        currentTime += ms;
      }
    };
  }

  /**
   * Creates network simulation for testing
   */
  static simulateNetwork(options: {
    delay?: number;
    failureRate?: number;
    timeoutRate?: number;
  } = {}): {
    restore: () => void;
    getRequestLog: () => Array<{ url: string; method: string; success: boolean }>;
  } {
    const { delay = 100, failureRate = 0, timeoutRate = 0 } = options;
    const requestLog: Array<{ url: string; method: string; success: boolean }> = [];
    const originalFetch = global.fetch;

    global.fetch = async (url: any, options: any = {}) => {
      const method = options.method || 'GET';
      
      // Simulate network delay
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Simulate timeout
      if (Math.random() < timeoutRate) {
        requestLog.push({ url: String(url), method, success: false });
        throw new Error('Network timeout');
      }

      // Simulate failure
      if (Math.random() < failureRate) {
        requestLog.push({ url: String(url), method, success: false });
        return new Response(null, { status: 500, statusText: 'Internal Server Error' });
      }

      requestLog.push({ url: String(url), method, success: true });

      // Simulate successful response
      return new Response('OK', { status: 200, statusText: 'OK' });
    };

    return {
      restore: () => {
        global.fetch = originalFetch;
      },
      getRequestLog: () => [...requestLog]
    };
  }
}

/**
 * Validation Helpers
 */
export class ValidationHelpers {
  /**
   * Validates that an object contains no PII
   */
  static validateNoPII(obj: any): { isClean: boolean; foundPII: string[] } {
    const piiPatterns = [
      { name: 'Email', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
      { name: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
      { name: 'Credit Card', pattern: /\b\d{16}\b/g },
      { name: 'Phone', pattern: /\b\+?[\d\s\-\(\)]{10,}\b/g }
    ];

    const foundPII: string[] = [];
    const jsonString = JSON.stringify(obj);

    for (const { name, pattern } of piiPatterns) {
      if (pattern.test(jsonString)) {
        foundPII.push(name);
      }
    }

    return {
      isClean: foundPII.length === 0,
      foundPII
    };
  }

  /**
   * Validates form completion percentage
   */
  static validateFormCompletion(form: FilledForm): {
    isValid: boolean;
    expectedPercentage: number;
    actualPercentage: number;
  } {
    const { totalFields, autoFilled, userFilled } = form.stats;
    const completed = autoFilled + userFilled;
    const expectedPercentage = totalFields > 0 ? (completed / totalFields) * 100 : 0;
    
    return {
      isValid: Math.abs(form.stats.completionPercentage - expectedPercentage) < 0.01,
      expectedPercentage,
      actualPercentage: form.stats.completionPercentage
    };
  }

  /**
   * Validates country code format
   */
  static validateCountryCode(countryCode: string): boolean {
    return /^[A-Z]{3}$/.test(countryCode);
  }

  /**
   * Validates date format
   */
  static validateDateFormat(date: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
  }

  /**
   * Validates URL format
   */
  static validateURL(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('https://');
    } catch {
      return false;
    }
  }
}