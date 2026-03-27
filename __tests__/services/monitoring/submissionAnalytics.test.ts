import { SubmissionAnalytics } from '@/services/monitoring/submissionAnalytics';
import type { SubmissionMetric } from '@/services/monitoring/submissionAnalyticsTypes';

jest.mock('@/services/monitoring/submissionReportGenerator', () => ({
  generateSummary: jest.fn(() => ({
    totalSubmissions: 0,
    successRate: 0,
    averageDuration: 0,
    mostActiveCountry: '',
    completionRate: 0,
  })),
  generateCountryBreakdown: jest.fn(() => []),
  generatePerformanceTrends: jest.fn(() => []),
  generateErrorAnalysis: jest.fn(() => ({ topErrors: [], errorTrends: [] })),
  generateUXInsights: jest.fn(() => ({
    averageRetryAttempts: 0,
    helpUsageRate: 0,
    guideCompletionRate: 0,
    abandonmentRate: 0,
    timeToSuccess: 0,
  })),
}));

type SubmissionInput = Omit<SubmissionMetric, 'id' | 'timestamp'>;

function createSubmissionInput(
  overrides: Partial<SubmissionInput> = {}
): SubmissionInput {
  return {
    countryCode: 'JPN',
    submissionMethod: 'manual',
    status: 'success',
    duration: {
      preparationMs: 100,
      submissionMs: 500,
      totalMs: 600,
    },
    formStats: {
      totalFields: 10,
      autoFilledFields: 7,
      userInputFields: 3,
      completionPercentage: 100,
    },
    portalPerformance: {
      responseTimeMs: 200,
      portalStatus: 'healthy',
    },
    userExperience: {
      retryAttempts: 0,
      helpViewed: false,
      guideStepsViewed: 0,
      errorsEncountered: [],
    },
    deviceInfo: {
      platform: 'ios',
      appVersion: '1.0.0',
    },
    ...overrides,
  };
}

describe('SubmissionAnalytics', () => {
  let analytics: SubmissionAnalytics;

  beforeEach(() => {
    jest.clearAllMocks();
    analytics = new SubmissionAnalytics();
    analytics.clearData();
  });

  describe('recordSubmission', () => {
    it('stores a metric for the given country', () => {
      analytics.recordSubmission(createSubmissionInput({ countryCode: 'JPN' }));

      expect(analytics.getTrackedCountries()).toContain('JPN');
    });

    it('assigns a unique id and timestamp to each metric', () => {
      analytics.recordSubmission(createSubmissionInput());
      analytics.recordSubmission(createSubmissionInput());

      const exported = analytics.exportData();
      const metrics = exported['JPN'];
      expect(metrics).toHaveLength(2);
      expect(metrics[0].id).not.toBe(metrics[1].id);
      expect(typeof metrics[0].timestamp).toBe('string');
    });

    it('stores metrics under separate country keys', () => {
      analytics.recordSubmission(createSubmissionInput({ countryCode: 'JPN' }));
      analytics.recordSubmission(createSubmissionInput({ countryCode: 'SGP' }));

      const countries = analytics.getTrackedCountries();
      expect(countries).toContain('JPN');
      expect(countries).toContain('SGP');
    });
  });

  describe('recordPortalPerformance', () => {
    it('records a portal performance metric as a submission', () => {
      analytics.recordPortalPerformance('MYS', 350, 'healthy');

      expect(analytics.getTrackedCountries()).toContain('MYS');
      const exported = analytics.exportData();
      expect(exported['MYS']).toHaveLength(1);
      expect(exported['MYS'][0].portalPerformance.responseTimeMs).toBe(350);
    });

    it('records an error type when portal is unhealthy', () => {
      analytics.recordPortalPerformance('MYS', 5000, 'degraded', 'timeout');

      const exported = analytics.exportData();
      const metric = exported['MYS'][0];
      expect(metric.status).toBe('failed');
      expect(metric.portalPerformance.errorType).toBe('timeout');
    });
  });

  describe('getSuccessRate', () => {
    it('returns 0 when no metrics exist', () => {
      expect(analytics.getSuccessRate('JPN')).toBe(0);
    });

    it('returns 100 when all submissions succeed', () => {
      analytics.recordSubmission(createSubmissionInput({ status: 'success' }));
      analytics.recordSubmission(createSubmissionInput({ status: 'success' }));

      expect(analytics.getSuccessRate('JPN')).toBe(100);
    });

    it('calculates correct percentage for mixed results', () => {
      analytics.recordSubmission(createSubmissionInput({ status: 'success' }));
      analytics.recordSubmission(createSubmissionInput({ status: 'failed' }));
      analytics.recordSubmission(createSubmissionInput({ status: 'success' }));
      analytics.recordSubmission(createSubmissionInput({ status: 'failed' }));

      expect(analytics.getSuccessRate('JPN')).toBe(50);
    });

    it('counts test_success as successful', () => {
      analytics.recordSubmission(
        createSubmissionInput({ status: 'test_success' })
      );

      expect(analytics.getSuccessRate('JPN')).toBe(100);
    });
  });

  describe('getAverageProcessingTime', () => {
    it('returns 0 when no metrics exist', () => {
      expect(analytics.getAverageProcessingTime('JPN')).toBe(0);
    });

    it('returns the average totalMs across submissions', () => {
      analytics.recordSubmission(
        createSubmissionInput({
          duration: { preparationMs: 0, submissionMs: 0, totalMs: 200 },
        })
      );
      analytics.recordSubmission(
        createSubmissionInput({
          duration: { preparationMs: 0, submissionMs: 0, totalMs: 400 },
        })
      );

      expect(analytics.getAverageProcessingTime('JPN')).toBe(300);
    });
  });

  describe('getTopErrors', () => {
    it('returns empty array when no errors exist', () => {
      expect(analytics.getTopErrors('JPN')).toEqual([]);
    });

    it('returns errors sorted by count descending', () => {
      analytics.recordSubmission(
        createSubmissionInput({
          userExperience: {
            retryAttempts: 0,
            helpViewed: false,
            guideStepsViewed: 0,
            errorsEncountered: ['timeout', 'timeout', 'validation'],
          },
        })
      );
      analytics.recordSubmission(
        createSubmissionInput({
          userExperience: {
            retryAttempts: 0,
            helpViewed: false,
            guideStepsViewed: 0,
            errorsEncountered: ['timeout'],
          },
        })
      );

      const errors = analytics.getTopErrors('JPN');
      expect(errors[0].error).toBe('timeout');
      expect(errors[0].count).toBe(3);
      expect(errors[1].error).toBe('validation');
      expect(errors[1].count).toBe(1);
    });

    it('respects the limit parameter', () => {
      analytics.recordSubmission(
        createSubmissionInput({
          userExperience: {
            retryAttempts: 0,
            helpViewed: false,
            guideStepsViewed: 0,
            errorsEncountered: ['a', 'b', 'c', 'd'],
          },
        })
      );

      const errors = analytics.getTopErrors('JPN', 2);
      expect(errors).toHaveLength(2);
    });

    it('includes percentage relative to total errors', () => {
      analytics.recordSubmission(
        createSubmissionInput({
          userExperience: {
            retryAttempts: 0,
            helpViewed: false,
            guideStepsViewed: 0,
            errorsEncountered: ['timeout', 'validation'],
          },
        })
      );

      const errors = analytics.getTopErrors('JPN');
      const totalPercentage = errors.reduce((sum, e) => sum + e.percentage, 0);
      expect(totalPercentage).toBe(100);
    });
  });

  describe('getTrackedCountries', () => {
    it('returns empty array when nothing is tracked', () => {
      expect(analytics.getTrackedCountries()).toEqual([]);
    });

    it('returns all country codes that have metrics', () => {
      analytics.recordSubmission(createSubmissionInput({ countryCode: 'JPN' }));
      analytics.recordSubmission(createSubmissionInput({ countryCode: 'SGP' }));
      analytics.recordSubmission(createSubmissionInput({ countryCode: 'THA' }));

      const countries = analytics.getTrackedCountries();
      expect(countries).toHaveLength(3);
      expect(countries).toContain('JPN');
      expect(countries).toContain('SGP');
      expect(countries).toContain('THA');
    });
  });

  describe('clearData', () => {
    it('removes all stored metrics', () => {
      analytics.recordSubmission(createSubmissionInput({ countryCode: 'JPN' }));
      analytics.recordSubmission(createSubmissionInput({ countryCode: 'SGP' }));

      analytics.clearData();

      expect(analytics.getTrackedCountries()).toEqual([]);
      expect(analytics.exportData()).toEqual({});
    });

    it('can be called on an already empty instance', () => {
      analytics.clearData();
      expect(analytics.getTrackedCountries()).toEqual([]);
    });
  });

  describe('getTestSummary', () => {
    it('returns zeroed summary with no data', () => {
      const summary = analytics.getTestSummary();

      expect(summary.totalTests).toBe(0);
      expect(summary.totalCountries).toBe(0);
      expect(summary.avgSuccessRate).toBe(0);
    });

    it('reflects recorded submissions', () => {
      analytics.recordSubmission(createSubmissionInput({ status: 'success' }));
      analytics.recordSubmission(createSubmissionInput({ status: 'failed' }));

      const summary = analytics.getTestSummary();
      expect(summary.totalTests).toBe(2);
      expect(summary.totalCountries).toBe(1);
      expect(summary.avgSuccessRate).toBe(50);
    });
  });

  describe('exportData', () => {
    it('returns sanitized copy of all metrics keyed by country', () => {
      analytics.recordSubmission(createSubmissionInput({ countryCode: 'JPN' }));
      analytics.recordSubmission(createSubmissionInput({ countryCode: 'SGP' }));

      const data = analytics.exportData();
      expect(Object.keys(data)).toEqual(
        expect.arrayContaining(['JPN', 'SGP'])
      );
      expect(data['JPN']).toHaveLength(1);
      expect(data['SGP']).toHaveLength(1);
    });
  });
});
