/**
 * Submission components barrel export
 */

/** @deprecated AutomatedSubmissionView is replaced by PortalWebView + PortalSubmissionScreen. See #249. */
export { AutomatedSubmissionView } from './AutomatedSubmissionView';
// Utility functions remain usable until the stub is fully removed
export {
  formatErrorMessage,
  getStatusColor,
  getStatusText
} from './AutomatedSubmissionView';
export { PortalWebView } from './PortalWebView';
export type { PortalWebViewHandle, PortalWebViewProps, NavigationState } from './PortalWebView';
export { AutoFillBanner } from './AutoFillBanner';
export type { AutoFillBannerProps } from './AutoFillBanner';
export { QRSaveOverlay } from './QRSaveOverlay';
export type { QRSaveOverlayProps, QRPageDetectedPayload } from './QRSaveOverlay';