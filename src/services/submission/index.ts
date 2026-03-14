/**
 * Submission services barrel export
 */

export { SubmissionEngine } from './submissionEngine';
export { WebViewController } from './webviewController';
export type { WebViewHandle } from './webviewController';
export { AutomationScriptRegistry, AutomationScriptUtils, automationScriptRegistry } from './automationScripts';
export { FormFiller, formFiller } from './formFiller';
export type { FieldSpec, FillResult } from './formFiller';
export { PageDetector, pageDetector } from './pageDetection';
export type { DetectedPage } from './pageDetection';