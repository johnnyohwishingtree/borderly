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

export class PortalDetector {
  private knownPortals: Map<string, PortalSignature>;
  private detectionCache: Map<string, PortalIdentification>;

  constructor() {
    this.knownPortals = new Map();
    this.detectionCache = new Map();
    this.initializeKnownPortals();
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
    const captchaScript = `
      (function() {
        const captchaInfo = {
          present: false,
          type: 'unknown',
          selector: null,
          provider: null,
          difficulty: 'medium'
        };

        // Check for reCAPTCHA
        const recaptcha = document.querySelector('.g-recaptcha, #g-recaptcha, iframe[src*="recaptcha"]');
        if (recaptcha) {
          captchaInfo.present = true;
          captchaInfo.type = 'recaptcha';
          captchaInfo.provider = 'Google';
          captchaInfo.selector = recaptcha.className || recaptcha.id || 'iframe[src*="recaptcha"]';
          return captchaInfo;
        }

        // Check for hCaptcha
        const hcaptcha = document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
        if (hcaptcha) {
          captchaInfo.present = true;
          captchaInfo.type = 'hcaptcha';
          captchaInfo.provider = 'hCaptcha';
          captchaInfo.selector = hcaptcha.className || 'iframe[src*="hcaptcha"]';
          return captchaInfo;
        }

        // Check for image-based CAPTCHA
        const imageCaptcha = document.querySelector('img[src*="captcha"], img[alt*="captcha"], .captcha img');
        if (imageCaptcha) {
          captchaInfo.present = true;
          captchaInfo.type = 'image';
          captchaInfo.selector = 'img[src*="captcha"]';
          captchaInfo.difficulty = 'hard';
          return captchaInfo;
        }

        // Check for text-based CAPTCHA
        const textCaptcha = document.querySelector('input[name*="captcha"], input[placeholder*="captcha"]');
        if (textCaptcha) {
          captchaInfo.present = true;
          captchaInfo.type = 'text';
          captchaInfo.selector = textCaptcha.name ? \`input[name="\${textCaptcha.name}"]\` : 'input[placeholder*="captcha"]';
          captchaInfo.difficulty = 'easy';
          return captchaInfo;
        }

        return captchaInfo;
      })();
    `;

    try {
      const result = await executeScript(captchaScript);
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
    const analysisScript = `
      (function() {
        const forms = document.querySelectorAll('form');
        if (forms.length === 0) {
          return { totalSteps: 1, sections: [], requiredFields: [], optionalFields: [], uploadFields: [], validationRules: [] };
        }

        const mainForm = forms[0];
        const structure = {
          totalSteps: 1,
          currentStep: 1,
          sections: [],
          requiredFields: [],
          optionalFields: [],
          uploadFields: [],
          validationRules: []
        };

        // Detect multi-step form
        const stepIndicators = mainForm.querySelectorAll('.step, .page, [data-step]');
        if (stepIndicators.length > 1) {
          structure.totalSteps = stepIndicators.length;

          const activeStep = mainForm.querySelector('.step.active, .step.current, .page.active');
          if (activeStep) {
            const steps = Array.from(stepIndicators);
            structure.currentStep = steps.indexOf(activeStep) + 1;
          }
        }

        // Analyze form sections
        const sections = mainForm.querySelectorAll('fieldset, .section, .form-section, [data-section]');
        sections.forEach((section, index) => {
          const sectionInfo = {
            id: section.id || \`section_\${index}\`,
            name: section.querySelector('legend, h1, h2, h3, h4, h5, h6')?.textContent || \`Section \${index + 1}\`,
            description: section.querySelector('.description, .help-text')?.textContent || undefined,
            fields: [],
            isRequired: section.hasAttribute('required') || section.classList.contains('required')
          };

          const fields = section.querySelectorAll('input, select, textarea');
          fields.forEach(field => {
            const label = field.closest('label') ||
                         document.querySelector(\`label[for="\${field.id}"]\`) ||
                         field.previousElementSibling?.tagName === 'LABEL' ? field.previousElementSibling : null;

            const fieldInfo = {
              id: field.id || field.name || \`field_\${Date.now()}_\${Math.random()}\`,
              name: field.name || field.id || '',
              type: field.type || field.tagName.toLowerCase(),
              label: label?.textContent || field.placeholder || field.name || '',
              placeholder: field.placeholder || '',
              required: field.required || field.hasAttribute('aria-required'),
              selector: field.id ? \`#\${field.id}\` : field.name ? \`[\${field.name}]\` : field.tagName.toLowerCase()
            };

            if (field.tagName === 'SELECT') {
              fieldInfo.options = Array.from(field.options).map(option => ({
                value: option.value,
                text: option.textContent
              }));
            }

            sectionInfo.fields.push(fieldInfo);

            if (fieldInfo.required) {
              structure.requiredFields.push(fieldInfo.id);
            } else {
              structure.optionalFields.push(fieldInfo.id);
            }

            if (field.type === 'file') {
              structure.uploadFields.push({
                id: fieldInfo.id,
                name: fieldInfo.name,
                label: fieldInfo.label,
                selector: fieldInfo.selector,
                acceptedTypes: field.accept ? field.accept.split(',').map(t => t.trim()) : [],
                required: fieldInfo.required,
                multiple: field.multiple,
                description: field.title || fieldInfo.placeholder
              });
            }
          });

          structure.sections.push(sectionInfo);
        });

        // If no sections were found, analyze the whole form
        if (structure.sections.length === 0) {
          const allFields = mainForm.querySelectorAll('input, select, textarea');
          if (allFields.length > 0) {
            const defaultSection = {
              id: 'main_section',
              name: 'Main Form',
              fields: [],
              isRequired: false
            };

            allFields.forEach(field => {
              const label = field.closest('label') ||
                           document.querySelector(\`label[for="\${field.id}"]\`) ||
                           field.previousElementSibling?.tagName === 'LABEL' ? field.previousElementSibling : null;

              const fieldInfo = {
                id: field.id || field.name || \`field_\${Date.now()}_\${Math.random()}\`,
                name: field.name || field.id || '',
                type: field.type || field.tagName.toLowerCase(),
                label: label?.textContent || field.placeholder || field.name || '',
                placeholder: field.placeholder || '',
                required: field.required || field.hasAttribute('aria-required'),
                selector: field.id ? \`#\${field.id}\` : field.name ? \`[name="\${field.name}"]\` : field.tagName.toLowerCase()
              };

              defaultSection.fields.push(fieldInfo);

              if (fieldInfo.required) {
                structure.requiredFields.push(fieldInfo.id);
              } else {
                structure.optionalFields.push(fieldInfo.id);
              }

              if (field.type === 'file') {
                structure.uploadFields.push({
                  id: fieldInfo.id,
                  name: fieldInfo.name,
                  label: fieldInfo.label,
                  selector: fieldInfo.selector,
                  acceptedTypes: field.accept ? field.accept.split(',').map(t => t.trim()) : [],
                  required: fieldInfo.required,
                  multiple: field.multiple,
                  description: field.title || fieldInfo.placeholder
                });
              }
            });

            structure.sections.push(defaultSection);
          }
        }

        return structure;
      })();
    `;

    try {
      return await executeScript(analysisScript);
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

      const changeAnalysis = await this.analyzePortalChanges(previousSignature, currentSignature, executeScript);

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
    const authScript = `
      (function() {
        const authInfo = {
          required: false,
          methods: [],
          loginUrl: null,
          registrationUrl: null,
          sessionDuration: null,
          remembersSession: false,
          twoFactorAuth: false
        };

        const passwordElements = document.querySelectorAll('input[type="password"]');
        const loginLinks = document.querySelectorAll('a[href*="login"]');
        const loginForms = document.querySelectorAll('.login-form, #login-form, .auth-form');

        const allButtons = Array.from(document.querySelectorAll('button'));
        const loginButtons = allButtons.filter(btn =>
          /login|sign\\s*in/i.test(btn.textContent || '')
        );

        const loginElements = [
          ...passwordElements,
          ...loginLinks,
          ...loginForms,
          ...loginButtons
        ];

        if (loginElements.length > 0) {
          authInfo.required = true;

          if (document.querySelector('input[type="email"], input[type="text"][placeholder*="email"]')) {
            authInfo.methods.push('email_password');
          }

          if (document.querySelector('input[type="tel"], input[placeholder*="phone"]')) {
            authInfo.methods.push('phone_otp');
          }

          if (document.querySelector('.social-login, [class*="google"], [class*="facebook"]')) {
            authInfo.methods.push('social_login');
          }

          if (document.querySelector('.guest-access, .continue-guest')) {
            authInfo.methods.push('guest_access');
          }

          const loginLink = document.querySelector('a[href*="login"]');
          if (loginLink) {
            authInfo.loginUrl = loginLink.href;
          }

          const registerLink = document.querySelector('a[href*="register"], a[href*="signup"]');
          if (registerLink) {
            authInfo.registrationUrl = registerLink.href;
          }

          const rememberMe = document.querySelector('input[name*="remember"], .remember-me');
          authInfo.remembersSession = !!rememberMe;

          const twoFactorElements = document.querySelectorAll('.two-factor, .2fa, [placeholder*="verification code"]');
          authInfo.twoFactorAuth = twoFactorElements.length > 0;
        }

        return authInfo;
      })();
    `;

    try {
      return await executeScript(authScript);
    } catch {
      return this.getDefaultAuthInfo();
    }
  }

  private async getPageInfo(executeScript: (code: string) => Promise<any>) {
    const pageInfoScript = `
      ({
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname,
        pathname: window.location.pathname,
        language: document.documentElement.lang || document.querySelector('html').getAttribute('lang') || 'en',
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        userAgent: navigator.userAgent,
        hasJavaScript: true,
        loadTime: document.readyState
      })
    `;

    return await executeScript(pageInfoScript);
  }

  private async analyzePortal(
    pageInfo: any,
    executeScript: (code: string) => Promise<any>
  ): Promise<PortalIdentification> {
    for (const [portalType, signature] of this.knownPortals.entries()) {
      const confidence = this.calculateSignatureMatch(pageInfo, signature);

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
    const featureScript = `
      (function() {
        return {
          hasFileUpload: document.querySelectorAll('input[type="file"]').length > 0,
          hasMultiPageForm: document.querySelectorAll('.step, .page, [data-step]').length > 1,
          hasProgressIndicator: document.querySelectorAll('.progress, .step-indicator, .breadcrumb').length > 0,
          hasSessionTimeout: document.querySelector('meta[name*="session"], script:contains("session")') !== null,
          hasCaptcha: document.querySelectorAll('.g-recaptcha, .h-captcha, img[src*="captcha"]').length > 0,
          hasQRCodeGeneration: document.querySelector('canvas, img[src*="qr"], .qr-code') !== null,
          hasLanguageSelection: document.querySelectorAll('.language-selector, select[name*="lang"], [hreflang]').length > 0,
          hasFormSave: document.querySelector('.save-form, .save-progress, button:contains("Save")') !== null,
          hasPrefill: document.querySelector('[data-prefill], .prefilled') !== null,
          hasValidation: document.querySelectorAll('[required], [pattern], .validation').length > 0,
          supportsMobile: window.innerWidth < 768 && document.querySelector('meta[name="viewport"]') !== null,
          requiresJavaScript: document.querySelector('noscript')?.textContent?.includes('JavaScript') || false
        };
      })();
    `;

    try {
      return await executeScript(featureScript);
    } catch {
      return this.getDefaultFeatures();
    }
  }

  private initializeKnownPortals(): void {
    this.knownPortals.set('japan_vjw', {
      name: 'Visit Japan Web',
      countryCode: 'JP',
      version: '1.0',
      domains: ['vjw-lp.digital.go.jp', 'vjw.digital.go.jp'],
      urlPatterns: ['/vjw/', '/visit-japan-web/'],
      titlePatterns: ['Visit Japan Web', 'VJW'],
      bodyTextPatterns: ['入国手続', 'Immigration', 'Customs Declaration'],
      elementSelectors: ['#vjw-form', '.vjw-container'],
      cssClasses: ['vjw-page', 'immigration-form'],
      metaTags: [{ name: 'application-name', content: 'Visit Japan Web' }]
    });

    this.knownPortals.set('malaysia_mdac', {
      name: 'Malaysia Digital Arrival Card',
      countryCode: 'MY',
      version: '1.0',
      domains: ['mdac.gov.my', 'mdac.immigration.gov.my'],
      urlPatterns: ['/mdac/', '/digital-arrival/'],
      titlePatterns: ['MDAC', 'Digital Arrival Card', 'Malaysia Immigration'],
      bodyTextPatterns: ['Malaysia Digital Arrival Card', 'MDAC', 'Immigration Malaysia'],
      elementSelectors: ['#mdac-form', '.immigration-form'],
      cssClasses: ['mdac-portal', 'arrival-card'],
      metaTags: [{ name: 'description', content: 'Malaysia Digital Arrival Card' }]
    });

    this.knownPortals.set('singapore_ica', {
      name: 'Singapore ICA eServices',
      countryCode: 'SG',
      version: '1.0',
      domains: ['eservices.ica.gov.sg', 'checkport.ica.gov.sg'],
      urlPatterns: ['/ica/', '/eservices/', '/arrival-card/'],
      titlePatterns: ['ICA', 'Singapore Immigration', 'SG Arrival Card'],
      bodyTextPatterns: ['Immigration & Checkpoints Authority', 'SG Arrival Card'],
      elementSelectors: ['.ica-form', '#arrival-card-form'],
      cssClasses: ['ica-portal', 'sg-gov'],
      metaTags: [{ name: 'generator', content: 'ICA' }]
    });
  }

  private calculateSignatureMatch(pageInfo: any, signature: PortalSignature): number {
    let score = 0;
    let maxScore = 0;

    maxScore += 30;
    if (signature.domains.some(domain => pageInfo.domain.includes(domain))) {
      score += 30;
    }

    maxScore += 20;
    if (signature.urlPatterns.some(pattern => pageInfo.pathname.includes(pattern))) {
      score += 20;
    }

    maxScore += 20;
    if (signature.titlePatterns.some(pattern => pageInfo.title.includes(pattern))) {
      score += 20;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  private async generatePortalSignature(executeScript: (code: string) => Promise<any>): Promise<string> {
    const signatureScript = `
      (function() {
        const elements = [];

        document.querySelectorAll('form, .form, .step, .page, fieldset').forEach(el => {
          elements.push({
            tag: el.tagName,
            id: el.id,
            classes: el.className,
            childCount: el.children.length
          });
        });

        return {
          url: window.location.href,
          title: document.title,
          elements: elements,
          formCount: document.querySelectorAll('form').length,
          inputCount: document.querySelectorAll('input').length,
          hash: document.head.innerHTML.length + document.body.innerHTML.length
        };
      })();
    `;

    const signature = await executeScript(signatureScript);
    return JSON.stringify(signature);
  }

  private async analyzePortalChanges(
    previousSignature: string,
    currentSignature: string,
    _executeScript: (code: string) => Promise<any>
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
