/**
 * UK Electronic Travel Authorisation (ETA) Automation Script
 * 
 * Automates form filling for UK ETA application (https://www.gov.uk/apply-electronic-travel-authorisation)
 * This script handles the multi-step ETA application process for eligible countries.
 */

(function() {
  'use strict';

  // Ensure common automation utilities are loaded
  if (!window.BorderlyAutomation || !window.BorderlyAutomation._loaded) {
    console.error('Borderly common automation utilities not loaded');
    return;
  }

  // UK ETA specific automation
  window.BorderlyAutomation.UnitedKingdom = {
    
    /**
     * Main automation orchestrator
     */
    automate: function(formData, options = {}) {
      return new Promise(async function(resolve, reject) {
        try {
          const debug = options.debug || false;
          const testMode = options.testMode || false;
          
          if (debug) {
            window.BorderlyAutomation.Debug.logStep('UK ETA automation started', true, {
              url: window.location.href,
              testMode: testMode
            });
          }

          // Wait for page to be ready
          await window.BorderlyAutomation.Page.waitForReady();
          
          // Detect current step and proceed accordingly
          const currentStep = await this.detectCurrentStep();
          
          if (debug) {
            window.BorderlyAutomation.Debug.logStep('Current step detected', true, {
              step: currentStep
            });
          }

          const result = await this.handleStep(currentStep, formData, options);
          
          resolve({
            success: result,
            step: currentStep,
            nextAction: result ? 'proceed' : 'manual_intervention_required'
          });
          
        } catch (error) {
          const context = window.BorderlyAutomation.Error.captureContext(error);
          reject(context);
        }
      }.bind(this));
    },

    /**
     * Detect current step in the UK ETA process
     */
    detectCurrentStep: function() {
      return new Promise(function(resolve) {
        const url = window.location.href.toLowerCase();
        
        if (url.includes('eligibility') || document.querySelector('.eligibility-check')) {
          resolve('eligibility_check');
        } else if (url.includes('account') || document.querySelector('#create-account')) {
          resolve('account_creation');
        } else if (url.includes('login') || document.querySelector('#sign-in')) {
          resolve('login');
        } else if (document.querySelector('#passport-number')) {
          resolve('passport_info');
        } else if (document.querySelector('#travel-date')) {
          resolve('travel_info');
        } else if (document.querySelector('#email-address')) {
          resolve('contact_info');
        } else if (document.querySelector('#security-questions')) {
          resolve('security_questions');
        } else if (document.querySelector('#criminal-convictions')) {
          resolve('background_questions');
        } else if (url.includes('payment') || document.querySelector('.payment-form')) {
          resolve('payment');
        } else if (url.includes('confirmation') || document.querySelector('.application-complete')) {
          resolve('confirmation');
        } else {
          resolve('unknown');
        }
      });
    },

    /**
     * Handle specific step in the process
     */
    handleStep: function(step, formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          let result = false;
          
          switch (step) {
            case 'eligibility_check':
              result = await this.handleEligibilityCheck(formData, options);
              break;
            case 'account_creation':
              result = await this.handleAccountCreation(formData, options);
              break;
            case 'login':
              result = await this.handleLogin(formData, options);
              break;
            case 'passport_info':
              result = await this.fillPassportInfo(formData, options);
              break;
            case 'travel_info':
              result = await this.fillTravelInfo(formData, options);
              break;
            case 'contact_info':
              result = await this.fillContactInfo(formData, options);
              break;
            case 'security_questions':
              result = await this.handleSecurityQuestions(formData, options);
              break;
            case 'background_questions':
              result = await this.handleBackgroundQuestions(formData, options);
              break;
            case 'payment':
              result = await this.handlePayment(formData, options);
              break;
            case 'confirmation':
              result = await this.handleConfirmation(formData, options);
              break;
            default:
              console.warn('Unknown UK ETA step:', step);
              result = false;
          }
          
          resolve(result);
        } catch (error) {
          console.error('Error handling UK ETA step:', error);
          resolve(false);
        }
      }.bind(this));
    },

    /**
     * Handle eligibility check
     */
    handleEligibilityCheck: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const nationalitySelect = document.querySelector('#nationality, .nationality-select');
          const nationality = this.getNestedValue(formData, 'nationality');
          
          if (nationalitySelect && nationality) {
            const success = await window.BorderlyAutomation.Form.fillField(nationalitySelect, nationality);
            
            if (success && options.debug) {
              window.BorderlyAutomation.Debug.highlightElement(nationalitySelect);
            }
            
            // Look for check eligibility button
            const checkBtn = document.querySelector('.check-eligibility, #check-eligibility-btn');
            if (checkBtn && !options.testMode) {
              await window.BorderlyAutomation.Click.smartClick(checkBtn);
              await window.BorderlyAutomation.Page.waitForNavigation();
            }
            
            resolve(success);
          } else {
            resolve(false);
          }
        } catch (error) {
          resolve(false);
        }
      }.bind(this));
    },

    /**
     * Handle account creation
     */
    handleAccountCreation: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          // Account creation requires email verification, which should be manual
          const createAccountSection = document.querySelector('#create-account, .account-creation');
          
          if (createAccountSection) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('Account creation page detected', true, {
                message: 'Manual account creation and email verification required'
              });
            }
            resolve(false); // Manual intervention required
          } else {
            resolve(true); // Account already exists or not needed
          }
        } catch (error) {
          resolve(false);
        }
      });
    },

    /**
     * Handle login process
     */
    handleLogin: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          // Login requires credentials which should not be automated for security
          const loginForm = document.querySelector('#sign-in, .login-form');
          
          if (loginForm) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('Login form detected', true, {
                message: 'Manual login required'
              });
            }
            resolve(false); // Manual intervention required
          } else {
            resolve(true); // Already logged in
          }
        } catch (error) {
          resolve(false);
        }
      });
    },

    /**
     * Fill passport information section
     */
    fillPassportInfo: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const fields = [
            { selector: '#passport-number', key: 'passportNumber', type: 'input' },
            { selector: '#passport-expiry', key: 'passportExpiry', type: 'input' },
            { selector: '#passport-issue-date', key: 'passportIssued', type: 'input' },
            { selector: '#passport-country', key: 'passportCountry', type: 'select' },
            { selector: '#first-name', key: 'givenNames', type: 'input' },
            { selector: '#last-name', key: 'surname', type: 'input' },
            { selector: '#date-of-birth', key: 'dateOfBirth', type: 'input' },
            { selector: '#nationality', key: 'nationality', type: 'select' },
            { selector: '#gender', key: 'gender', type: 'select' }
          ];

          let successCount = 0;
          
          for (const field of fields) {
            const value = this.getNestedValue(formData, field.key);
            if (value) {
              const element = document.querySelector(field.selector);
              if (element) {
                const success = await window.BorderlyAutomation.Form.fillField(element, value);
                if (success) {
                  successCount++;
                  if (options.debug) {
                    window.BorderlyAutomation.Debug.highlightElement(element, 1000);
                  }
                }
              }
            }
          }
          
          // Look for continue button
          const continueBtn = document.querySelector('.continue, #continue-btn, [type="submit"]');
          if (continueBtn && successCount > 0 && !options.testMode) {
            await window.BorderlyAutomation.Click.smartClick(continueBtn);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          resolve(successCount > 0);
        } catch (error) {
          resolve(false);
        }
      }.bind(this));
    },

    /**
     * Fill travel information section
     */
    fillTravelInfo: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const fields = [
            { selector: '#travel-date', key: 'arrivalDate', type: 'input' },
            { selector: '#purpose-of-visit', key: 'purposeOfVisit', type: 'select' },
            { selector: '#length-of-stay', key: 'lengthOfStay', type: 'input' },
            { selector: '#arriving-from', key: 'departureCountry', type: 'select' },
            { selector: '#uk-address', key: 'ukAddress', type: 'textarea' }
          ];

          let successCount = 0;
          
          for (const field of fields) {
            const value = this.getNestedValue(formData, field.key);
            if (value) {
              const element = document.querySelector(field.selector);
              if (element) {
                const success = await window.BorderlyAutomation.Form.fillField(element, value);
                if (success) {
                  successCount++;
                  if (options.debug) {
                    window.BorderlyAutomation.Debug.highlightElement(element, 1000);
                  }
                }
              }
            }
          }
          
          const continueBtn = document.querySelector('.continue, #continue-btn, [type="submit"]');
          if (continueBtn && successCount > 0 && !options.testMode) {
            await window.BorderlyAutomation.Click.smartClick(continueBtn);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          resolve(successCount > 0);
        } catch (error) {
          resolve(false);
        }
      }.bind(this));
    },

    /**
     * Fill contact information section
     */
    fillContactInfo: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const fields = [
            { selector: '#email-address', key: 'email', type: 'input' },
            { selector: '#phone-number', key: 'phone', type: 'input' },
            { selector: '#home-address', key: 'homeAddress', type: 'textarea' },
            { selector: '#emergency-contact-name', key: 'emergencyContactName', type: 'input' },
            { selector: '#emergency-contact-phone', key: 'emergencyContactPhone', type: 'input' }
          ];

          let successCount = 0;
          
          for (const field of fields) {
            const value = this.getNestedValue(formData, field.key);
            if (value) {
              const element = document.querySelector(field.selector);
              if (element) {
                const success = await window.BorderlyAutomation.Form.fillField(element, value);
                if (success) {
                  successCount++;
                  if (options.debug) {
                    window.BorderlyAutomation.Debug.highlightElement(element, 1000);
                  }
                }
              }
            }
          }
          
          const continueBtn = document.querySelector('.continue, #continue-btn, [type="submit"]');
          if (continueBtn && successCount > 0 && !options.testMode) {
            await window.BorderlyAutomation.Click.smartClick(continueBtn);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          resolve(successCount > 0);
        } catch (error) {
          resolve(false);
        }
      }.bind(this));
    },

    /**
     * Handle security questions section
     */
    handleSecurityQuestions: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          // Security questions require user input that should not be automated
          const securitySection = document.querySelector('#security-questions, .security-questions');
          
          if (securitySection) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('Security questions page detected', true, {
                message: 'Manual security questions required'
              });
            }
            resolve(false); // Manual intervention required
          } else {
            resolve(true); // No security questions or already completed
          }
        } catch (error) {
          resolve(false);
        }
      });
    },

    /**
     * Handle background questions section
     */
    handleBackgroundQuestions: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          // Background checks involve sensitive questions that may require manual input
          const backgroundFields = [
            { selector: '#criminal-convictions', key: 'hasCriminalRecord', type: 'radio' },
            { selector: '#immigration-violations', key: 'hasImmigrationViolations', type: 'radio' },
            { selector: '#terrorism-associations', key: 'hasTerrorismAssociations', type: 'radio' },
            { selector: '#drug-offenses', key: 'hasDrugOffenses', type: 'radio' }
          ];

          let successCount = 0;
          
          for (const field of backgroundFields) {
            // Default to 'No' for all background questions unless explicitly specified
            const value = this.getNestedValue(formData, field.key) || 'no';
            
            const element = document.querySelector(field.selector);
            if (element) {
              // For radio buttons, find the 'No' option
              const noOption = document.querySelector(`${field.selector} input[value="no"], ${field.selector}-no`);
              if (noOption) {
                const success = await window.BorderlyAutomation.Form.fillField(noOption, true);
                if (success) {
                  successCount++;
                  if (options.debug) {
                    window.BorderlyAutomation.Debug.highlightElement(noOption, 1000);
                  }
                }
              }
            }
          }
          
          const continueBtn = document.querySelector('.continue, #continue-btn, [type="submit"]');
          if (continueBtn && successCount > 0 && !options.testMode) {
            await window.BorderlyAutomation.Click.smartClick(continueBtn);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          resolve(successCount > 0);
        } catch (error) {
          resolve(false);
        }
      }.bind(this));
    },

    /**
     * Handle payment section
     */
    handlePayment: function(formData, options = {}) {
      return new Promise(function(resolve) {
        try {
          // Payment requires credit card details which should not be automated for security
          const paymentForm = document.querySelector('.payment-form, #payment-section');
          
          if (paymentForm) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('Payment page detected', true, {
                message: 'Manual payment required (£10 application fee)'
              });
            }
            resolve(false); // Manual intervention required
          } else {
            resolve(true); // No payment needed or already completed
          }
        } catch (error) {
          resolve(false);
        }
      });
    },

    /**
     * Handle confirmation page
     */
    handleConfirmation: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          // Look for ETA confirmation or reference number
          const etaNumber = document.querySelector('.eta-number, #eta-reference, .confirmation-number');
          const downloadLink = document.querySelector('.download-eta, #eta-download');
          
          if (etaNumber || downloadLink) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('UK ETA confirmation detected', true, {
                hasEtaNumber: !!etaNumber,
                hasDownloadLink: !!downloadLink
              });
            }
            
            // Extract ETA data
            const result = {};
            if (etaNumber) {
              result.etaNumber = etaNumber.textContent.trim();
            }
            
            if (downloadLink) {
              result.etaDownloadUrl = downloadLink.href;
            }
            
            // Notify React Native app about the successful completion
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'uk_eta_success',
                data: result
              }));
            }
            
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (error) {
          resolve(false);
        }
      });
    },

    /**
     * Utility to get nested value from form data
     */
    getNestedValue: function(obj, path) {
      return path.split('.').reduce((current, key) => current && current[key], obj);
    },

    /**
     * Check if automation is supported on current page
     */
    isSupported: function() {
      const url = window.location.href.toLowerCase();
      return url.includes('gov.uk') && (url.includes('eta') || url.includes('electronic-travel'));
    }
  };

  // Register UK automation
  window.BorderlyAutomation.registerCountry = window.BorderlyAutomation.registerCountry || function(countryCode, automation) {
    window.BorderlyAutomation.countries = window.BorderlyAutomation.countries || {};
    window.BorderlyAutomation.countries[countryCode] = automation;
  };

  window.BorderlyAutomation.registerCountry('GBR', window.BorderlyAutomation.UnitedKingdom);

  if (window.BorderlyAutomation.UnitedKingdom.isSupported()) {
    console.log('UK ETA automation script loaded and ready');
  }

})();