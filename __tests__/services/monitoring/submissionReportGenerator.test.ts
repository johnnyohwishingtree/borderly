import {
  generateSummary,
  generateCountryBreakdown,
  generatePerformanceTrends,
  generateErrorAnalysis,
  generateUXInsights,
} from '../../../src/services/monitoring/submissionReportGenerator';
import type { SubmissionMetric } from '../../../src/services/monitoring/submissionAnalyticsTypes';

// --- Factory ---

function createMetric(overrides: Partial<SubmissionMetric> = {}): SubmissionMetric {
  return {
    id: 'metric-1',
    countryCode: 'JPN',
    timestamp: '2026-03-25T10:00:00Z',
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

// --- generateSummary ---

describe('generateSummary', () => {
  it('returns zeroes for empty metrics', () => {
    const result = generateSummary([]);
    expect(result.totalSubmissions).toBe(0);
    expect(result.successRate).toBe(0);
    expect(result.averageDuration).toBe(0);
    expect(result.mostActiveCountry).toBe('');
    expect(result.completionRate).toBe(0);
  });

  it('calculates correct success rate from mixed statuses', () => {
    const metrics = [
      createMetric({ id: '1', status: 'success' }),
      createMetric({ id: '2', status: 'failed' }),
      createMetric({ id: '3', status: 'test_success' }),
      createMetric({ id: '4', status: 'abandoned' }),
    ];
    const result = generateSummary(metrics);
    expect(result.totalSubmissions).toBe(4);
    expect(result.successRate).toBe(50); // 2 out of 4
  });

  it('calculates average duration', () => {
    const metrics = [
      createMetric({ id: '1', duration: { preparationMs: 0, submissionMs: 0, totalMs: 1000 } }),
      createMetric({ id: '2', duration: { preparationMs: 0, submissionMs: 0, totalMs: 3000 } }),
    ];
    const result = generateSummary(metrics);
    expect(result.averageDuration).toBe(2000);
  });

  it('identifies the most active country', () => {
    const metrics = [
      createMetric({ id: '1', countryCode: 'JPN' }),
      createMetric({ id: '2', countryCode: 'JPN' }),
      createMetric({ id: '3', countryCode: 'MYS' }),
    ];
    const result = generateSummary(metrics);
    expect(result.mostActiveCountry).toBe('JPN');
  });

  it('calculates completion rate for non-abandoned 100% forms', () => {
    const metrics = [
      createMetric({ id: '1', status: 'success', formStats: { totalFields: 10, autoFilledFields: 7, userInputFields: 3, completionPercentage: 100 } }),
      createMetric({ id: '2', status: 'failed', formStats: { totalFields: 10, autoFilledFields: 5, userInputFields: 5, completionPercentage: 80 } }),
      createMetric({ id: '3', status: 'abandoned', formStats: { totalFields: 10, autoFilledFields: 7, userInputFields: 3, completionPercentage: 100 } }),
    ];
    const result = generateSummary(metrics);
    // Only the first metric is non-abandoned with 100% completion
    expect(result.completionRate).toBeCloseTo(33.33, 1);
  });
});

// --- generateCountryBreakdown ---

describe('generateCountryBreakdown', () => {
  const mockHealthScore = jest.fn((code: string) => (code === 'JPN' ? 95 : 80));

  beforeEach(() => {
    mockHealthScore.mockClear();
  });

  it('groups metrics by country', () => {
    const metrics = [
      createMetric({ id: '1', countryCode: 'JPN' }),
      createMetric({ id: '2', countryCode: 'JPN' }),
      createMetric({ id: '3', countryCode: 'MYS' }),
    ];
    const result = generateCountryBreakdown(metrics, mockHealthScore);
    expect(result).toHaveLength(2);

    const jpn = result.find(r => r.countryCode === 'JPN');
    expect(jpn!.submissionCount).toBe(2);
    expect(jpn!.portalHealthScore).toBe(95);

    const mys = result.find(r => r.countryCode === 'MYS');
    expect(mys!.submissionCount).toBe(1);
    expect(mys!.portalHealthScore).toBe(80);
  });

  it('calculates per-country success rate', () => {
    const metrics = [
      createMetric({ id: '1', countryCode: 'JPN', status: 'success' }),
      createMetric({ id: '2', countryCode: 'JPN', status: 'failed' }),
    ];
    const result = generateCountryBreakdown(metrics, mockHealthScore);
    const jpn = result.find(r => r.countryCode === 'JPN')!;
    expect(jpn.successRate).toBe(50);
  });

  it('tracks common errors per country', () => {
    const metrics = [
      createMetric({
        id: '1',
        countryCode: 'JPN',
        userExperience: { retryAttempts: 0, helpViewed: false, guideStepsViewed: 0, errorsEncountered: ['timeout', 'timeout', 'network'] },
      }),
      createMetric({
        id: '2',
        countryCode: 'JPN',
        userExperience: { retryAttempts: 0, helpViewed: false, guideStepsViewed: 0, errorsEncountered: ['timeout'] },
      }),
    ];
    const result = generateCountryBreakdown(metrics, mockHealthScore);
    const jpn = result.find(r => r.countryCode === 'JPN')!;
    // 'timeout' should be the most common error
    expect(jpn.commonErrors[0]).toBe('timeout');
  });

  it('returns empty array for empty metrics', () => {
    const result = generateCountryBreakdown([], mockHealthScore);
    expect(result).toEqual([]);
  });
});

// --- generatePerformanceTrends ---

describe('generatePerformanceTrends', () => {
  it('groups metrics by day and calculates daily success rates', () => {
    const metrics = [
      createMetric({ id: '1', timestamp: '2026-03-25T10:00:00Z', status: 'success' }),
      createMetric({ id: '2', timestamp: '2026-03-25T14:00:00Z', status: 'failed' }),
      createMetric({ id: '3', timestamp: '2026-03-26T09:00:00Z', status: 'success' }),
    ];
    const result = generatePerformanceTrends(metrics);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-03-25');
    expect(result[0].successRate).toBe(50);
    expect(result[0].submissionVolume).toBe(2);
    expect(result[1].date).toBe('2026-03-26');
    expect(result[1].successRate).toBe(100);
    expect(result[1].submissionVolume).toBe(1);
  });

  it('sorts results by date ascending', () => {
    const metrics = [
      createMetric({ id: '1', timestamp: '2026-03-27T10:00:00Z' }),
      createMetric({ id: '2', timestamp: '2026-03-25T10:00:00Z' }),
    ];
    const result = generatePerformanceTrends(metrics);
    expect(result[0].date).toBe('2026-03-25');
    expect(result[1].date).toBe('2026-03-27');
  });

  it('calculates average response time', () => {
    const metrics = [
      createMetric({ id: '1', timestamp: '2026-03-25T10:00:00Z', portalPerformance: { responseTimeMs: 300, portalStatus: 'healthy' } }),
      createMetric({ id: '2', timestamp: '2026-03-25T14:00:00Z', portalPerformance: { responseTimeMs: 100, portalStatus: 'healthy' } }),
    ];
    const result = generatePerformanceTrends(metrics);
    // (300 + 100) / 2 = 200
    expect(result[0].averageResponseTime).toBe(200);
  });

  it('returns empty array for empty metrics', () => {
    expect(generatePerformanceTrends([])).toEqual([]);
  });
});

// --- generateErrorAnalysis ---

describe('generateErrorAnalysis', () => {
  it('counts errors and identifies affected countries', () => {
    const metrics = [
      createMetric({
        id: '1',
        countryCode: 'JPN',
        timestamp: '2026-03-25T10:00:00Z',
        userExperience: { retryAttempts: 0, helpViewed: false, guideStepsViewed: 0, errorsEncountered: ['timeout', 'network'] },
      }),
      createMetric({
        id: '2',
        countryCode: 'MYS',
        timestamp: '2026-03-25T11:00:00Z',
        userExperience: { retryAttempts: 0, helpViewed: false, guideStepsViewed: 0, errorsEncountered: ['timeout'] },
      }),
    ];
    const result = generateErrorAnalysis(metrics);

    const timeoutError = result.topErrors.find(e => e.error === 'timeout')!;
    expect(timeoutError.frequency).toBe(2);
    expect(timeoutError.affectedCountries).toContain('JPN');
    expect(timeoutError.affectedCountries).toContain('MYS');

    const networkError = result.topErrors.find(e => e.error === 'network')!;
    expect(networkError.frequency).toBe(1);
    expect(networkError.affectedCountries).toEqual(['JPN']);
  });

  it('sorts top errors by frequency descending', () => {
    const metrics = [
      createMetric({
        id: '1',
        userExperience: { retryAttempts: 0, helpViewed: false, guideStepsViewed: 0, errorsEncountered: ['rare', 'common', 'common', 'common'] },
      }),
    ];
    const result = generateErrorAnalysis(metrics);
    expect(result.topErrors[0].error).toBe('common');
    expect(result.topErrors[0].frequency).toBe(3);
    expect(result.topErrors[1].error).toBe('rare');
  });

  it('includes daily error trends sorted by date', () => {
    const metrics = [
      createMetric({
        id: '1',
        timestamp: '2026-03-26T10:00:00Z',
        userExperience: { retryAttempts: 0, helpViewed: false, guideStepsViewed: 0, errorsEncountered: ['err_a'] },
      }),
      createMetric({
        id: '2',
        timestamp: '2026-03-25T10:00:00Z',
        userExperience: { retryAttempts: 0, helpViewed: false, guideStepsViewed: 0, errorsEncountered: ['err_b'] },
      }),
    ];
    const result = generateErrorAnalysis(metrics);
    expect(result.errorTrends[0].date).toBe('2026-03-25');
    expect(result.errorTrends[1].date).toBe('2026-03-26');
  });

  it('returns empty arrays when no errors exist', () => {
    const metrics = [createMetric({ id: '1' })]; // no errors
    const result = generateErrorAnalysis(metrics);
    expect(result.topErrors).toEqual([]);
    expect(result.errorTrends).toEqual([]);
  });
});

// --- generateUXInsights ---

describe('generateUXInsights', () => {
  it('returns zeroes for empty metrics', () => {
    const result = generateUXInsights([]);
    expect(result.averageRetryAttempts).toBe(0);
    expect(result.helpUsageRate).toBe(0);
    expect(result.guideCompletionRate).toBe(0);
    expect(result.abandonmentRate).toBe(0);
    expect(result.timeToSuccess).toBe(0);
  });

  it('calculates average retry attempts', () => {
    const metrics = [
      createMetric({ id: '1', userExperience: { retryAttempts: 2, helpViewed: false, guideStepsViewed: 0, errorsEncountered: [] } }),
      createMetric({ id: '2', userExperience: { retryAttempts: 4, helpViewed: false, guideStepsViewed: 0, errorsEncountered: [] } }),
    ];
    const result = generateUXInsights(metrics);
    expect(result.averageRetryAttempts).toBe(3);
  });

  it('calculates help usage rate as percentage', () => {
    const metrics = [
      createMetric({ id: '1', userExperience: { retryAttempts: 0, helpViewed: true, guideStepsViewed: 0, errorsEncountered: [] } }),
      createMetric({ id: '2', userExperience: { retryAttempts: 0, helpViewed: false, guideStepsViewed: 0, errorsEncountered: [] } }),
    ];
    const result = generateUXInsights(metrics);
    expect(result.helpUsageRate).toBe(50);
  });

  it('calculates abandonment rate', () => {
    const metrics = [
      createMetric({ id: '1', status: 'abandoned' }),
      createMetric({ id: '2', status: 'success' }),
      createMetric({ id: '3', status: 'success' }),
      createMetric({ id: '4', status: 'abandoned' }),
    ];
    const result = generateUXInsights(metrics);
    expect(result.abandonmentRate).toBe(50);
  });

  it('calculates time to success only from successful submissions', () => {
    const metrics = [
      createMetric({ id: '1', status: 'success', duration: { preparationMs: 0, submissionMs: 0, totalMs: 1000 } }),
      createMetric({ id: '2', status: 'success', duration: { preparationMs: 0, submissionMs: 0, totalMs: 3000 } }),
      createMetric({ id: '3', status: 'failed', duration: { preparationMs: 0, submissionMs: 0, totalMs: 9000 } }),
    ];
    const result = generateUXInsights(metrics);
    // Average of 1000 and 3000 = 2000, failed one excluded
    expect(result.timeToSuccess).toBe(2000);
  });

  it('calculates guide completion rate from metrics with guideStepsViewed > 0', () => {
    const metrics = [
      createMetric({ id: '1', userExperience: { retryAttempts: 0, helpViewed: false, guideStepsViewed: 3, errorsEncountered: [] } }),
      createMetric({ id: '2', userExperience: { retryAttempts: 0, helpViewed: false, guideStepsViewed: 0, errorsEncountered: [] } }),
    ];
    const result = generateUXInsights(metrics);
    expect(result.guideCompletionRate).toBe(50);
  });
});
