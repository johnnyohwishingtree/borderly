export {
  processCameraText,
  MRZScanner,
  validateScannedPassport,
  getScanningGuidance,
  createOptimizedMRZScanner,
  defaultScannerConfig,
  performanceConfigs,
} from './mrzScanner';
export type { TextRecognition, ScanResult, ScannerConfig } from './mrzScanner';
export { parseMRZ, extractMRZFromText } from './mrzScanner/mrzParser';
export type { MRZParseResult } from './mrzScanner/mrzParser';
