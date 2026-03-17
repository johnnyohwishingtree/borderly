/**
 * Type definitions for portal detection and analysis
 */

export interface PortalIdentification {
  portalType: 'japan_vjw' | 'malaysia_mdac' | 'singapore_ica' | 'generic' | 'unknown';
  confidence: number; // 0-1
  countryCode: string;
  portalName: string;
  portalUrl: string;
  version?: string;
  features: PortalFeatures;
  authentication: AuthenticationInfo;
  formStructure: FormStructureInfo;
}

export interface PortalFeatures {
  hasFileUpload: boolean;
  hasMultiPageForm: boolean;
  hasProgressIndicator: boolean;
  hasSessionTimeout: boolean;
  hasCaptcha: boolean;
  hasQRCodeGeneration: boolean;
  hasLanguageSelection: boolean;
  hasFormSave: boolean;
  hasPrefill: boolean;
  hasValidation: boolean;
  supportsMobile: boolean;
  requiresJavaScript: boolean;
}

export interface AuthenticationInfo {
  required: boolean;
  methods: AuthMethod[];
  loginUrl?: string;
  registrationUrl?: string;
  sessionDuration?: number; // minutes
  remembersSession: boolean;
  twoFactorAuth: boolean;
}

export type AuthMethod =
  | 'email_password'
  | 'phone_otp'
  | 'social_login'
  | 'government_id'
  | 'digital_certificate'
  | 'biometric'
  | 'guest_access';

export interface FormStructureInfo {
  totalSteps: number;
  currentStep?: number;
  sections: FormSectionInfo[];
  requiredFields: string[];
  optionalFields: string[];
  uploadFields: UploadFieldInfo[];
  validationRules: ValidationRule[];
}

export interface FormSectionInfo {
  id: string;
  name: string;
  description?: string;
  fields: FormFieldInfo[];
  isRequired: boolean;
  dependencies?: string[];
}

export interface FormFieldInfo {
  id: string;
  name: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'file';
  label: string;
  placeholder?: string;
  required: boolean;
  selector: string;
  validation?: FieldValidationInfo;
  options?: { value: string; text: string }[];
}

export interface UploadFieldInfo {
  id: string;
  name: string;
  label: string;
  selector: string;
  acceptedTypes: string[];
  maxSize?: number;
  required: boolean;
  multiple: boolean;
  description?: string;
}

export interface FieldValidationInfo {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  customRules?: string[];
}

export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
  trigger: 'onBlur' | 'onInput' | 'onSubmit';
}

export interface PortalChangeInfo {
  hasChanged: boolean;
  changeType: 'layout' | 'content' | 'structure' | 'authentication' | 'unknown';
  description: string;
  impact: 'low' | 'medium' | 'high';
  suggestedAction: string;
  changedElements: string[];
}

export interface CaptchaInfo {
  present: boolean;
  type?: 'recaptcha' | 'hcaptcha' | 'image' | 'text' | 'audio' | 'unknown';
  selector?: string;
  provider?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  bypassable?: boolean;
}

export interface PortalSignature {
  name: string;
  countryCode: string;
  version: string;
  domains: string[];
  urlPatterns: string[];
  titlePatterns: string[];
  bodyTextPatterns: string[];
  elementSelectors: string[];
  cssClasses: string[];
  metaTags: Array<{ name: string; content: string }>;
}
