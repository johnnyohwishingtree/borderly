/**
 * Portal utilities barrel export
 */

export { PortalDetector } from './portalDetector';
export { initializeKnownPortals, calculateSignatureMatch } from './knownPortals';
export {
  CAPTCHA_DETECTION_SCRIPT,
  FORM_ANALYSIS_SCRIPT,
  AUTH_CHECK_SCRIPT,
  FEATURE_DETECTION_SCRIPT,
  PAGE_INFO_SCRIPT,
  SIGNATURE_GENERATION_SCRIPT,
} from './portalScripts';
export type {
  PortalIdentification,
  PortalFeatures,
  AuthenticationInfo,
  FormStructureInfo,
  FormSectionInfo,
  FormFieldInfo,
  UploadFieldInfo,
  FieldValidationInfo,
  ValidationRule,
  PortalChangeInfo,
  CaptchaInfo,
  AuthMethod,
  PortalSignature,
} from './portalTypes';
