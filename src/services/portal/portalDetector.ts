/**
 * Portal Detection - Identifies and analyzes government portals
 */

import type {
  PortalIdentification,
  PortalFeatures,
  AuthenticationInfo,
  FormStructureInfo,
  PortalChangeInfo,
  CaptchaInfo,
  PortalSignature,
} from './portalTypes';
import { initializeKnownPortals, calculateSignatureMatch } from './knownPortals';
import {
  CAPTCHA_DETECTION_SCRIPT,
  FORM_ANALYSIS_SCRIPT,
  AUTH_CHECK_SCRIPT,
  FEATURE_DETECTION_SCRIPT,
  PAGE_INFO_SCRIPT,
  SIGNATURE_GENERATION_SCRIPT,
} from './portalScripts';

export class PortalDetector {
  private knownPortals: Map<string, PortalSignature>;
  private detectionCache: Map<string, PortalIdentification>;

  constructor() {
    this.knownPortals = new Map();
    this.detectionCache = new Map();
    this.knownPortals = initializeKnownPortals();
  }

  /**
   * Identify the current portal
   */
  async identifyPortal(
    executeScript: (code: string) => Promise<any>
  ): Promise<PortalIdentification> {
    try {
      const pageInfo = await this.getPageInfo(executeScript);
      const cacheKey = `${pageInfo.url}_${pageInfo.title}`;

      const cached = this.detectionCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const identification = await this.analyzePortal(pageInfo, executeScript);
      this.detectionCache.set(cacheKey, identification);

      return identification;

    } catch {
      return {
        portalType: 'unknown',
        confidence: 0,
        countryCode: '',
        portalName: 'Unknown Portal',
        portalUrl: '',
        features: this.getDefaultFeatures(),
        authentication: this.getDefaultAuthInfo(),
        formStructure: this.getDefaultFormStructure()
      };
    }
  }

  /**
   * Detect CAPTCHA on the current page
   */
  async detectCaptcha(
    executeScript: (code: string) => Promise<any>
  ): Promise<CaptchaInfo> {
    try {
      const result = await executeScript(CAPTCHA_DETECTION_SCRIPT);
      return {
        present: result.present,
        type: result.type,
        selector: result.selector,
        provider: result.provider,
        difficulty: result.difficulty,
        bypassable: result.type === 'text' || result.type === 'image'
      };
    } catch {
      return { present: false };
    }
  }

  /**
   * Analyze form structure on the current page
   */
  async analyzeFormStructure(
    executeScript: (code: string) => Promise<any>
  ): Promise<FormStructureInfo> {
    try {
      return await executeScript(FORM_ANALYSIS_SCRIPT);
    } catch {
      return this.getDefaultFormStructure();
    }
  }

  /**
   * Detect portal changes that might affect automation
   */
  async detectPortalChanges(
    previousSignature: string,
    executeScript: (code: string) => Promise<any>
  ): Promise<PortalChangeInfo> {
    try {
      const currentSignature = await this.generatePortalSignature(executeScript);

      if (previousSignature === currentSignature) {
        return {
          hasChanged: false,
          changeType: 'unknown',
          description: 'No changes detected',
          impact: 'low',
          suggestedAction: 'Continue with automation',
          changedElements: []
        };
      }

      const changeAnalysis = await this.analyzePortalChanges(previousSignature, currentSignature);

      return changeAnalysis;

    } catch {
      return {
        hasChanged: true,
        changeType: 'unknown',
        description: 'Unable to detect changes due to error',
        impact: 'high',
        suggestedAction: 'Fallback to manual submission',
        changedElements: []
      };
    }
  }

  /**
   * Check if portal requires authentication
   */
  async checkAuthenticationRequired(
    executeScript: (code: string) => Promise<any>
  ): Promise<AuthenticationInfo> {
    try {
      return await executeScript(AUTH_CHECK_SCRIPT);
    } catch {
      return this.getDefaultAuthInfo();
    }
  }

  private async getPageInfo(executeScript: (code: string) => Promise<any>) {
    return await executeScript(PAGE_INFO_SCRIPT);
  }

  private async analyzePortal(
    pageInfo: any,
    executeScript: (code: string) => Promise<any>
  ): Promise<PortalIdentification> {
    for (const [portalType, signature] of this.knownPortals.entries()) {
      const confidence = calculateSignatureMatch(pageInfo, signature);

      if (confidence > 0.7) {
        const features = await this.detectPortalFeatures(executeScript);
        const authentication = await this.checkAuthenticationRequired(executeScript);
        const formStructure = await this.analyzeFormStructure(executeScript);

        return {
          portalType: portalType as any,
          confidence,
          countryCode: signature.countryCode,
          portalName: signature.name,
          portalUrl: pageInfo.url,
          version: signature.version,
          features,
          authentication,
          formStructure
        };
      }
    }

    const features = await this.detectPortalFeatures(executeScript);
    const authentication = await this.checkAuthenticationRequired(executeScript);
    const formStructure = await this.analyzeFormStructure(executeScript);

    return {
      portalType: 'generic',
      confidence: 0.5,
      countryCode: this.guessCountryFromDomain(pageInfo.domain),
      portalName: pageInfo.title || 'Government Portal',
      portalUrl: pageInfo.url,
      features,
      authentication,
      formStructure
    };
  }

  private async detectPortalFeatures(
    executeScript: (code: string) => Promise<any>
  ): Promise<PortalFeatures> {
    try {
      return await executeScript(FEATURE_DETECTION_SCRIPT);
    } catch {
      return this.getDefaultFeatures();
    }
  }

  private async generatePortalSignature(executeScript: (code: string) => Promise<any>): Promise<string> {
    const signature = await executeScript(SIGNATURE_GENERATION_SCRIPT);
    return JSON.stringify(signature);
  }

  private async analyzePortalChanges(
    previousSignature: string,
    currentSignature: string
  ): Promise<PortalChangeInfo> {
    try {
      const prev = JSON.parse(previousSignature);
      const curr = JSON.parse(currentSignature);

      if (prev.url !== curr.url) {
        return {
          hasChanged: true,
          changeType: 'content',
          description: 'Page URL has changed',
          impact: 'high',
          suggestedAction: 'Update navigation and re-analyze portal',
          changedElements: ['url']
        };
      }

      if (prev.title !== curr.title) {
        return {
          hasChanged: true,
          changeType: 'content',
          description: 'Page title has changed',
          impact: 'low',
          suggestedAction: 'Continue with current automation',
          changedElements: ['title']
        };
      }

      if (prev.formCount !== curr.formCount || prev.inputCount !== curr.inputCount) {
        return {
          hasChanged: true,
          changeType: 'structure',
          description: 'Form structure has changed',
          impact: 'high',
          suggestedAction: 'Re-analyze form structure and update field mappings',
          changedElements: ['forms', 'inputs']
        };
      }

      const hashDifference = Math.abs(prev.hash - curr.hash) / Math.max(prev.hash, curr.hash);
      if (hashDifference > 0.1) {
        return {
          hasChanged: true,
          changeType: 'layout',
          description: 'Significant page content changes detected',
          impact: 'medium',
          suggestedAction: 'Verify field selectors and re-test automation',
          changedElements: ['content']
        };
      }

      return {
        hasChanged: false,
        changeType: 'unknown',
        description: 'No significant changes detected',
        impact: 'low',
        suggestedAction: 'Continue with automation',
        changedElements: []
      };

    } catch {
      return {
        hasChanged: true,
        changeType: 'unknown',
        description: 'Error analyzing changes',
        impact: 'high',
        suggestedAction: 'Manual verification required',
        changedElements: []
      };
    }
  }

  private guessCountryFromDomain(domain: string): string {
    const countryTlds: Record<string, string> = {
      '.jp': 'JP',
      '.my': 'MY',
      '.sg': 'SG',
      '.th': 'TH',
      '.vn': 'VN',
      '.uk': 'GB',
      '.gov.uk': 'GB',
      '.gov.au': 'AU',
      '.gov.ca': 'CA',
      '.gov': 'US'
    };

    for (const [tld, countryCode] of Object.entries(countryTlds)) {
      if (domain.includes(tld)) {
        return countryCode;
      }
    }

    return '';
  }

  private getDefaultFeatures(): PortalFeatures {
    return {
      hasFileUpload: false,
      hasMultiPageForm: false,
      hasProgressIndicator: false,
      hasSessionTimeout: false,
      hasCaptcha: false,
      hasQRCodeGeneration: false,
      hasLanguageSelection: false,
      hasFormSave: false,
      hasPrefill: false,
      hasValidation: false,
      supportsMobile: false,
      requiresJavaScript: false
    };
  }

  private getDefaultAuthInfo(): AuthenticationInfo {
    return {
      required: false,
      methods: [],
      remembersSession: false,
      twoFactorAuth: false
    };
  }

  private getDefaultFormStructure(): FormStructureInfo {
    return {
      totalSteps: 1,
      currentStep: 1,
      sections: [],
      requiredFields: [],
      optionalFields: [],
      uploadFields: [],
      validationRules: []
    };
  }
}
