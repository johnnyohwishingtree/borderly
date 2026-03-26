/**
 * Large inline JavaScript strings used for portal detection via executeScript calls.
 */

export const CAPTCHA_DETECTION_SCRIPT = `
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

export const FORM_ANALYSIS_SCRIPT = `
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

export const AUTH_CHECK_SCRIPT = `
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

export const FEATURE_DETECTION_SCRIPT = `
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

export const PAGE_INFO_SCRIPT = `
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

export const SIGNATURE_GENERATION_SCRIPT = `
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
