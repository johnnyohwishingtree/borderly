/**
 * Malaysia Digital Arrival Card (MDAC) Automation Script
 *
 * Automates form filling for the Malaysia MDAC portal
 * (https://imigresen-online.imi.gov.my/mdac/main)
 * This script handles the multi-step process: personal info → travel details →
 * accommodation → health & declarations → submit.
 *
 * NOTE: No account creation is required for MDAC — the form is completed directly.
 * Selectors were mapped from the MDAC portal as of 2025-06-01.
 * The portal uses server-rendered forms; selectors rely on `name` and `id` attributes.
 * Re-verify selectors if `changeDetection` alerts fire.
 *
 * Last DOM verification: 2025-06-01
 */

(function() {
  'use strict';

  // Ensure common automation utilities are loaded
  if (!window.BorderlyAutomation || !window.BorderlyAutomation._loaded) {
    console.error('Borderly common automation utilities not loaded');
    return;
  }

  /**
   * Portal URL for Malaysia MDAC
   * @type {string}
   */
  var portalUrl = 'https://imigresen-online.imi.gov.my/mdac/main';

  /**
   * Field mappings: schema field ID → multi-strategy selector criteria
   * Each entry uses the findElement() criteria format from common.js.
   *
   * @type {Object.<string, {selector?: string, id?: string, name?: string, label?: string, nearbyText?: string}>}
   */
  var fieldMappings = {
    // Personal Information (Step 2)
    surname: {
      selector: "input[name='familyName'], #familyName",
      name: 'familyName',
      label: 'Family Name',
      nearbyText: 'Family Name'
    },
    givenNames: {
      selector: "input[name='firstName'], #firstName",
      name: 'firstName',
      label: 'First Name',
      nearbyText: 'First Name'
    },
    dateOfBirth: {
      selector: "input[name='dob'], #dob",
      name: 'dob',
      label: 'Date of Birth',
      nearbyText: 'Date of Birth'
    },
    nationality: {
      selector: "select[name='nationality'], #nationality",
      name: 'nationality',
      label: 'Nationality',
      nearbyText: 'Nationality'
    },
    passportNumber: {
      selector: "input[name='passportNo'], #passportNo",
      name: 'passportNo',
      label: 'Passport Number',
      nearbyText: 'Passport'
    },
    passportExpiry: {
      selector: "input[name='passportExpiryDate'], #passportExpiryDate",
      name: 'passportExpiryDate',
      label: 'Passport Expiry Date',
      nearbyText: 'Expiry'
    },
    gender: {
      selector: "select[name='gender'], #gender",
      name: 'gender',
      label: 'Gender',
      nearbyText: 'Gender'
    },
    email: {
      selector: "input[name='email'], input[type='email'], #email",
      name: 'email',
      label: 'Email Address',
      nearbyText: 'Email'
    },
    phoneNumber: {
      selector: "input[name='phoneNo'], input[type='tel'], #phoneNo",
      name: 'phoneNo',
      label: 'Phone Number',
      nearbyText: 'Phone'
    },

    // Travel Information (Step 3)
    arrivalDate: {
      selector: "input[name='arrivalDate'], #arrivalDate",
      name: 'arrivalDate',
      label: 'Arrival Date',
      nearbyText: 'Arrival Date'
    },
    arrivalAirport: {
      selector: "select[name='portOfEntry'], #portOfEntry",
      name: 'portOfEntry',
      label: 'Port of Entry',
      nearbyText: 'Port of Entry'
    },
    flightNumber: {
      selector: "input[name='flightNo'], #flightNo",
      name: 'flightNo',
      label: 'Flight Number',
      nearbyText: 'Flight'
    },
    purposeOfVisit: {
      selector: "select[name='purposeOfVisit'], #purposeOfVisit",
      name: 'purposeOfVisit',
      label: 'Purpose of Visit',
      nearbyText: 'Purpose'
    },
    durationOfStay: {
      selector: "input[name='stayDuration'], #stayDuration",
      name: 'stayDuration',
      label: 'Duration of Stay',
      nearbyText: 'Duration'
    },

    // Accommodation (Step 4)
    hotelName: {
      selector: "input[name='hotelName'], #hotelName",
      name: 'hotelName',
      label: 'Name of Accommodation',
      nearbyText: 'Accommodation Name'
    },
    hotelAddress: {
      selector: "textarea[name='hotelAddress'], #hotelAddress",
      name: 'hotelAddress',
      label: 'Address of Accommodation',
      nearbyText: 'Accommodation Address'
    },
    hotelPhone: {
      selector: "input[name='hotelContactNo'], #hotelContactNo",
      name: 'hotelContactNo',
      label: 'Contact Number of Accommodation',
      nearbyText: 'Contact Number'
    },

    // Health & Declarations (Step 5)
    healthCondition: {
      selector: "input[name='healthCondition'], #healthCondition",
      name: 'healthCondition',
      label: 'Health Condition Declaration',
      nearbyText: 'health condition'
    },
    visitedHighRiskCountries: {
      selector: "input[name='visitedHighRisk'], #visitedHighRisk",
      name: 'visitedHighRisk',
      label: 'Visited High-Risk Countries',
      nearbyText: 'high-risk'
    },
    carryingCurrency: {
      selector: "input[name='carryingCurrency'], #carryingCurrency",
      name: 'carryingCurrency',
      label: 'Carrying Currency Exceeding RM10,000',
      nearbyText: 'RM10,000'
    },
    carryingProhibitedItems: {
      selector: "input[name='prohibitedItems'], #prohibitedItems",
      name: 'prohibitedItems',
      label: 'Carrying Prohibited or Restricted Items',
      nearbyText: 'prohibited'
    }
  };

  /**
   * Page detectors: map portal steps to detection functions.
   * Steps correspond to submissionGuide order values in MYS.json.
   *
   * @type {Object.<string, function(): boolean>}
   */
  var pageDetectors = {
    /**
     * Step 1: MDAC portal landing / start page
     */
    landing: function() {
      var url = window.location.href.toLowerCase();
      return (
        (url.includes('/mdac/main') || url.includes('/mdac/')) &&
        !document.querySelector("input[name='familyName']") &&
        !document.querySelector("input[name='arrivalDate']")
      );
    },

    /**
     * Step 2: Personal information form
     */
    personal_info: function() {
      return (
        !!document.querySelector("input[name='familyName']") ||
        !!document.querySelector("input[name='passportNo']") ||
        !!document.querySelector('#familyName')
      );
    },

    /**
     * Step 3: Travel details form
     */
    travel_details: function() {
      return (
        !!document.querySelector("input[name='arrivalDate']") ||
        !!document.querySelector("select[name='portOfEntry']") ||
        !!document.querySelector("input[name='flightNo']")
      );
    },

    /**
     * Step 4: Accommodation details form
     */
    accommodation: function() {
      return (
        !!document.querySelector("input[name='hotelName']") ||
        !!document.querySelector("textarea[name='hotelAddress']")
      );
    },

    /**
     * Step 5: Health and declarations form
     */
    health_declarations: function() {
      return (
        !!document.querySelector("input[name='healthCondition']") ||
        !!document.querySelector("input[name='visitedHighRisk']") ||
        !!document.querySelector("input[name='carryingCurrency']")
      );
    },

    /**
     * Step 6: Submission confirmation/success page
     */
    confirmation: function() {
      var url = window.location.href.toLowerCase();
      return (
        url.includes('/confirm') ||
        url.includes('/success') ||
        !!document.querySelector('.confirmation-number') ||
        !!document.querySelector('.mdac-confirmation') ||
        !!document.querySelector('#confirmation-ref')
      );
    }
  };

  /**
   * Submit button selector for MDAC forms.
   * @type {string}
   */
  var submitButtonSelector = [
    '#submit-application',
    'button[type="submit"]',
    '.btn-submit',
    '.mdac-btn-primary',
    'input[type="submit"]',
    'button.next-step'
  ].join(', ');

  // Malaysia MDAC specific automation
  window.BorderlyAutomation.Malaysia = {

    // Expose constants for testing and external use
    portalUrl: portalUrl,
    fieldMappings: fieldMappings,
    pageDetectors: pageDetectors,
    submitButtonSelector: submitButtonSelector,

    /**
     * Main automation orchestrator
     */
    automate: function(formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function(resolve, reject) {
        (async function() {
          try {
            var debug = options.debug || false;
            var testMode = options.testMode || false;

            if (debug) {
              window.BorderlyAutomation.Debug.logStep('Malaysia MDAC automation started', true, {
                url: window.location.href,
                testMode: testMode
              });
            }

            await window.BorderlyAutomation.Page.waitForReady();

            var currentStep = await self.detectCurrentStep();

            if (debug) {
              window.BorderlyAutomation.Debug.logStep('Current step detected', true, {
                step: currentStep
              });
            }

            var result = await self.handleStep(currentStep, formData, options);

            resolve({
              success: result,
              step: currentStep,
              nextAction: result ? 'proceed' : 'manual_intervention_required'
            });
          } catch (error) {
            var context = window.BorderlyAutomation.Error.captureContext(error);
            reject(context);
          }
        })();
      });
    },

    /**
     * Detect current step in the MDAC process
     */
    detectCurrentStep: function() {
      return new Promise(function(resolve) {
        if (pageDetectors.confirmation()) {
          resolve('confirmation');
        } else if (pageDetectors.health_declarations()) {
          resolve('health_declarations');
        } else if (pageDetectors.accommodation()) {
          resolve('accommodation');
        } else if (pageDetectors.travel_details()) {
          resolve('travel_details');
        } else if (pageDetectors.personal_info()) {
          resolve('personal_info');
        } else if (pageDetectors.landing()) {
          resolve('landing');
        } else {
          resolve('unknown');
        }
      });
    },

    /**
     * Handle specific step in the MDAC process
     */
    handleStep: function(step, formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function(resolve) {
        (async function() {
          try {
            var result = false;
            switch (step) {
              case 'landing':
                result = await self.handleLanding(formData, options);
                break;
              case 'personal_info':
                result = await self.fillPersonalInfo(formData, options);
                break;
              case 'travel_details':
                result = await self.fillTravelDetails(formData, options);
                break;
              case 'accommodation':
                result = await self.fillAccommodation(formData, options);
                break;
              case 'health_declarations':
                result = await self.fillHealthDeclarations(formData, options);
                break;
              case 'confirmation':
                result = await self.handleConfirmation(formData, options);
                break;
              default:
                console.warn('Unknown Malaysia MDAC step:', step);
                result = false;
            }
            resolve(result);
          } catch (error) {
            console.error('Error handling Malaysia MDAC step:', error);
            resolve(false);
          }
        })();
      });
    },

    /**
     * Handle landing page — look for "Start Application" button
     */
    handleLanding: function(formData, options) {
      options = options || {};
      return new Promise(function(resolve) {
        (async function() {
          try {
            var startBtn = document.querySelector('.btn-start, #start-application, a[href*="application"]');
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
        })();
      });
    },

    /**
     * Fill personal information
     * Corresponds to submission guide Step 2: "Enter Personal Information"
     */
    fillPersonalInfo: function(formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function(resolve) {
        (async function() {
          try {
            var fieldsToFill = [
              { criteria: fieldMappings.surname, key: 'surname' },
              { criteria: fieldMappings.givenNames, key: 'givenNames' },
              { criteria: fieldMappings.dateOfBirth, key: 'dateOfBirth' },
              { criteria: fieldMappings.nationality, key: 'nationality' },
              { criteria: fieldMappings.passportNumber, key: 'passportNumber' },
              { criteria: fieldMappings.passportExpiry, key: 'passportExpiry' },
              { criteria: fieldMappings.gender, key: 'gender' },
              { criteria: fieldMappings.email, key: 'email' },
              { criteria: fieldMappings.phoneNumber, key: 'phoneNumber' }
            ];

            var successCount = await self._fillFields(fieldsToFill, formData, options);

            if (successCount > 0 && !options.testMode) {
              var nextBtn = document.querySelector(submitButtonSelector);
              if (nextBtn) {
                await window.BorderlyAutomation.Click.smartClick(nextBtn);
                await new Promise(function(r) { setTimeout(r, 2000); });
              }
            }

            resolve(successCount > 0);
          } catch (error) {
            resolve(false);
          }
        })();
      });
    },

    /**
     * Fill travel details
     * Corresponds to submission guide Step 3: "Travel Details"
     */
    fillTravelDetails: function(formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function(resolve) {
        (async function() {
          try {
            var fieldsToFill = [
              { criteria: fieldMappings.arrivalDate, key: 'arrivalDate' },
              { criteria: fieldMappings.arrivalAirport, key: 'arrivalAirport' },
              { criteria: fieldMappings.flightNumber, key: 'flightNumber' },
              { criteria: fieldMappings.purposeOfVisit, key: 'purposeOfVisit' },
              { criteria: fieldMappings.durationOfStay, key: 'durationOfStay' }
            ];

            var successCount = await self._fillFields(fieldsToFill, formData, options);

            if (successCount > 0 && !options.testMode) {
              var nextBtn = document.querySelector(submitButtonSelector);
              if (nextBtn) {
                await window.BorderlyAutomation.Click.smartClick(nextBtn);
                await new Promise(function(r) { setTimeout(r, 2000); });
              }
            }

            resolve(successCount > 0);
          } catch (error) {
            resolve(false);
          }
        })();
      });
    },

    /**
     * Fill accommodation information
     * Corresponds to submission guide Step 4: "Accommodation Information"
     */
    fillAccommodation: function(formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function(resolve) {
        (async function() {
          try {
            var fieldsToFill = [
              { criteria: fieldMappings.hotelName, key: 'hotelName' },
              { criteria: fieldMappings.hotelAddress, key: 'hotelAddress' },
              { criteria: fieldMappings.hotelPhone, key: 'hotelPhone' }
            ];

            var successCount = await self._fillFields(fieldsToFill, formData, options);

            if (successCount > 0 && !options.testMode) {
              var nextBtn = document.querySelector(submitButtonSelector);
              if (nextBtn) {
                await window.BorderlyAutomation.Click.smartClick(nextBtn);
                await new Promise(function(r) { setTimeout(r, 2000); });
              }
            }

            resolve(successCount > 0);
          } catch (error) {
            resolve(false);
          }
        })();
      });
    },

    /**
     * Fill health and customs declarations
     * Corresponds to submission guide Step 5: "Health and Declaration"
     */
    fillHealthDeclarations: function(formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function(resolve) {
        (async function() {
          try {
            var fieldsToFill = [
              { criteria: fieldMappings.healthCondition, key: 'healthCondition' },
              { criteria: fieldMappings.visitedHighRiskCountries, key: 'visitedHighRiskCountries' },
              { criteria: fieldMappings.carryingCurrency, key: 'carryingCurrency' },
              { criteria: fieldMappings.carryingProhibitedItems, key: 'carryingProhibitedItems' }
            ];

            var successCount = await self._fillFields(fieldsToFill, formData, options);

            if (successCount > 0 && !options.testMode) {
              var submitBtn = document.querySelector(submitButtonSelector);
              if (submitBtn) {
                await window.BorderlyAutomation.Click.smartClick(submitBtn);
                await new Promise(function(r) { setTimeout(r, 3000); });
              }
            }

            resolve(successCount > 0);
          } catch (error) {
            resolve(false);
          }
        })();
      });
    },

    /**
     * Handle confirmation page — extract reference number and notify React Native
     * Corresponds to submission guide Step 6: "Submit and Save"
     */
    handleConfirmation: function(formData, options) {
      options = options || {};
      return new Promise(function(resolve) {
        (async function() {
          try {
            var confirmationEl = document.querySelector('.confirmation-number, #confirmation-ref, .mdac-confirmation');
            var referenceEl = document.querySelector('.reference-number, #reference-no');

            if (confirmationEl || referenceEl) {
              if (options.debug) {
                window.BorderlyAutomation.Debug.logStep('MDAC confirmation detected', true, {
                  hasConfirmation: !!confirmationEl,
                  hasReference: !!referenceEl
                });
              }

              var result = {};
              if (confirmationEl) {
                result.confirmationNumber = confirmationEl.textContent.trim();
              }
              if (referenceEl) {
                result.referenceNumber = referenceEl.textContent.trim();
              }

              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'malaysia_mdac_success',
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
        })();
      });
    },

    /**
     * Internal helper: fill multiple fields using findElement + fillField
     */
    _fillFields: function(fieldsToFill, formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function(resolve) {
        (async function() {
          var successCount = 0;
          for (var i = 0; i < fieldsToFill.length; i++) {
            var fieldDef = fieldsToFill[i];
            var value = self.getNestedValue(formData, fieldDef.key);
            if (value !== undefined && value !== null && value !== '') {
              var element = window.BorderlyAutomation.DOM.findElement(fieldDef.criteria);
              if (element) {
                var success = await window.BorderlyAutomation.Form.fillField(element, value);
                if (success) {
                  successCount++;
                  if (options.debug) {
                    window.BorderlyAutomation.Debug.highlightElement(element, 1000);
                  }
                }
              }
            }
          }
          resolve(successCount);
        })();
      });
    },

    /**
     * Utility to get nested value from form data object
     */
    getNestedValue: function(obj, path) {
      return path.split('.').reduce(function(current, key) {
        return current && current[key];
      }, obj);
    },

    /**
     * Check if automation is supported on the current page
     */
    isSupported: function() {
      var url = window.location.href.toLowerCase();
      return (
        url.includes('imigresen-online.imi.gov.my') ||
        url.includes('/mdac/')
      );
    }
  };

  // Register Malaysia automation
  window.BorderlyAutomation.registerCountry = window.BorderlyAutomation.registerCountry || function(countryCode, automation) {
    window.BorderlyAutomation.countries = window.BorderlyAutomation.countries || {};
    window.BorderlyAutomation.countries[countryCode] = automation;
  };

  window.BorderlyAutomation.registerCountry('MYS', window.BorderlyAutomation.Malaysia);

  if (window.BorderlyAutomation.Malaysia.isSupported()) {
    console.log('Malaysia MDAC automation script loaded and ready');
  }

})();
