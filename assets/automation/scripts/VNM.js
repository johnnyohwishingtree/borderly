/**
 * Vietnam e-Visa Automation Script
 * 
 * Automates form filling for Vietnam e-Visa portal (https://evisa.xuatnhapcanh.gov.vn/)
 * This script handles the single-session application process for Vietnam tourist visa.
 */

(function() {
  'use strict';

  // Ensure common automation utilities are loaded
  if (!window.BorderlyAutomation || !window.BorderlyAutomation._loaded) {
    console.error('Borderly common automation utilities not loaded');
    return;
  }

  // Vietnam e-Visa specific automation
  window.BorderlyAutomation.Vietnam = {
    
    /**
     * Main automation orchestrator
     */
    automate: function(formData, options = {}) {
      return new Promise(async function(resolve, reject) {
        try {
          const debug = options.debug || false;
          const testMode = options.testMode || false;
          
          if (debug) {
            window.BorderlyAutomation.Debug.logStep('Vietnam e-Visa automation started', true, {
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
     * Detect current step in the Vietnam e-Visa process
     */
    detectCurrentStep: function() {
      return new Promise(function(resolve) {
        const url = window.location.href.toLowerCase();
        
        if (url.includes('apply') || document.querySelector('.nationality-selection')) {
          resolve('nationality_selection');
        } else if (document.querySelector('#surname')) {
          resolve('personal_info');
        } else if (document.querySelector('#passportType')) {
          resolve('passport_info');
        } else if (document.querySelector('#purposeOfVisit')) {
          resolve('travel_info');
        } else if (document.querySelector('#accommodationType')) {
          resolve('accommodation');
        } else if (document.querySelector('#homeAddress')) {
          resolve('contact_info');
        } else if (document.querySelector('#file-upload, .file-upload')) {
          resolve('document_upload');
        } else if (url.includes('payment') || document.querySelector('.payment-form')) {
          resolve('payment');
        } else if (url.includes('result') || document.querySelector('.application-success')) {
          resolve('success');
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
            case 'nationality_selection':
              result = await this.handleNationalitySelection(formData, options);
              break;
            case 'personal_info':
              result = await this.fillPersonalInfo(formData, options);
              break;
            case 'passport_info':
              result = await this.fillPassportInfo(formData, options);
              break;
            case 'travel_info':
              result = await this.fillTravelInfo(formData, options);
              break;
            case 'accommodation':
              result = await this.fillAccommodation(formData, options);
              break;
            case 'contact_info':
              result = await this.fillContactInfo(formData, options);
              break;
            case 'document_upload':
              result = await this.handleDocumentUpload(formData, options);
              break;
            case 'payment':
              result = await this.handlePayment(formData, options);
              break;
            case 'success':
              result = await this.handleSuccess(formData, options);
              break;
            default:
              console.warn('Unknown Vietnam e-Visa step:', step);
              result = false;
          }
          
          resolve(result);
        } catch (error) {
          console.error('Error handling Vietnam e-Visa step:', error);
          resolve(false);
        }
      }.bind(this));
    },

    /**
     * Handle nationality selection
     */
    handleNationalitySelection: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const nationalitySelect = document.querySelector('.nationality-selection select, #nationality-select');
          const nationality = this.getNestedValue(formData, 'nationality');
          
          if (nationalitySelect && nationality) {
            const success = await window.BorderlyAutomation.Form.fillField(nationalitySelect, nationality);
            
            if (success) {
              if (options.debug) {
                window.BorderlyAutomation.Debug.highlightElement(nationalitySelect);
              }
              
              // Look for continue button
              const continueBtn = document.querySelector('.btn-continue, #continue-btn, [type="submit"]');
              if (continueBtn && !options.testMode) {
                await window.BorderlyAutomation.Click.smartClick(continueBtn);
                await window.BorderlyAutomation.Page.waitForNavigation();
              }
              
              resolve(true);
            } else {
              resolve(false);
            }
          } else {
            resolve(false);
          }
        } catch (error) {
          resolve(false);
        }
      }.bind(this));
    },

    /**
     * Fill personal information section
     */
    fillPersonalInfo: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const fields = [
            { selector: '#surname', key: 'surname', type: 'input' },
            { selector: '#middleName', key: 'middleName', type: 'input' },
            { selector: '#givenName', key: 'givenName', type: 'input' },
            { selector: '#dateOfBirth', key: 'dateOfBirth', type: 'input' },
            { selector: '#placeOfBirth', key: 'placeOfBirth', type: 'input' },
            { selector: '#gender', key: 'gender', type: 'select' },
            { selector: '#nationality', key: 'nationality', type: 'input' },
            { selector: '#religion', key: 'religion', type: 'select' }
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
          
          // Look for next button
          const nextBtn = document.querySelector('.btn-next, #next-btn, [type="submit"]');
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
            { selector: '#passportType', key: 'passportType', type: 'select' },
            { selector: '#passportNumber', key: 'passportNumber', type: 'input' },
            { selector: '#passportIssuedDate', key: 'passportIssuedDate', type: 'input' },
            { selector: '#passportExpiry', key: 'passportExpiry', type: 'input' },
            { selector: '#passportIssuingAuthority', key: 'passportIssuingAuthority', type: 'input' }
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
          
          const nextBtn = document.querySelector('.btn-next, #next-btn, [type="submit"]');
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
            { selector: '#purposeOfVisit', key: 'purposeOfVisit', type: 'select' },
            { selector: '#entryDate', key: 'entryDate', type: 'input' },
            { selector: '#entryPort', key: 'entryPort', type: 'select' },
            { selector: '#stayDuration', key: 'stayDuration', type: 'input' },
            { selector: '#previousVietnamVisit', key: 'previousVietnamVisit', type: 'checkbox' }
          ];

          let successCount = 0;
          
          for (const field of fields) {
            const value = this.getNestedValue(formData, field.key);
            if (value !== undefined) {
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
          
          const nextBtn = document.querySelector('.btn-next, #next-btn, [type="submit"]');
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
     * Fill accommodation information section
     */
    fillAccommodation: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const fields = [
            { selector: '#accommodationType', key: 'accommodationType', type: 'select' },
            { selector: '#hotelName', key: 'hotelName', type: 'input' },
            { selector: '#hotelAddress', key: 'hotelAddress', type: 'input' },
            { selector: '#hotelPhone', key: 'hotelPhone', type: 'input' },
            { selector: '#cityOfStay', key: 'cityOfStay', type: 'select' }
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
          
          const nextBtn = document.querySelector('.btn-next, #next-btn, [type="submit"]');
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
            { selector: '#homeAddress', key: 'homeAddress', type: 'textarea' },
            { selector: '#phoneNumber', key: 'phoneNumber', type: 'input' },
            { selector: '#email', key: 'email', type: 'input' },
            { selector: '#emergencyContactName', key: 'emergencyContactName', type: 'input' },
            { selector: '#emergencyContactPhone', key: 'emergencyContactPhone', type: 'input' }
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
          
          const nextBtn = document.querySelector('.btn-next, #next-btn, [type="submit"]');
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
     * Handle document upload section
     */
    handleDocumentUpload: function(formData, options = {}) {
      return new Promise(function(resolve) {
        try {
          // Document upload requires file selection which is not automated
          const uploadSection = document.querySelector('#file-upload, .file-upload, .document-upload');
          
          if (uploadSection) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('Document upload page detected', true, {
                message: 'Manual document upload required (passport photo, portrait photo)'
              });
            }
            resolve(false); // Manual intervention required
          } else {
            resolve(true); // No upload needed or already completed
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
          const paymentForm = document.querySelector('.payment-form, #payment-section');
          
          if (paymentForm) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('Payment page detected', true, {
                message: 'Manual payment required (~$25 USD)'
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
     * Handle success/completion page
     */
    handleSuccess: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          // Look for application reference number and e-visa download link
          const applicationRef = document.querySelector('#application-reference, .reference-number');
          const downloadLink = document.querySelector('#evisa-download-link, .download-evisa');
          
          if (applicationRef || downloadLink) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('Vietnam e-Visa application success detected', true, {
                hasApplicationRef: !!applicationRef,
                hasDownloadLink: !!downloadLink
              });
            }
            
            // Extract application data
            const result = {};
            if (applicationRef) {
              result.applicationNumber = applicationRef.textContent.trim();
            }
            
            if (downloadLink) {
              result.eVisaDownloadUrl = downloadLink.href;
            }
            
            // Notify React Native app about the successful completion
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'vietnam_evisa_success',
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
      return url.includes('evisa.xuatnhapcanh.gov.vn') || url.includes('vietnam-evisa');
    }
  };

  // Register Vietnam automation
  window.BorderlyAutomation.registerCountry = window.BorderlyAutomation.registerCountry || function(countryCode, automation) {
    window.BorderlyAutomation.countries = window.BorderlyAutomation.countries || {};
    window.BorderlyAutomation.countries[countryCode] = automation;
  };

  window.BorderlyAutomation.registerCountry('VNM', window.BorderlyAutomation.Vietnam);

  if (window.BorderlyAutomation.Vietnam.isSupported()) {
    console.log('Vietnam e-Visa automation script loaded and ready');
  }

})();