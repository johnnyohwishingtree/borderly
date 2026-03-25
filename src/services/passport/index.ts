export {
  processCameraText,
  MRZScanner,
  validateScannedPassport,
  getScanningGuidance,
  createOptimizedMRZScanner,
  defaultScannerConfig,
  performanceConfigs,
} from './mrzScanner';
export type { TextRecognition, ScanResult, ScannerConfig } from './mrzScannerTypes';
export { parseMRZ, extractMRZFromText } from './mrzParser';
export type { MRZParseResult } from './mrzParser';
