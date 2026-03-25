/**
 * Type definitions for Submission Analytics Service
 *
 * Anonymized metrics about form submissions, portal performance,
 * and user experience. No personally identifiable information.
 */

export interface SubmissionMetric {
  id: string;
  countryCode: string;
  timestamp: string;
  submissionMethod: 'manual' | 'guided' | 'test';
  status: 'success' | 'failed' | 'abandoned' | 'test_success' | 'test_failed';
  duration: {
    preparationMs: number;
    submissionMs: number;
    totalMs: number;
  };
  formStats: {
    totalFields: number;
    autoFilledFields: number;
    userInputFields: number;
    completionPercentage: number;
  };
  portalPerformance: {
    responseTimeMs?: number;
    portalStatus: 'healthy' | 'degraded' | 'offline' | 'error';
    errorType?: string;
  };
  userExperience: {
    retryAttempts: number;
    helpViewed: boolean;
    guideStepsViewed: number;
    errorsEncountered: string[];
  };
  deviceInfo: {
    platform: 'ios' | 'android' | 'web';
    appVersion: string;
  };
}

export interface AnalyticsReport {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalSubmissions: number;
    successRate: number;
    averageDuration: number;
    mostActiveCountry: string;
    completionRate: number;
  };
  countryBreakdown: CountryAnalytics[];
  performanceTrends: PerformanceTrend[];
  errorAnalysis: ErrorAnalysis;
  userExperienceInsights: UXInsights;
}

export interface CountryAnalytics {
  countryCode: string;
  countryName: string;
  submissionCount: number;
  successRate: number;
  averageDuration: number;
  commonErrors: string[];
  portalHealthScore: number;
}

export interface PerformanceTrend {
  date: string;
  successRate: number;
  averageResponseTime: number;
  submissionVolume: number;
}

export interface ErrorAnalysis {
  topErrors: Array<{
    error: string;
    frequency: number;
    affectedCountries: string[];
  }>;
  errorTrends: Array<{
    date: string;
    errorCount: number;
    errorType: string;
  }>;
}

export interface UXInsights {
  averageRetryAttempts: number;
  helpUsageRate: number;
  guideCompletionRate: number;
  abandonmentRate: number;
  timeToSuccess: number;
}
