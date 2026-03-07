/**
 * Canada eTA Automation Script
 * 
 * Automates form filling for Canada eTA application 
 * (https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html)
 * This script handles the eTA application process for eligible countries.
 */

(function() {
  'use strict';

  // Ensure common automation utilities are loaded
  if (!window.BorderlyAutomation || !window.BorderlyAutomation._loaded) {
    console.error('Borderly common automation utilities not loaded');
    return;
  }

  // Canada eTA specific automation
  window.BorderlyAutomation.Canada = {
    
    /**
     * Main automation orchestrator
     */
    automate: function(formData, options = {}) {
      return new Promise(async function(resolve, reject) {
        try {
          const debug = options.debug || false;
          const testMode = options.testMode || false;
          
          if (debug) {
            window.BorderlyAutomation.Debug.logStep('Canada eTA automation started', true, {
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
     * Detect current step in the Canada eTA process
     */
    detectCurrentStep: function() {
      return new Promise(function(resolve) {
        const url = window.location.href.toLowerCase();
        
        if (url.includes('eligibility') || document.querySelector('.eligibility-checker')) {
          resolve('eligibility_check');
        } else if (url.includes('start-application') || document.querySelector('#start-application')) {
          resolve('start_application');
        } else if (document.querySelector('#given-name, #first-name')) {
          resolve('personal_info');
        } else if (document.querySelector('#passport-number')) {
          resolve('passport_info');
        } else if (document.querySelector('#birth-country')) {
          resolve('birth_info');
        } else if (document.querySelector('#home-address')) {
          resolve('address_info');
        } else if (document.querySelector('#employment-status')) {
          resolve('employment_info');
        } else if (document.querySelector('#arrival-date')) {
          resolve('travel_info');
        } else if (document.querySelector('#medical-condition')) {
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
            case 'eligibility_check':
              result = await this.handleEligibilityCheck(formData, options);
              break;
            case 'start_application':
              result = await this.handleStartApplication(formData, options);
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
            case 'employment_info':
              result = await this.fillEmploymentInfo(formData, options);
              break;
            case 'travel_info':
              result = await this.fillTravelInfo(formData, options);
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
              console.warn('Unknown Canada eTA step:', step);
              result = false;
          }
          
          resolve(result);
        } catch (error) {
          console.error('Error handling Canada eTA step:', error);
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
          const nationalitySelect = document.querySelector('#nationality, .nationality-dropdown');
          const nationality = this.getNestedValue(formData, 'nationality');
          
          if (nationalitySelect && nationality) {
            const success = await window.BorderlyAutomation.Form.fillField(nationalitySelect, nationality);
            
            if (success && options.debug) {
              window.BorderlyAutomation.Debug.highlightElement(nationalitySelect);
            }
            
            // Look for check eligibility button
            const checkBtn = document.querySelector('.check-eligibility, #check-eligibility');
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
     * Handle start application
     */
    handleStartApplication: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const startBtn = document.querySelector('#start-application, .start-application-btn');
          
          if (startBtn) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.highlightElement(startBtn);
            }
            
            if (!options.testMode) {
              await window.BorderlyAutomation.Click.smartClick(startBtn);
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
     * Fill personal information section
     */
    fillPersonalInfo: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const fields = [
            { selector: '#given-name, #first-name', key: 'givenNames', type: 'input' },
            { selector: '#family-name, #last-name', key: 'surname', type: 'input' },
            { selector: '#date-of-birth', key: 'dateOfBirth', type: 'input' },
            { selector: '#gender', key: 'gender', type: 'select' },
            { selector: '#marital-status', key: 'maritalStatus', type: 'select' },
            { selector: '#nationality', key: 'nationality', type: 'select' },
            { selector: '#country-of-citizenship', key: 'citizenship', type: 'select' }
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
          
          const nextBtn = document.querySelector('.continue, #continue-btn, [type="submit"]');
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
            { selector: '#passport-expiry-date', key: 'passportExpiry', type: 'input' }
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
          
          const nextBtn = document.querySelector('.continue, #continue-btn, [type="submit"]');
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
            { selector: '#birth-country', key: 'birthCountry', type: 'select' },
            { selector: '#birth-city', key: 'birthCity', type: 'input' },
            { selector: '#birth-province', key: 'birthProvince', type: 'input' }
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
          
          const nextBtn = document.querySelector('.continue, #continue-btn, [type="submit"]');
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
            { selector: '#home-province', key: 'homeProvince', type: 'input' },
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
          
          const nextBtn = document.querySelector('.continue, #continue-btn, [type="submit"]');
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
            { selector: '#employment-status', key: 'employmentStatus', type: 'select' },
            { selector: '#employer-name', key: 'employerName', type: 'input' },
            { selector: '#job-title', key: 'jobTitle', type: 'input' },
            { selector: '#employer-address', key: 'employerAddress', type: 'input' },
            { selector: '#employer-city', key: 'employerCity', type: 'input' },
            { selector: '#employer-country', key: 'employerCountry', type: 'select' }
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
          
          const nextBtn = document.querySelector('.continue, #continue-btn, [type="submit"]');
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
            { selector: '#purpose-of-visit', key: 'purposeOfVisit', type: 'select' },
            { selector: '#length-of-stay', key: 'lengthOfStay', type: 'input' },
            { selector: '#funds-available', key: 'fundsAvailable', type: 'select' }
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
          
          const nextBtn = document.querySelector('.continue, #continue-btn, [type="submit"]');
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
          // Canada eTA has eligibility questions - default to 'No' unless specified
          const eligibilityQuestions = [
            '#medical-condition',
            '#criminal-conviction',
            '#immigration-violation',
            '#refused-entry',
            '#deportation-order'
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
          
          const nextBtn = document.querySelector('.continue, #continue-btn, [type="submit"]');
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
          // Review page - look for confirmation checkbox and submit button
          const confirmationCheckbox = document.querySelector('#confirm-accuracy, .accuracy-confirmation input[type="checkbox"]');
          const submitBtn = document.querySelector('.submit-application, #submit-btn, [type="submit"]');
          
          if (confirmationCheckbox && submitBtn) {
            await window.BorderlyAutomation.Form.fillField(confirmationCheckbox, true);
            
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('Canada eTA review page detected', true, {
                message: 'Ready to submit application'
              });
              window.BorderlyAutomation.Debug.highlightElement(confirmationCheckbox);
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
                message: 'Manual payment required (CAD $7 application fee)'
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
          // Look for eTA authorization number or confirmation
          const etaNumber = document.querySelector('.eta-number, #authorization-number, .confirmation-number');
          const statusElement = document.querySelector('.eta-status, #application-status');
          
          if (etaNumber || statusElement) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('Canada eTA confirmation detected', true, {
                hasEtaNumber: !!etaNumber,
                hasStatus: !!statusElement
              });
            }
            
            // Extract eTA data
            const result = {};
            if (etaNumber) {
              result.etaNumber = etaNumber.textContent.trim();
            }
            
            if (statusElement) {
              result.status = statusElement.textContent.trim();
            }
            
            // Notify React Native app about the successful completion
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'canada_eta_success',
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
      return url.includes('canada.ca') && (url.includes('eta') || url.includes('electronic-travel'));
    }
  };

  // Register Canada automation
  window.BorderlyAutomation.registerCountry = window.BorderlyAutomation.registerCountry || function(countryCode, automation) {
    window.BorderlyAutomation.countries = window.BorderlyAutomation.countries || {};
    window.BorderlyAutomation.countries[countryCode] = automation;
  };

  window.BorderlyAutomation.registerCountry('CAN', window.BorderlyAutomation.Canada);

  if (window.BorderlyAutomation.Canada.isSupported()) {
    console.log('Canada eTA automation script loaded and ready');
  }

})();