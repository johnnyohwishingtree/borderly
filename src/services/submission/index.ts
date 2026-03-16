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
export {
  getPortalInfo,
  getAllPortals,
  getAllowedDomains,
  getPortalName,
  getPortalBaseUrl,
} from './portalRegistry';
export type { PortalInfo } from './portalRegistry';
export { detectLoginForm, is2FAPrompt, isLoginError } from './loginDetector';
export type { LoginFormInfo } from './loginDetector';
export {
  buildLoginScript,
  buildLoginDetectionScript,
  buildLoginSuccessCheckScript,
} from './autoLogin';
export type {
  AutoLoginResultPayload,
  LoginDetectionResultPayload,
  LoginSuccessCheckPayload,
} from './autoLogin';