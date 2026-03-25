export { ElementDetector } from './elementDetector';
export {
  meetsCondition,
  calculateNextDelay,
  generateCacheKey,
  escapeSelector,
  buildDetectionScript,
  buildFormReadinessScript,
  buildStabilityScript,
  captureFailureScreenshot,
} from './detectionHelpers';
export type {
  DetectionConfig,
  DetectionCriteria,
  PollingStrategy,
  ElementDetectionResult,
  ElementInfo,
  CacheEntry,
  ChangeObserver,
} from './detectionTypes';
