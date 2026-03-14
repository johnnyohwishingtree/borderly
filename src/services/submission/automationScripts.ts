/**
 * Automation Scripts - Portal-specific automation logic registry
 * 
 * Manages country-specific automation scripts for government portals
 * and provides a registry for loading and executing portal automation.
 */

import { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

/**
 * Registry for automation scripts
 */
export class AutomationScriptRegistry {
  private scripts: Map<string, AutomationScript>;
  private loadedVersions: Map<string, string>;

  constructor() {
    this.scripts = new Map();
    this.loadedVersions = new Map();
    this.loadBuiltinScripts();
  }

  /**
   * Get automation script for a country
   */
  async getScript(countryCode: string): Promise<AutomationScript | null> {
    const script = this.scripts.get(countryCode);
    
    if (!script) {
      // Try to load script dynamically
      const loadedScript = await this.loadScript(countryCode);
      if (loadedScript) {
        this.scripts.set(countryCode, loadedScript);
        return loadedScript;
      }
      return null;
    }
    
    return script;
  }

  /**
   * Register a new automation script
   */
  registerScript(script: AutomationScript): void {
    this.scripts.set(script.countryCode, script);
    this.loadedVersions.set(script.countryCode, script.version);
  }

  /**
   * Get all available country codes
   */
  getAvailableCountries(): string[] {
    return Array.from(this.scripts.keys());
  }

  /**
   * Check if automation is available for a country
   */
  hasAutomation(countryCode: string): boolean {
    return this.scripts.has(countryCode);
  }

  /**
   * Get script version
   */
  getScriptVersion(countryCode: string): string | undefined {
    return this.loadedVersions.get(countryCode);
  }

  /**
   * Synchronous script lookup — returns from in-memory cache only.
   * Built-in scripts (JPN, MYS, SGP) are always available after construction.
   */
  getScriptSync(countryCode: string): AutomationScript | null {
    return this.scripts.get(countryCode) ?? null;
  }

  /**
   * Load built-in automation scripts
   */
  private loadBuiltinScripts(): void {
    // Japan - Visit Japan Web
    this.registerScript(this.createJapanScript());
    
    // Malaysia - MDAC
    this.registerScript(this.createMalaysiaScript());
    
    // Singapore - SG Arrival Card
    this.registerScript(this.createSingaporeScript());
  }

  /**
   * Load script dynamically (for future OTA updates)
   */
  private async loadScript(_countryCode: string): Promise<AutomationScript | null> {
    // In future versions, this would fetch scripts from a CDN
    // For now, return null for unsupported countries
    return null;
  }

  /**
   * Japan (JPN) - Visit Japan Web automation script
   */
  private createJapanScript(): AutomationScript {
    const fieldMappings: Record<string, PortalFieldMapping> = {
      surname: {
        fieldId: 'surname',
        selector: 'input[name="family_name"], input[id="family_name"]',
        inputType: 'text'
      },
      givenNames: {
        fieldId: 'givenNames',
        selector: 'input[name="given_name"], input[id="given_name"]',
        inputType: 'text'
      },
      passportNumber: {
        fieldId: 'passportNumber',
        selector: 'input[name="passport_no"], input[id="passport_no"]',
        inputType: 'text'
      },
      nationality: {
        fieldId: 'nationality',
        selector: 'select[name="nationality"], select[id="nationality"]',
        inputType: 'select',
        transform: {
          type: 'country_code',
          config: { format: 'iso3_to_name' }
        }
      },
      dateOfBirth: {
        fieldId: 'dateOfBirth',
        selector: 'input[name="birth_date"], input[id="birth_date"]',
        inputType: 'date',
        transform: {
          type: 'date_format',
          config: { from: 'YYYY-MM-DD', to: 'YYYY/MM/DD' }
        }
      },
      gender: {
        fieldId: 'gender',
        selector: 'select[name="sex"], select[id="sex"]',
        inputType: 'select'
      },
      arrivalDate: {
        fieldId: 'arrivalDate',
        selector: 'input[name="arrival_date"], input[id="arrival_date"]',
        inputType: 'date',
        transform: {
          type: 'date_format',
          config: { from: 'YYYY-MM-DD', to: 'YYYY/MM/DD' }
        }
      },
      flightNumber: {
        fieldId: 'flightNumber',
        selector: 'input[name="flight_no"], input[id="flight_no"]',
        inputType: 'text'
      },
      purposeOfVisit: {
        fieldId: 'purposeOfVisit',
        selector: 'select[name="purpose"], select[id="purpose"]',
        inputType: 'select'
      },
      hotelName: {
        fieldId: 'hotelName',
        selector: 'input[name="accommodation_name"], input[id="accommodation_name"]',
        inputType: 'text'
      },
      hotelAddress: {
        fieldId: 'hotelAddress',
        selector: 'textarea[name="accommodation_address"], textarea[id="accommodation_address"]',
        inputType: 'text'
      },
      carryingProhibitedItems: {
        fieldId: 'carryingProhibitedItems',
        selector: 'input[name="prohibited_items"][value="no"], input[name="prohibited_items"][value="false"]',
        inputType: 'radio',
        transform: {
          type: 'boolean_to_yesno',
          config: { falseValue: 'no', trueValue: 'yes' }
        }
      },
      currencyOver1M: {
        fieldId: 'currencyOver1M',
        selector: 'input[name="currency_over_limit"][value="no"], input[name="currency_over_limit"][value="false"]',
        inputType: 'radio',
        transform: {
          type: 'boolean_to_yesno',
          config: { falseValue: 'no', trueValue: 'yes' }
        }
      }
    };

    const steps: AutomationStep[] = [
      {
        id: 'load_portal',
        name: 'Load Visit Japan Web Portal',
        description: 'Navigate to Visit Japan Web and wait for page load',
        script: `
          // Wait for page to fully load
          return new Promise((resolve) => {
            if (document.readyState === 'complete') {
              resolve({ success: true, url: window.location.href });
            } else {
              window.addEventListener('load', () => {
                resolve({ success: true, url: window.location.href });
              });
            }
          });
        `,
        timing: {
          timeout: 15000,
          waitAfter: 2000
        },
        critical: true
      },
      {
        id: 'check_login_required',
        name: 'Check if Login Required',
        description: 'Determine if user needs to login first',
        script: `
          const loginButton = document.querySelector('a[href*="login"], button[id*="login"], input[value*="Login"]');
          const isLoggedIn = document.querySelector('.user-info, .logged-in, [data-user]') !== null;
          
          return {
            loginRequired: loginButton !== null && !isLoggedIn,
            loginUrl: loginButton ? loginButton.href || window.location.href : null,
            isLoggedIn: isLoggedIn
          };
        `,
        timing: {
          timeout: 5000,
          waitAfter: 1000
        },
        critical: true
      },
      {
        id: 'start_registration',
        name: 'Start Registration Process',
        description: 'Click on register/start button to begin form process',
        script: `
          // Look for registration or start buttons
          const startButtons = [
            'a[href*="register"], a[href*="entry"]',
            'button[id*="start"], button[id*="register"]',
            'input[value*="Start"], input[value*="Register"]',
            '.btn-start, .btn-register, .start-btn'
          ];
          
          for (const selector of startButtons) {
            const button = document.querySelector(selector);
            if (button && button.offsetParent !== null) {
              button.scrollIntoView();
              button.click();
              
              // Wait for navigation
              return new Promise((resolve) => {
                setTimeout(() => {
                  resolve({ success: true, buttonClicked: selector });
                }, 2000);
              });
            }
          }
          
          return { success: false, error: 'No start/register button found' };
        `,
        timing: {
          timeout: 10000,
          waitAfter: 3000
        },
        critical: false
      },
      {
        id: 'fill_personal_info',
        name: 'Fill Personal Information',
        description: 'Fill passport and personal details',
        script: `
          // This script will be dynamically generated with actual form data
          return { success: true, message: 'Personal information filling script placeholder' };
        `,
        timing: {
          timeout: 15000,
          waitAfter: 2000
        },
        critical: true
      },
      {
        id: 'fill_travel_info',
        name: 'Fill Travel Information',
        description: 'Fill flight and accommodation details',
        script: `
          // This script will be dynamically generated with actual form data
          return { success: true, message: 'Travel information filling script placeholder' };
        `,
        timing: {
          timeout: 10000,
          waitAfter: 2000
        },
        critical: true
      },
      {
        id: 'fill_customs_declaration',
        name: 'Fill Customs Declaration',
        description: 'Complete customs declaration questions',
        script: `
          // This script will be dynamically generated with actual form data
          return { success: true, message: 'Customs declaration filling script placeholder' };
        `,
        timing: {
          timeout: 10000,
          waitAfter: 2000
        },
        critical: true
      },
      {
        id: 'submit_form',
        name: 'Submit Form',
        description: 'Submit the completed form and wait for confirmation',
        script: `
          // Look for submit buttons
          const submitSelectors = [
            'input[type="submit"]',
            'button[type="submit"]',
            'button[id*="submit"]',
            'input[value*="Submit"]',
            '.btn-submit, .submit-btn'
          ];
          
          for (const selector of submitSelectors) {
            const button = document.querySelector(selector);
            if (button && button.offsetParent !== null && !button.disabled) {
              button.scrollIntoView();
              button.focus();
              button.click();
              
              // Wait for submission processing
              return new Promise((resolve) => {
                setTimeout(() => {
                  const url = window.location.href;
                  const hasConfirmation = document.querySelector('.confirmation, .success, [id*="confirm"]') !== null;
                  resolve({ 
                    success: true, 
                    submitted: true, 
                    url: url,
                    hasConfirmation: hasConfirmation
                  });
                }, 5000);
              });
            }
          }
          
          return { success: false, error: 'No submit button found or enabled' };
        `,
        timing: {
          timeout: 20000,
          waitAfter: 5000
        },
        critical: true
      },
      {
        id: 'detect_captcha',
        name: 'Detect CAPTCHA',
        description: 'Check for CAPTCHA challenges that require manual intervention',
        script: `
          // Check for various CAPTCHA types
          const captchaIndicators = [
            '.g-recaptcha', '#g-recaptcha', 'iframe[src*="recaptcha"]', // Google reCAPTCHA
            '.h-captcha', 'iframe[src*="hcaptcha"]', // hCaptcha
            'img[src*="captcha"]', 'img[alt*="captcha"]', '.captcha img', // Image CAPTCHA
            'input[name*="captcha"]', 'input[placeholder*="captcha"]' // Text CAPTCHA
          ];
          
          let captchaFound = false;
          let captchaType = 'none';
          let captchaSelector = '';
          
          for (const selector of captchaIndicators) {
            const element = document.querySelector(selector);
            if (element && element.offsetParent !== null) {
              captchaFound = true;
              captchaSelector = selector;
              
              if (selector.includes('recaptcha')) {
                captchaType = 'recaptcha';
              } else if (selector.includes('hcaptcha')) {
                captchaType = 'hcaptcha';
              } else if (selector.includes('img')) {
                captchaType = 'image';
              } else if (selector.includes('input')) {
                captchaType = 'text';
              }
              break;
            }
          }
          
          return {
            success: true,
            captchaFound: captchaFound,
            captchaType: captchaType,
            captchaSelector: captchaSelector,
            requiresManualIntervention: captchaFound
          };
        `,
        timing: {
          timeout: 5000,
          waitAfter: 1000
        },
        critical: false
      },
      {
        id: 'handle_errors',
        name: 'Handle Form Errors',
        description: 'Detect and handle form validation errors',
        script: `
          // Look for error messages
          const errorSelectors = [
            '.error', '.error-message', '.field-error',
            '.invalid', '.validation-error', '.form-error',
            '[aria-invalid="true"]', '.has-error',
            '.alert-danger', '.alert-error'
          ];
          
          const errors = [];
          let hasBlockingErrors = false;
          
          for (const selector of errorSelectors) {
            const errorElements = document.querySelectorAll(selector);
            errorElements.forEach(el => {
              if (el.offsetParent !== null && el.textContent.trim()) {
                const errorText = el.textContent.trim();
                errors.push({
                  selector: selector,
                  text: errorText,
                  element: el.tagName
                });
                
                // Check if this is a blocking error
                const blockingKeywords = ['required', 'invalid', 'error', 'failed', 'missing'];
                if (blockingKeywords.some(keyword => errorText.toLowerCase().includes(keyword))) {
                  hasBlockingErrors = true;
                }
              }
            });
          }
          
          // Check for disabled submit buttons (another error indicator)
          const submitButtons = document.querySelectorAll('input[type="submit"], button[type="submit"]');
          let submitDisabled = false;
          submitButtons.forEach(btn => {
            if (btn.disabled) {
              submitDisabled = true;
            }
          });
          
          return {
            success: true,
            errorsFound: errors.length > 0,
            errors: errors,
            hasBlockingErrors: hasBlockingErrors || submitDisabled,
            submitDisabled: submitDisabled
          };
        `,
        timing: {
          timeout: 5000,
          waitAfter: 500
        },
        critical: false
      },
      {
        id: 'capture_confirmation',
        name: 'Capture Confirmation',
        description: 'Extract confirmation number and QR code',
        script: `
          // Look for confirmation elements
          const confirmationSelectors = [
            '[id*="confirmation"] img, [class*="confirmation"] img',
            '[id*="qr"] img, [class*="qr"] img',
            '.qr-code img, .confirmation-qr img'
          ];
          
          let qrCodeSrc = null;
          for (const selector of confirmationSelectors) {
            const img = document.querySelector(selector);
            if (img && img.src) {
              qrCodeSrc = img.src;
              break;
            }
          }
          
          // Look for confirmation number
          const confirmationNumber = (
            document.querySelector('[id*="confirmation"][id*="number"]')?.textContent ||
            document.querySelector('[class*="confirmation"][class*="number"]')?.textContent ||
            ''
          ).trim();
          
          return {
            success: qrCodeSrc !== null || confirmationNumber !== '',
            qrCodeUrl: qrCodeSrc,
            confirmationNumber: confirmationNumber,
            pageUrl: window.location.href
          };
        `,
        timing: {
          timeout: 10000,
          waitAfter: 0
        },
        critical: false
      }
    ];

    return {
      countryCode: 'JPN',
      portalUrl: 'https://vjw-lp.digital.go.jp/en/',
      version: '1.0.0',
      lastUpdated: '2026-03-07T00:00:00Z',
      prerequisites: {
        cookiesEnabled: true,
        javascriptEnabled: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      },
      steps,
      fieldMappings,
      session: {
        maxDurationMs: 20 * 60 * 1000, // 20 minutes
        keepAlive: true,
        clearCookiesOnStart: false
      }
    };
  }

  /**
   * Malaysia (MYS) - MDAC automation script (simplified)
   */
  private createMalaysiaScript(): AutomationScript {
    return {
      countryCode: 'MYS',
      portalUrl: 'https://mdac.gov.my/',
      version: '1.0.0',
      lastUpdated: '2026-03-07T00:00:00Z',
      prerequisites: {
        cookiesEnabled: true,
        javascriptEnabled: true
      },
      steps: [
        {
          id: 'load_portal',
          name: 'Load MDAC Portal',
          description: 'Navigate to Malaysia Digital Arrival Card portal',
          script: 'return { success: true, message: "Portal loaded" };',
          timing: { timeout: 15000, waitAfter: 2000 },
          critical: true
        }
      ],
      fieldMappings: {},
      session: {
        maxDurationMs: 15 * 60 * 1000,
        keepAlive: true,
        clearCookiesOnStart: false
      }
    };
  }

  /**
   * Singapore (SGP) - SG Arrival Card automation script (simplified)
   */
  private createSingaporeScript(): AutomationScript {
    return {
      countryCode: 'SGP',
      portalUrl: 'https://eservices.ica.gov.sg/',
      version: '1.0.0',
      lastUpdated: '2026-03-07T00:00:00Z',
      prerequisites: {
        cookiesEnabled: true,
        javascriptEnabled: true
      },
      steps: [
        {
          id: 'load_portal',
          name: 'Load SG Arrival Card Portal',
          description: 'Navigate to Singapore ICA portal',
          script: 'return { success: true, message: "Portal loaded" };',
          timing: { timeout: 15000, waitAfter: 2000 },
          critical: true
        }
      ],
      fieldMappings: {},
      session: {
        maxDurationMs: 15 * 60 * 1000,
        keepAlive: true,
        clearCookiesOnStart: false
      }
    };
  }
}

/**
 * Utility functions for automation scripts
 */
export class AutomationScriptUtils {
  /**
   * Apply value transformation based on mapping configuration
   */
  static applyTransform(value: any, transform: PortalFieldMapping['transform']): any {
    if (!transform) return value;

    switch (transform.type) {
      case 'date_format':
        return this.transformDate(value, transform.config);
      
      case 'country_code':
        return this.transformCountryCode(value, transform.config);
      
      case 'boolean_to_yesno':
        return this.transformBooleanToYesNo(value, transform.config);
      
      case 'custom':
        return this.transformCustom(value, transform.config);
      
      default:
        return value;
    }
  }

  private static transformDate(value: string, config: any): string {
    if (!config || !config.from || !config.to) return value;
    
    try {
      // Simple date format transformation
      // In production, would use a proper date library
      if (config.from === 'YYYY-MM-DD' && config.to === 'YYYY/MM/DD') {
        return value.replace(/-/g, '/');
      }
      return value;
    } catch {
      return value;
    }
  }

  private static transformCountryCode(value: string, config: any): string {
    // Map ISO3 country codes to full country names
    const countryMap: Record<string, string> = {
      'USA': 'United States',
      'GBR': 'United Kingdom', 
      'DEU': 'Germany',
      'FRA': 'France',
      'JPN': 'Japan',
      'KOR': 'South Korea',
      'CHN': 'China',
      'IND': 'India',
      'AUS': 'Australia',
      'CAN': 'Canada'
    };
    
    if (config?.format === 'iso3_to_name') {
      return countryMap[value] || value;
    }
    
    return value;
  }

  private static transformBooleanToYesNo(value: boolean, config: any): string {
    const falseValue = config?.falseValue || 'no';
    const trueValue = config?.trueValue || 'yes';
    
    return value ? trueValue : falseValue;
  }

  private static transformCustom(value: any, _config: any): any {
    // Custom transformation logic would go here
    return value;
  }

  /**
   * Validate automation script structure
   */
  static validateScript(script: AutomationScript): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!script.countryCode) errors.push('Missing countryCode');
    if (!script.portalUrl) errors.push('Missing portalUrl');
    if (!script.version) errors.push('Missing version');
    if (!script.steps || script.steps.length === 0) errors.push('Missing or empty steps');

    // Validate steps
    script.steps?.forEach((step, index) => {
      if (!step.id) errors.push(`Step ${index}: Missing id`);
      if (!step.name) errors.push(`Step ${index}: Missing name`);
      if (!step.script) errors.push(`Step ${index}: Missing script`);
      if (!step.timing?.timeout) errors.push(`Step ${index}: Missing timeout`);
    });

    // Validate prerequisites
    if (script.prerequisites?.cookiesEnabled === undefined) {
      errors.push('Missing cookiesEnabled prerequisite');
    }
    if (script.prerequisites?.javascriptEnabled === undefined) {
      errors.push('Missing javascriptEnabled prerequisite');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get script statistics
   */
  static getScriptStats(script: AutomationScript) {
    return {
      stepCount: script.steps.length,
      criticalSteps: script.steps.filter(s => s.critical).length,
      estimatedDuration: script.steps.reduce((total, step) =>
        total + step.timing.timeout + (step.timing.waitAfter || 0), 0
      ),
      fieldMappingCount: Object.keys(script.fieldMappings).length
    };
  }
}

/**
 * Shared singleton registry — all app code should import and use this instance
 * rather than constructing their own, to avoid duplicating the built-in scripts.
 */
export const automationScriptRegistry = new AutomationScriptRegistry();