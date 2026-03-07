/**
 * Monitoring Services Index
 * 
 * Exports all monitoring and analytics services for the
 * Government Portal Testing & Validation Framework
 */

export {
  SubmissionAnalytics,
  submissionAnalytics,
  type SubmissionMetric,
  type AnalyticsReport,
  type CountryAnalytics,
  type PerformanceTrend,
  type ErrorAnalysis,
  type UXInsights
} from './submissionAnalytics';

export {
  PortalMonitor,
  portalMonitor,
  type MonitoringConfig,
  type PortalAlert,
  type MonitoringStatus,
  type AutoResponse
} from './portalMonitor';