/**
 * Thailand Pass Automation Script
 * 
 * Automates form filling for Thailand Pass (https://tp.consular.go.th/)
 * This script handles the multi-step application process for Thailand entry.
 */

(function() {
  'use strict';

  // Ensure common automation utilities are loaded
  if (!window.BorderlyAutomation || !window.BorderlyAutomation._loaded) {
    console.error('Borderly common automation utilities not loaded');
    return;
  }

  // Thailand Pass specific automation
  window.BorderlyAutomation.Thailand = {
    
    /**
     * Main automation orchestrator
     */
    automate: function(formData, options = {}) {
      return new Promise(async function(resolve, reject) {
        try {
          const debug = options.debug || false;
          const testMode = options.testMode || false;
          
          if (debug) {
            window.BorderlyAutomation.Debug.logStep('Thailand automation started', true, {
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
     * Detect current step in the Thailand Pass process
     */
    detectCurrentStep: function() {
      return new Promise(function(resolve) {
        // Step detection based on URL patterns and page elements
        const url = window.location.href.toLowerCase();
        
        if (url.includes('register') || document.querySelector('#register-btn')) {
          resolve('registration');
        } else if (url.includes('login') || document.querySelector('#login-form')) {
          resolve('login');
        } else if (url.includes('application') || document.querySelector('.application-form')) {
          // Further detect which part of the application
          if (document.querySelector('#title-select')) {
            resolve('personal_info');
          } else if (document.querySelector('#arrivalDate')) {
            resolve('travel_info');
          } else if (document.querySelector('#accommodationType')) {
            resolve('accommodation');
          } else if (document.querySelector('#vaccinationStatus')) {
            resolve('health_info');
          } else if (document.querySelector('#file-upload')) {
            resolve('document_upload');
          } else {
            resolve('application_form');
          }
        } else if (url.includes('confirmation') || document.querySelector('.confirmation-page')) {
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
            case 'registration':
              result = await this.handleRegistration(formData, options);
              break;
            case 'login':
              result = await this.handleLogin(formData, options);
              break;
            case 'personal_info':
              result = await this.fillPersonalInfo(formData, options);
              break;
            case 'travel_info':
              result = await this.fillTravelInfo(formData, options);
              break;
            case 'accommodation':
              result = await this.fillAccommodation(formData, options);
              break;
            case 'health_info':
              result = await this.fillHealthInfo(formData, options);
              break;
            case 'document_upload':
              result = await this.handleDocumentUpload(formData, options);
              break;
            case 'confirmation':
              result = await this.handleConfirmation(formData, options);
              break;
            default:
              console.warn('Unknown Thailand Pass step:', step);
              result = false;
          }
          
          resolve(result);
        } catch (error) {
          console.error('Error handling Thailand Pass step:', error);
          resolve(false);
        }
      }.bind(this));
    },

    /**
     * Handle account registration
     */
    handleRegistration: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          // This would typically require user interaction for email verification
          // For now, just detect if we're on the registration page
          const registerBtn = await window.BorderlyAutomation.DOM.waitForElement('#register-btn', 5000);
          
          if (registerBtn) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.highlightElement(registerBtn);
              window.BorderlyAutomation.Debug.logStep('Registration button found', true);
            }
            
            // In test mode, don't actually click
            if (!options.testMode) {
              await window.BorderlyAutomation.Click.smartClick(registerBtn);
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
     * Handle login process
     */
    handleLogin: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          // Login typically requires credentials that we don't auto-fill for security
          // Just detect the login form and return false to indicate manual intervention needed
          const loginForm = document.querySelector('#login-form');
          
          if (loginForm) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('Login form detected', true, {
                message: 'Manual login required'
              });
            }
            resolve(false); // Manual intervention required
          } else {
            resolve(true); // No login needed or already logged in
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
            { selector: '#title-select', key: 'title', type: 'select' },
            { selector: '#firstName', key: 'firstName', type: 'input' },
            { selector: '#lastName', key: 'lastName', type: 'input' },
            { selector: '#dateOfBirth', key: 'dateOfBirth', type: 'input' },
            { selector: '#nationality', key: 'nationality', type: 'input' },
            { selector: '#passportNumber', key: 'passportNumber', type: 'input' },
            { selector: '#passportExpiry', key: 'passportExpiry', type: 'input' }
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
          
          // Look for next button and click it
          const nextBtn = document.querySelector('.btn-next, #next-btn, [type="submit"]');
          if (nextBtn && successCount > 0) {
            await window.BorderlyAutomation.Click.smartClick(nextBtn);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for navigation
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
            { selector: '#arrivalDate', key: 'arrivalDate', type: 'input' },
            { selector: '#flightNumber', key: 'flightNumber', type: 'input' },
            { selector: '#departureCountry', key: 'departureCountry', type: 'input' },
            { selector: '#purposeOfVisit', key: 'purposeOfVisit', type: 'select' },
            { selector: '#lengthOfStay', key: 'lengthOfStay', type: 'input' }
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
          if (nextBtn && successCount > 0) {
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
            { selector: '#hotelPhone', key: 'hotelPhone', type: 'input' }
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
          if (nextBtn && successCount > 0) {
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
     * Fill health information section
     */
    fillHealthInfo: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          const fields = [
            { selector: '#vaccinationStatus', key: 'vaccinationStatus', type: 'select' },
            { selector: '#hasInsurance', key: 'hasInsurance', type: 'checkbox' },
            { selector: '#emergencyContact', key: 'emergencyContact', type: 'input' }
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
          if (nextBtn && successCount > 0) {
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
          // Just detect if we're on the upload page and indicate manual intervention needed
          const uploadSection = document.querySelector('#file-upload, .file-upload, .document-upload');
          
          if (uploadSection) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('Document upload page detected', true, {
                message: 'Manual document upload required'
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
     * Handle confirmation page
     */
    handleConfirmation: function(formData, options = {}) {
      return new Promise(async function(resolve) {
        try {
          // Look for QR code or confirmation number
          const qrCode = document.querySelector('#qr-code, .qr-code, #qr-code-display');
          const confirmationNumber = document.querySelector('#confirmation-number, .confirmation-number');
          
          if (qrCode || confirmationNumber) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('Thailand Pass confirmation detected', true, {
                hasQrCode: !!qrCode,
                hasConfirmationNumber: !!confirmationNumber
              });
            }
            
            // Extract QR code image or confirmation data
            const result = {};
            if (qrCode) {
              const img = qrCode.querySelector('img');
              if (img && img.src) {
                result.qrCodeUrl = img.src;
              }
            }
            
            if (confirmationNumber) {
              result.confirmationNumber = confirmationNumber.textContent.trim();
            }
            
            // Notify React Native app about the successful completion
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'thailand_pass_success',
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
      return url.includes('tp.consular.go.th') || url.includes('thailandpass');
    }
  };

  // Register Thailand automation
  window.BorderlyAutomation.registerCountry = window.BorderlyAutomation.registerCountry || function(countryCode, automation) {
    window.BorderlyAutomation.countries = window.BorderlyAutomation.countries || {};
    window.BorderlyAutomation.countries[countryCode] = automation;
  };

  window.BorderlyAutomation.registerCountry('THA', window.BorderlyAutomation.Thailand);

  if (window.BorderlyAutomation.Thailand.isSupported()) {
    console.log('Thailand Pass automation script loaded and ready');
  }

})();