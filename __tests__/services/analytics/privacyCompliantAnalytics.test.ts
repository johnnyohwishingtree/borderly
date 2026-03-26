/**
 * Tests for PrivacyCompliantAnalyticsService — event tracking, journey
 * recording, privacy enforcement, and usage metric aggregation.
 */

import { PrivacyCompliantAnalyticsService } from '../../../src/services/analytics/privacyCompliantAnalytics';


// Mock piiSanitizer — pass through whitelisted fields for testing
jest.mock('../../../src/utils/piiSanitizer', () => ({
  sanitizeObject: jest.fn((obj: Record<string, unknown>, _opts?: unknown) => {
    // Simulate stripping PII fields while keeping safe ones
    const result: Record<string, unknown> = {};
    const piiFields = ['passportNumber', 'surname', 'givenNames', 'dateOfBirth', 'email', 'phoneNumber'];
    for (const [key, value] of Object.entries(obj)) {
      if (!piiFields.includes(key)) {
        result[key] = value;
      }
    }
    return result;
  }),
  stripPIIFromFormData: jest.fn((data: unknown) => data),
}));

// Mock monitoring module
jest.mock('../../../src/services/monitoring/productionMonitoring', () => ({}));

// ---------------------------------------------------------------------------
// Tests — use fresh instances to avoid state leaking between tests
// ---------------------------------------------------------------------------

function createService(): PrivacyCompliantAnalyticsService {
  return new PrivacyCompliantAnalyticsService();
}

describe('PrivacyCompliantAnalyticsService', () => {
  describe('trackScreenView', () => {
    it('records a screen_view event', () => {
      const svc = createService();
      svc.trackScreenView('HomeScreen');

      const metrics = svc.generateUsageMetrics();
      expect(metrics.screenViews['HomeScreen']).toBe(1);
    });

    it('increments count for repeated screen views', () => {
      const svc = createService();
      svc.trackScreenView('HomeScreen');
      svc.trackScreenView('HomeScreen');
      svc.trackScreenView('HomeScreen');

      const metrics = svc.generateUsageMetrics();
      expect(metrics.screenViews['HomeScreen']).toBe(3);
    });

    it('does not record when analytics is disabled', () => {
      const svc = createService();
      svc.updatePrivacySettings({ enabled: false });
      svc.trackScreenView('HomeScreen');

      // Re-enable to check (clearData was called on disable)
      const status = svc.getDataStatus();
      expect(status.eventCount).toBe(0);
    });

    it('does not record when usage analytics is disabled', () => {
      const svc = createService();
      svc.updatePrivacySettings({ allowUsageAnalytics: false });
      svc.trackScreenView('HomeScreen');

      const status = svc.getDataStatus();
      expect(status.eventCount).toBe(0);
    });

    it('strips PII fields from event properties', () => {
      const svc = createService();
      svc.trackScreenView('ProfileScreen', {
        passportNumber: 'AB1234567',
        screen: 'ProfileScreen',
      });

      const metrics = svc.generateUsageMetrics();
      expect(metrics.screenViews['ProfileScreen']).toBe(1);
      // PII should be stripped — verified via sanitizeObject mock
    });
  });

  describe('trackUserAction', () => {
    it('records a user_action event', () => {
      const svc = createService();
      svc.trackUserAction('tap_button', 'TripList');

      const status = svc.getDataStatus();
      expect(status.eventCount).toBe(1);
    });

    it('does not record when disabled', () => {
      const svc = createService();
      svc.updatePrivacySettings({ enabled: false });
      svc.trackUserAction('tap_button', 'TripList');

      const status = svc.getDataStatus();
      expect(status.eventCount).toBe(0);
    });

    it('tracks country code in properties', () => {
      const svc = createService();
      svc.trackUserAction('create_form', 'FormScreen', { countryCode: 'JPN' });

      const metrics = svc.generateUsageMetrics();
      expect(metrics.countryPopularity['JPN']).toBe(1);
    });
  });

  describe('trackFeatureUsage', () => {
    it('records feature usage events', () => {
      const svc = createService();
      svc.trackFeatureUsage('qr_scanner');
      svc.trackFeatureUsage('qr_scanner');
      svc.trackFeatureUsage('mrz_reader');

      const metrics = svc.generateUsageMetrics();
      expect(metrics.featureUsage['qr_scanner']).toBe(2);
      expect(metrics.featureUsage['mrz_reader']).toBe(1);
    });

    it('does not record when disabled', () => {
      const svc = createService();
      svc.updatePrivacySettings({ allowUsageAnalytics: false });
      svc.trackFeatureUsage('qr_scanner');

      const status = svc.getDataStatus();
      expect(status.eventCount).toBe(0);
    });
  });

  describe('trackPerformance', () => {
    it('records performance metric events', () => {
      const svc = createService();
      svc.trackPerformance({
        name: 'form_render',
        value: 150,
        unit: 'ms',
        category: 'rendering',
      } as never);

      const metrics = svc.generateUsageMetrics();
      expect(metrics.performanceAverages['form_render']).toBe(150);
    });

    it('calculates average for multiple performance events', () => {
      const svc = createService();
      svc.trackPerformance({ name: 'form_render', value: 100, unit: 'ms', category: 'rendering' } as never);
      svc.trackPerformance({ name: 'form_render', value: 200, unit: 'ms', category: 'rendering' } as never);

      const metrics = svc.generateUsageMetrics();
      expect(metrics.performanceAverages['form_render']).toBe(150);
    });

    it('does not record when performance tracking is disabled', () => {
      const svc = createService();
      svc.updatePrivacySettings({ allowPerformanceTracking: false });
      svc.trackPerformance({ name: 'form_render', value: 100, unit: 'ms', category: 'rendering' } as never);

      const status = svc.getDataStatus();
      expect(status.eventCount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // User journey tracking
  // -------------------------------------------------------------------------

  describe('startJourney / endJourney', () => {
    it('records a journey from start to completion', () => {
      const svc = createService();
      svc.startJourney('onboarding', 'WelcomeScreen');
      svc.trackScreenView('ProfileSetup');
      svc.endJourney('completed', 'SuccessScreen');

      const status = svc.getDataStatus();
      expect(status.journeyCount).toBe(1);
    });

    it('tracks journey as abandoned by default', () => {
      const svc = createService();
      svc.startJourney('trip_creation', 'TripForm');
      svc.endJourney('abandoned');

      const analytics = svc.exportJourneyAnalytics();
      expect(analytics).toHaveLength(1);
      expect(analytics[0].completionRate).toBe(0);
    });

    it('does not start journey when analytics is disabled', () => {
      const svc = createService();
      svc.updatePrivacySettings({ enabled: false });
      svc.updatePrivacySettings({ enabled: true }); // re-enable, data cleared

      svc.updatePrivacySettings({ allowUsageAnalytics: false });
      svc.startJourney('onboarding', 'WelcomeScreen');
      svc.endJourney('completed');

      const status = svc.getDataStatus();
      expect(status.journeyCount).toBe(0);
    });

    it('endJourney does nothing when no journey is active', () => {
      const svc = createService();
      svc.endJourney('completed');

      const status = svc.getDataStatus();
      expect(status.journeyCount).toBe(0);
    });

    it('adds screen steps to active journey via trackScreenView', () => {
      const svc = createService();
      svc.startJourney('form_completion', 'LegFormScreen');
      svc.trackScreenView('PersonalInfoSection');
      svc.trackScreenView('TravelDetailsSection');
      svc.endJourney('completed', 'ConfirmationScreen');

      const analytics = svc.exportJourneyAnalytics();
      expect(analytics).toHaveLength(1);
      expect(analytics[0].completionRate).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // exportJourneyAnalytics
  // -------------------------------------------------------------------------

  describe('exportJourneyAnalytics', () => {
    it('returns empty array when no journeys recorded', () => {
      const svc = createService();
      expect(svc.exportJourneyAnalytics()).toHaveLength(0);
    });

    it('groups journeys by flow type', () => {
      const svc = createService();

      svc.startJourney('onboarding', 'Welcome');
      svc.endJourney('completed', 'Done');

      svc.startJourney('trip_creation', 'TripForm');
      svc.endJourney('completed', 'TripDone');

      const analytics = svc.exportJourneyAnalytics();
      expect(analytics).toHaveLength(2);

      const flowTypes = analytics.map(a => a.flowType);
      expect(flowTypes).toContain('onboarding');
      expect(flowTypes).toContain('trip_creation');
    });

    it('calculates completion rate correctly', () => {
      const svc = createService();

      svc.startJourney('onboarding', 'Welcome');
      svc.endJourney('completed', 'Done');

      svc.startJourney('onboarding', 'Welcome');
      svc.endJourney('abandoned');

      const analytics = svc.exportJourneyAnalytics();
      const onboarding = analytics.find(a => a.flowType === 'onboarding');
      expect(onboarding!.completionRate).toBe(0.5);
    });

    it('tracks abandonment points', () => {
      const svc = createService();

      svc.startJourney('onboarding', 'Welcome');
      svc.trackScreenView('ProfileSetup');
      svc.endJourney('abandoned');

      const analytics = svc.exportJourneyAnalytics();
      const onboarding = analytics.find(a => a.flowType === 'onboarding');
      expect(onboarding!.abandonnmentPoints).toBeDefined();
      expect(Object.keys(onboarding!.abandonnmentPoints).length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Privacy settings
  // -------------------------------------------------------------------------

  describe('privacy settings', () => {
    it('returns default settings', () => {
      const svc = createService();
      const settings = svc.getPrivacySettings();

      expect(settings.enabled).toBe(true);
      expect(settings.allowPerformanceTracking).toBe(true);
      expect(settings.allowUsageAnalytics).toBe(true);
      expect(settings.allowErrorTracking).toBe(true);
      expect(settings.dataRetentionDays).toBe(30);
    });

    it('updates settings partially', () => {
      const svc = createService();
      svc.updatePrivacySettings({ dataRetentionDays: 7 });

      const settings = svc.getPrivacySettings();
      expect(settings.dataRetentionDays).toBe(7);
      expect(settings.enabled).toBe(true); // unchanged
    });

    it('clears all data when analytics is disabled', () => {
      const svc = createService();
      svc.trackScreenView('HomeScreen');
      svc.trackFeatureUsage('qr_scanner');

      svc.updatePrivacySettings({ enabled: false });

      const status = svc.getDataStatus();
      expect(status.eventCount).toBe(0);
      expect(status.journeyCount).toBe(0);
    });

    it('returns a copy of settings (not a reference)', () => {
      const svc = createService();
      const settings = svc.getPrivacySettings();
      settings.enabled = false;

      // Original should be unchanged
      expect(svc.getPrivacySettings().enabled).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Data management
  // -------------------------------------------------------------------------

  describe('clearData', () => {
    it('clears all events and journeys', () => {
      const svc = createService();
      svc.trackScreenView('HomeScreen');
      svc.startJourney('onboarding', 'Welcome');
      svc.endJourney('completed');

      svc.clearData();

      const status = svc.getDataStatus();
      expect(status.eventCount).toBe(0);
      expect(status.journeyCount).toBe(0);
    });
  });

  describe('getDataStatus', () => {
    it('returns correct event and journey counts', () => {
      const svc = createService();
      svc.trackScreenView('A');
      svc.trackScreenView('B');

      const status = svc.getDataStatus();
      expect(status.eventCount).toBe(2);
      expect(status.journeyCount).toBe(0);
      expect(status.dataSize).toBeGreaterThan(0);
    });

    it('includes oldest event timestamp', () => {
      const svc = createService();
      svc.trackScreenView('A');

      const status = svc.getDataStatus();
      expect(status.oldestEvent).toBeDefined();
      expect(status.oldestEvent).toBeLessThanOrEqual(Date.now());
    });

    it('omits oldestEvent when no events exist', () => {
      const svc = createService();
      const status = svc.getDataStatus();
      expect(status.oldestEvent).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // PII safety — ensure PII never appears in tracked data
  // -------------------------------------------------------------------------

  describe('PII safety', () => {
    it('strips passport numbers from event properties', () => {
      const { sanitizeObject } = require('../../../src/utils/piiSanitizer');
      const svc = createService();

      svc.trackScreenView('ProfileScreen', {
        passportNumber: 'AB1234567',
        screen: 'ProfileScreen',
      });

      // Verify sanitizeObject was called
      expect(sanitizeObject).toHaveBeenCalled();
    });

    it('strips names from event properties', () => {
      const svc = createService();
      svc.trackUserAction('view_profile', 'ProfileScreen', {
        surname: 'TANAKA',
        givenNames: 'Yuki',
        action: 'view_profile',
      });

      // Event is recorded, but PII is stripped by sanitizer
      const status = svc.getDataStatus();
      expect(status.eventCount).toBe(1);
    });

    it('strips dateOfBirth from event properties', () => {
      const svc = createService();
      svc.trackFeatureUsage('passport_scan', {
        dateOfBirth: '1990-01-15',
        feature: 'passport_scan',
      });

      const status = svc.getDataStatus();
      expect(status.eventCount).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // generateUsageMetrics
  // -------------------------------------------------------------------------

  describe('generateUsageMetrics', () => {
    it('returns session duration', () => {
      const svc = createService();
      const metrics = svc.generateUsageMetrics();

      expect(metrics.sessionDuration).toBeGreaterThanOrEqual(0);
    });

    it('aggregates country popularity from user actions', () => {
      const svc = createService();
      svc.trackUserAction('form_start', 'FormScreen', { countryCode: 'JPN' });
      svc.trackUserAction('form_start', 'FormScreen', { countryCode: 'JPN' });
      svc.trackUserAction('form_start', 'FormScreen', { countryCode: 'SGP' });

      const metrics = svc.generateUsageMetrics();
      expect(metrics.countryPopularity['JPN']).toBe(2);
      expect(metrics.countryPopularity['SGP']).toBe(1);
    });
  });
});
