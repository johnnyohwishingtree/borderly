/**
 * USA ESTA Automation Script
 * 
 * Automates form filling for ESTA application (https://esta.cbp.dhs.gov/)
 * This script handles the complex multi-step ESTA application process.
 */

(function() {
  'use strict';

  // Ensure common automation utilities are loaded
  if (!window.BorderlyAutomation || !window.BorderlyAutomation._loaded) {
    console.error('Borderly common automation utilities not loaded');
    return;
  }

  // USA ESTA specific automation
  window.BorderlyAutomation.UnitedStates = {
    
    /**
     * Main automation orchestrator
     */
    automate: function(formData, options = {}) {
      return new Promise(async function(resolve, reject) {
        try {
          const debug = options.debug || false;
          const testMode = options.testMode || false;
          const maxRetries = options.maxRetries || 3;
          const retryDelay = options.retryDelay || 2000;
          
          if (debug) {
            window.BorderlyAutomation.Debug.logStep('USA ESTA automation started', true, {
              url: window.location.href,
              testMode: testMode,
              maxRetries: maxRetries
            });
          }

          // Validate form data before starting
          const validationResult = this.validateFormData(formData);
          if (!validationResult.valid) {
            reject({
              error: 'Invalid form data',
              details: validationResult.errors,
              step: 'validation'
            });
            return;
          }

          // Wait for page to be ready with retry logic
          let pageReady = false;
          for (let i = 0; i < maxRetries && !pageReady; i++) {
            try {
              await window.BorderlyAutomation.Page.waitForReady();
              pageReady = true;
            } catch (error) {
              if (i === maxRetries - 1) throw error;
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }
          
          // Detect current step and proceed accordingly
          const currentStep = await this.detectCurrentStep();
          
          if (debug) {
            window.BorderlyAutomation.Debug.logStep('Current step detected', true, {
              step: currentStep
            });
          }

          // Handle step with retry logic
          let result = false;
          let lastError = null;
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              result = await this.handleStep(currentStep, formData, options);
              if (result) {
                break; // Success, exit loop
              }
              if (debug) {
                window.BorderlyAutomation.Debug.logStep('Step failed, retrying', false, {
                  step: currentStep,
                  attempt: attempt,
                  willRetry: attempt < maxRetries
                });
              }
            } catch (error) {
              lastError = error;
              if (debug) {
                window.BorderlyAutomation.Debug.logStep('Step error, retrying', false, {
                  step: currentStep,
                  attempt: attempt,
                  error: error.message,
                  willRetry: attempt < maxRetries
                });
              }
            }

            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }

          if (!result && lastError) {
            throw lastError;
          }
          
          resolve({
            success: result,
            step: currentStep,
            nextAction: result ? 'proceed' : 'manual_intervention_required',
            metadata: {
              url: window.location.href,
              timestamp: new Date().toISOString()
            }
          });
          
        } catch (error) {
          const context = window.BorderlyAutomation.Error.captureContext(error, {
            step: 'automation',
            formDataPresent: !!formData
          });
          reject(context);
        }
      }.bind(this));
    },

    /**
     * Detect current step in the ESTA process
     */
    detectCurrentStep: function() {
      return new Promise(function(resolve) {
        const url = window.location.href.toLowerCase();
        
        if (url.includes('disclaimer') || document.querySelector('.disclaimer-page')) {
          resolve('disclaimer');
        } else if (url.includes('application-type') || document.querySelector('#application-type')) {
          resolve('application_type');
        } else if (document.querySelector('#surname, #family-name')) {
          resolve('personal_info');
        } else if (document.querySelector('#passport-number')) {
          resolve('passport_info');
        } else if (document.querySelector('#birth-city')) {
          resolve('birth_info');
        } else if (document.querySelector('#home-address')) {
          resolve('address_info');
        } else if (document.querySelector('#parent-name')) {
          resolve('parent_info');
        } else if (document.querySelector('#employer-name')) {
          resolve('employment_info');
        } else if (document.querySelector('#arrival-date')) {
          resolve('travel_info');
        } else if (document.querySelector('#contact-person')) {
          resolve('contact_info');
        } else if (document.querySelector('#communicable-disease')) {
          resolve('eligibility_questions');
        } else if (url.includes('review') || document.querySelector('.application-review')) {
          resolve('review');
        } else if (url.includes('payment') || document.querySelector('.payment-section')) {
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
            case 'disclaimer':
              result = await this.handleDisclaimer(formData, options);
              break;
            case 'application_type':
              result = await this.handleApplicationType(formData, options);
              break;
            case 'personal_info':
              result = await this.fillPersonalInfo(formData, options);
              break;
            case 'passport_info':
              result = await this.fillPassportInfo(formData, options);
              break;
            case 'birth_info':
              result = await this.fillBirthInfo(formData, options);
              break;
            case 'address_info':
              result = await this.fillAddressInfo(formData, options);
              break;
            case 'parent_info':
              result = await this.fillParentInfo(formData, options);
              break;
            case 'employment_info':
              result = await this.fillEmploymentInfo(formData, options);
              break;
            case 'travel_info':
              result = await this.fillTravelInfo(formData, options);
              break;
            case 'contact_info':
              result = await this.fillContactInfo(formData, options);
              break;
            case 'eligibility_questions':
              result = await this.handleEligibilityQuestions(formData, options);
              break;
            case 'review':
              result = await this.handleReview(formData, options);
              break;
            case 'payment':
              result = await this.handlePayment(formData, options);
              break;
            case 'confirmation':
              result = await this.handleConfirmation(formData, options);
              break;
            default:
              console.warn('Unknown ESTA step:', step);
              result = false;
          }
          
          resolve(result);
        } catch (error) {
          console.error('Error handling ESTA step:', error);
          resolve(false);
        }
      }.bind(this));
    },

    /**
     * Handle disclaimer page
     */
    handleDisclaimer: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const agreeCheckbox = document.querySelector('#agree-disclaimer, .disclaimer-agreement input[type="checkbox"]');
          const continueBtn = document.querySelector('.continue, #continue-btn, [type="submit"]');
          
          if (agreeCheckbox && continueBtn) {
            await window.BorderlyAutomation.Form.fillField(agreeCheckbox, true);
            
            if (options.debug) {
              window.BorderlyAutomation.Debug.highlightElement(agreeCheckbox);
            }
            
            if (!options.testMode) {
              await window.BorderlyAutomation.Click.smartClick(continueBtn);
              await window.BorderlyAutomation.Page.waitForNavigation();
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
     * Handle application type selection
     */
    handleApplicationType: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          // Typically "Individual Application" for single travelers
          const individualOption = document.querySelector('#individual-application, input[value="individual"]');
          const continueBtn = document.querySelector('.continue, #continue-btn, [type="submit"]');
          
          if (individualOption && continueBtn) {
            await window.BorderlyAutomation.Form.fillField(individualOption, true);
            
            if (options.debug) {
              window.BorderlyAutomation.Debug.highlightElement(individualOption);
            }
            
            if (!options.testMode) {
              await window.BorderlyAutomation.Click.smartClick(continueBtn);
              await new Promise(resolve => setTimeout(resolve, 2000));
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
     * Fill personal information section
     */
    fillPersonalInfo: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const fields = [
            { selector: '#surname, #family-name', key: 'surname', type: 'input' },
            { selector: '#first-name, #given-name', key: 'givenNames', type: 'input' },
            { selector: '#middle-name', key: 'middleNames', type: 'input' },
            { selector: '#date-of-birth', key: 'dateOfBirth', type: 'input' },
            { selector: '#gender', key: 'gender', type: 'select' },
            { selector: '#city-of-birth', key: 'birthCity', type: 'input' },
            { selector: '#country-of-birth', key: 'birthCountry', type: 'select' }
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
          
          const nextBtn = document.querySelector('.next, #next-btn, [type="submit"]');
          if (nextBtn && successCount > 0 && !options.testMode) {
            await window.BorderlyAutomation.Click.smartClick(nextBtn);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          resolve(successCount > 0);
        } catch (error) {
          resolve(false);
        }
      }.bind(this));
    },

    /**
     * Fill passport information section
     */
    fillPassportInfo: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const fields = [
            { selector: '#passport-number', key: 'passportNumber', type: 'input' },
            { selector: '#passport-country', key: 'passportCountry', type: 'select' },
            { selector: '#passport-issue-date', key: 'passportIssued', type: 'input' },
            { selector: '#passport-expiry-date', key: 'passportExpiry', type: 'input' },
            { selector: '#national-id', key: 'nationalId', type: 'input' },
            { selector: '#other-citizenship', key: 'otherCitizenship', type: 'select' }
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
          
          const nextBtn = document.querySelector('.next, #next-btn, [type="submit"]');
          if (nextBtn && successCount > 0 && !options.testMode) {
            await window.BorderlyAutomation.Click.smartClick(nextBtn);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          resolve(successCount > 0);
        } catch (error) {
          resolve(false);
        }
      }.bind(this));
    },

    /**
     * Fill birth information section
     */
    fillBirthInfo: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const fields = [
            { selector: '#birth-city', key: 'birthCity', type: 'input' },
            { selector: '#birth-state', key: 'birthState', type: 'input' },
            { selector: '#birth-country', key: 'birthCountry', type: 'select' }
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
          
          const nextBtn = document.querySelector('.next, #next-btn, [type="submit"]');
          if (nextBtn && successCount > 0 && !options.testMode) {
            await window.BorderlyAutomation.Click.smartClick(nextBtn);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          resolve(successCount > 0);
        } catch (error) {
          resolve(false);
        }
      }.bind(this));
    },

    /**
     * Fill address information section
     */
    fillAddressInfo: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const fields = [
            { selector: '#home-address', key: 'homeAddress', type: 'input' },
            { selector: '#home-city', key: 'homeCity', type: 'input' },
            { selector: '#home-state', key: 'homeState', type: 'input' },
            { selector: '#home-postal-code', key: 'homePostalCode', type: 'input' },
            { selector: '#home-country', key: 'homeCountry', type: 'select' },
            { selector: '#phone-number', key: 'phone', type: 'input' },
            { selector: '#email-address', key: 'email', type: 'input' }
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
          
          const nextBtn = document.querySelector('.next, #next-btn, [type="submit"]');
          if (nextBtn && successCount > 0 && !options.testMode) {
            await window.BorderlyAutomation.Click.smartClick(nextBtn);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          resolve(successCount > 0);
        } catch (error) {
          resolve(false);
        }
      }.bind(this));
    },

    /**
     * Fill parent information section
     */
    fillParentInfo: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const fields = [
            { selector: '#father-name', key: 'fatherName', type: 'input' },
            { selector: '#mother-name', key: 'motherName', type: 'input' }
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
          
          const nextBtn = document.querySelector('.next, #next-btn, [type="submit"]');
          if (nextBtn && successCount > 0 && !options.testMode) {
            await window.BorderlyAutomation.Click.smartClick(nextBtn);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          resolve(successCount > 0);
        } catch (error) {
          resolve(false);
        }
      }.bind(this));
    },

    /**
     * Fill employment information section
     */
    fillEmploymentInfo: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const fields = [
            { selector: '#employer-name', key: 'employerName', type: 'input' },
            { selector: '#employer-address', key: 'employerAddress', type: 'input' },
            { selector: '#employer-city', key: 'employerCity', type: 'input' },
            { selector: '#employer-state', key: 'employerState', type: 'input' },
            { selector: '#employer-country', key: 'employerCountry', type: 'select' },
            { selector: '#job-title', key: 'jobTitle', type: 'input' }
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
          
          const nextBtn = document.querySelector('.next, #next-btn, [type="submit"]');
          if (nextBtn && successCount > 0 && !options.testMode) {
            await window.BorderlyAutomation.Click.smartClick(nextBtn);
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
            { selector: '#arrival-date', key: 'arrivalDate', type: 'input' },
            { selector: '#flight-number', key: 'flightNumber', type: 'input' },
            { selector: '#arrival-city', key: 'arrivalCity', type: 'select' },
            { selector: '#us-address', key: 'usAddress', type: 'textarea' },
            { selector: '#purpose-of-visit', key: 'purposeOfVisit', type: 'select' }
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
          
          const nextBtn = document.querySelector('.next, #next-btn, [type="submit"]');
          if (nextBtn && successCount > 0 && !options.testMode) {
            await window.BorderlyAutomation.Click.smartClick(nextBtn);
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
            { selector: '#contact-person', key: 'contactPersonName', type: 'input' },
            { selector: '#contact-relationship', key: 'contactRelationship', type: 'select' },
            { selector: '#contact-phone', key: 'contactPhone', type: 'input' },
            { selector: '#contact-email', key: 'contactEmail', type: 'input' }
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
          
          const nextBtn = document.querySelector('.next, #next-btn, [type="submit"]');
          if (nextBtn && successCount > 0 && !options.testMode) {
            await window.BorderlyAutomation.Click.smartClick(nextBtn);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          resolve(successCount > 0);
        } catch (error) {
          resolve(false);
        }
      }.bind(this));
    },

    /**
     * Handle eligibility questions section
     */
    handleEligibilityQuestions: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          // ESTA has many Yes/No eligibility questions - default to 'No' unless specified
          const eligibilityQuestions = [
            '#communicable-disease',
            '#physical-mental-disorder',
            '#drug-arrest',
            '#criminal-activity',
            '#terrorist-activity',
            '#fraud-misrepresentation',
            '#visa-denial',
            '#visa-revocation',
            '#deportation'
          ];

          let successCount = 0;
          
          for (const questionId of eligibilityQuestions) {
            // Default to 'No' for all eligibility questions unless explicitly specified
            const noOption = document.querySelector(`${questionId}-no, ${questionId} input[value="no"]`);
            
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
          
          const nextBtn = document.querySelector('.next, #next-btn, [type="submit"]');
          if (nextBtn && successCount > 0 && !options.testMode) {
            await window.BorderlyAutomation.Click.smartClick(nextBtn);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          resolve(successCount > 0);
        } catch (error) {
          resolve(false);
        }
      });
    },

    /**
     * Handle review section
     */
    handleReview: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          // Review page - just look for submit button
          const submitBtn = document.querySelector('.submit-application, #submit-btn, [type="submit"]');
          
          if (submitBtn) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('ESTA review page detected', true, {
                message: 'Ready to submit application'
              });
            }
            
            if (!options.testMode) {
              await window.BorderlyAutomation.Click.smartClick(submitBtn);
              await new Promise(resolve => setTimeout(resolve, 3000));
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
     * Handle payment section
     */
    handlePayment: function(formData, options = {}) {
      return new Promise(function(resolve) {
        try {
          // Payment requires credit card details which should not be automated for security
          const paymentForm = document.querySelector('.payment-section, #payment-form');
          
          if (paymentForm) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('Payment page detected', true, {
                message: 'Manual payment required ($21 USD application fee)'
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
          // Look for ESTA authorization number
          const estaNumber = document.querySelector('.esta-number, #authorization-number, .confirmation-number');
          const statusElement = document.querySelector('.esta-status, #application-status');
          
          if (estaNumber || statusElement) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('ESTA confirmation detected', true, {
                hasEstaNumber: !!estaNumber,
                hasStatus: !!statusElement
              });
            }
            
            // Extract ESTA data
            const result = {};
            if (estaNumber) {
              result.estaNumber = estaNumber.textContent.trim();
            }
            
            if (statusElement) {
              result.status = statusElement.textContent.trim();
            }
            
            // Notify React Native app about the successful completion
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'usa_esta_success',
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
     * Validates form data before automation
     */
    validateFormData: function(formData) {
      const errors = [];
      const required = [
        'surname',
        'givenNames', 
        'dateOfBirth',
        'passportNumber',
        'passportCountry',
        'passportExpiry'
      ];
      
      if (!formData) {
        return { valid: false, errors: ['Form data is required'] };
      }
      
      required.forEach(field => {
        const value = this.getNestedValue(formData, field);
        if (!value || value.trim() === '') {
          errors.push(`Missing required field: ${field}`);
        }
      });
      
      // Validate date of birth format
      const dob = this.getNestedValue(formData, 'dateOfBirth');
      if (dob && !this.isValidDate(dob)) {
        errors.push('Invalid date of birth format');
      }
      
      // Validate passport expiry
      const expiry = this.getNestedValue(formData, 'passportExpiry');
      if (expiry && !this.isValidDate(expiry)) {
        errors.push('Invalid passport expiry format');
      } else if (expiry && new Date(expiry) <= new Date()) {
        errors.push('Passport has expired');
      }
      
      return {
        valid: errors.length === 0,
        errors: errors
      };
    },

    /**
     * Validates date format
     */
    isValidDate: function(dateString) {
      const date = new Date(dateString);
      return date instanceof Date && !isNaN(date);
    },


    /**
     * Waits for page to be stable (no loading indicators)
     */
    waitForPageStable: function(timeout = 10000) {
      return new Promise(function(resolve, reject) {
        const startTime = Date.now();
        
        function check() {
          const loadingElements = document.querySelectorAll(
            '.loading, .spinner, [aria-busy="true"], .progress-indicator, .esta-loading'
          );
          
          const isStable = loadingElements.length === 0 && document.readyState === 'complete';
          
          if (isStable) {
            resolve(true);
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Timeout waiting for page to be stable'));
          } else {
            setTimeout(check, 200);
          }
        }
        
        check();
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
      return url.includes('esta.cbp.dhs.gov') || (url.includes('cbp.gov') && url.includes('esta'));
    }
  };

  // Register USA automation
  window.BorderlyAutomation.registerCountry = window.BorderlyAutomation.registerCountry || function(countryCode, automation) {
    window.BorderlyAutomation.countries = window.BorderlyAutomation.countries || {};
    window.BorderlyAutomation.countries[countryCode] = automation;
  };

  window.BorderlyAutomation.registerCountry('USA', window.BorderlyAutomation.UnitedStates);

  if (window.BorderlyAutomation.UnitedStates.isSupported()) {
    console.log('USA ESTA automation script loaded and ready');
  }

})();