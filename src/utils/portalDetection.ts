/**
 * Portal Detection - Utilities for identifying and analyzing government portals
 * 
 * Provides intelligent detection of government portal types, form structures,
 * authentication requirements, and dynamic content patterns.
 */


/**
 * Portal identification result
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

/**
 * Portal features and capabilities
 */
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

/**
 * Authentication requirements
 */
export interface AuthenticationInfo {
  required: boolean;
  methods: AuthMethod[];
  loginUrl?: string;
  registrationUrl?: string;
  sessionDuration?: number; // minutes
  remembersSession: boolean;
  twoFactorAuth: boolean;
}

/**
 * Authentication methods
 */
export type AuthMethod = 
  | 'email_password'
  | 'phone_otp'
  | 'social_login'
  | 'government_id'
  | 'digital_certificate'
  | 'biometric'
  | 'guest_access';

/**
 * Form structure information
 */
export interface FormStructureInfo {
  totalSteps: number;
  currentStep?: number;
  sections: FormSectionInfo[];
  requiredFields: string[];
  optionalFields: string[];
  uploadFields: UploadFieldInfo[];
  validationRules: ValidationRule[];
}

/**
 * Form section information
 */
export interface FormSectionInfo {
  id: string;
  name: string;
  description?: string;
  fields: FormFieldInfo[];
  isRequired: boolean;
  dependencies?: string[]; // IDs of sections this depends on
}

/**
 * Form field information
 */
export interface FormFieldInfo {
  id: string;
  name: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'file';
  label: string;
  placeholder?: string;
  required: boolean;
  selector: string;
  validation?: FieldValidationInfo;
  options?: { value: string; text: string }[]; // For select/radio fields
}

/**
 * Upload field information
 */
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

/**
 * Field validation information
 */
export interface FieldValidationInfo {
  pattern?: string; // regex pattern
  minLength?: number;
  maxLength?: number;
  min?: number; // for numeric fields
  max?: number; // for numeric fields
  customRules?: string[]; // custom validation rules
}

/**
 * Validation rules
 */
export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
  trigger: 'onBlur' | 'onInput' | 'onSubmit';
}

/**
 * Portal change detection
 */
export interface PortalChangeInfo {
  hasChanged: boolean;
  changeType: 'layout' | 'content' | 'structure' | 'authentication' | 'unknown';
  description: string;
  impact: 'low' | 'medium' | 'high';
  suggestedAction: string;
  changedElements: string[];
}

/**
 * CAPTCHA detection result
 */
export interface CaptchaInfo {
  present: boolean;
  type?: 'recaptcha' | 'hcaptcha' | 'image' | 'text' | 'audio' | 'unknown';
  selector?: string;
  provider?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  bypassable?: boolean;
}

/**
 * Main portal detection class
 */
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
      // Get page information
      const pageInfo = await this.getPageInfo(executeScript);
      const cacheKey = `${pageInfo.url}_${pageInfo.title}`;

      // Check cache first
      const cached = this.detectionCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Analyze page for portal signatures
      const identification = await this.analyzePortal(pageInfo, executeScript);
      
      // Cache the result
      this.detectionCache.set(cacheKey, identification);
      
      return identification;

    } catch (error) {
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
    } catch (error) {
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

        const mainForm = forms[0]; // Assume first form is the main one
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
          
          // Try to determine current step
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

          // Analyze fields in this section
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

            // Extract options for select/radio fields
            if (field.tagName === 'SELECT') {
              fieldInfo.options = Array.from(field.options).map(option => ({
                value: option.value,
                text: option.textContent
              }));
            }

            sectionInfo.fields.push(fieldInfo);

            // Categorize fields
            if (fieldInfo.required) {
              structure.requiredFields.push(fieldInfo.id);
            } else {
              structure.optionalFields.push(fieldInfo.id);
            }

            // Check for upload fields
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
    } catch (error) {
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

      // Analyze the type and impact of changes
      const changeAnalysis = await this.analyzePortalChanges(previousSignature, currentSignature, executeScript);
      
      return changeAnalysis;

    } catch (error) {
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

        // Check for login indicators
        const passwordElements = document.querySelectorAll('input[type="password"]');
        const loginLinks = document.querySelectorAll('a[href*="login"]');
        const loginForms = document.querySelectorAll('.login-form, #login-form, .auth-form');
        
        // Check for login/signin buttons by text content
        const allButtons = Array.from(document.querySelectorAll('button'));
        const loginButtons = allButtons.filter(btn => 
          /login|sign\s*in/i.test(btn.textContent || '')
        );
        
        const loginElements = [
          ...passwordElements,
          ...loginLinks,
          ...loginForms,
          ...loginButtons
        ];

        if (loginElements.length > 0) {
          authInfo.required = true;

          // Detect authentication methods
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

          // Look for login and registration URLs
          const loginLink = document.querySelector('a[href*="login"]');
          if (loginLink) {
            authInfo.loginUrl = loginLink.href;
          }

          const registerLink = document.querySelector('a[href*="register"], a[href*="signup"]');
          if (registerLink) {
            authInfo.registrationUrl = registerLink.href;
          }

          // Check for "Remember Me" functionality
          const rememberMe = document.querySelector('input[name*="remember"], .remember-me');
          authInfo.remembersSession = !!rememberMe;

          // Check for 2FA indicators
          const twoFactorElements = document.querySelectorAll('.two-factor, .2fa, [placeholder*="verification code"]');
          authInfo.twoFactorAuth = twoFactorElements.length > 0;
        }

        return authInfo;
      })();
    `;

    try {
      return await executeScript(authScript);
    } catch (error) {
      return this.getDefaultAuthInfo();
    }
  }

  /**
   * Get page information
   */
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

  /**
   * Analyze portal based on page information and DOM
   */
  private async analyzePortal(
    pageInfo: any,
    executeScript: (code: string) => Promise<any>
  ): Promise<PortalIdentification> {
    // Check against known portal signatures
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

    // Generic analysis if no known portal matched
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

  /**
   * Detect portal features
   */
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
    } catch (error) {
      return this.getDefaultFeatures();
    }
  }

  /**
   * Initialize known portal signatures
   */
  private initializeKnownPortals(): void {
    // Japan - Visit Japan Web
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

    // Malaysia - MDAC
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

    // Singapore - ICA
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

  /**
   * Calculate confidence score for portal signature match
   */
  private calculateSignatureMatch(pageInfo: any, signature: PortalSignature): number {
    let score = 0;
    let maxScore = 0;

    // Domain matching (highest weight)
    maxScore += 30;
    if (signature.domains.some(domain => pageInfo.domain.includes(domain))) {
      score += 30;
    }

    // URL pattern matching
    maxScore += 20;
    if (signature.urlPatterns.some(pattern => pageInfo.pathname.includes(pattern))) {
      score += 20;
    }

    // Title matching
    maxScore += 20;
    if (signature.titlePatterns.some(pattern => pageInfo.title.includes(pattern))) {
      score += 20;
    }

    // Additional checks would go here...
    
    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Generate portal signature for change detection
   */
  private async generatePortalSignature(executeScript: (code: string) => Promise<any>): Promise<string> {
    const signatureScript = `
      (function() {
        const elements = [];
        
        // Collect key structural elements
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

  /**
   * Analyze portal changes
   */
  private async analyzePortalChanges(
    previousSignature: string,
    currentSignature: string,
    _executeScript: (code: string) => Promise<any>
  ): Promise<PortalChangeInfo> {
    try {
      const prev = JSON.parse(previousSignature);
      const curr = JSON.parse(currentSignature);

      // URL change
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

      // Title change
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

      // Form structure change
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

      // Content hash change (indicates layout or content changes)
      const hashDifference = Math.abs(prev.hash - curr.hash) / Math.max(prev.hash, curr.hash);
      if (hashDifference > 0.1) { // 10% change threshold
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

    } catch (error) {
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

  /**
   * Guess country from domain
   */
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

  /**
   * Get default portal features
   */
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

  /**
   * Get default authentication info
   */
  private getDefaultAuthInfo(): AuthenticationInfo {
    return {
      required: false,
      methods: [],
      remembersSession: false,
      twoFactorAuth: false
    };
  }

  /**
   * Get default form structure
   */
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

/**
 * Portal signature for pattern matching
 */
interface PortalSignature {
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