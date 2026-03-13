/**
 * Japan Visit Japan Web (VJW) Automation Script
 *
 * Automates form filling for the Visit Japan Web portal (https://vjw-lp.digital.go.jp/en/)
 * This script handles the multi-step process: account creation → personal details →
 * trip registration → accommodation → customs declaration → QR code.
 *
 * NOTE: Selectors were mapped from the VJW portal as of 2025-06-01.
 * The portal uses a React-based SPA; field selectors rely primarily on `name`
 * attributes and label text, as class names may change on portal updates.
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
   * Portal URL for Visit Japan Web
   * @type {string}
   */
  const portalUrl = 'https://vjw-lp.digital.go.jp/en/';

  /**
   * Field mappings: schema field ID → multi-strategy selector criteria
   * Each entry uses the findElement() criteria format from common.js:
   *   { selector, id, name, label, placeholder, nearbyText }
   *
   * Strategies are tried in order until one succeeds. This resilience is
   * especially important for React SPAs where the DOM may re-render.
   *
   * @type {Object.<string, {selector?: string, id?: string, name?: string, label?: string, nearbyText?: string}>}
   */
  const fieldMappings = {
    // Personal Information (Step 2 - Register Your Details)
    surname: {
      selector: "input[name='familyName'], #familyName",
      name: 'familyName',
      label: 'Last Name',
      nearbyText: 'Family Name'
    },
    givenNames: {
      selector: "input[name='givenName'], #givenName",
      name: 'givenName',
      label: 'First Name',
      nearbyText: 'Given Name'
    },
    dateOfBirth: {
      selector: "input[name='birthDate'], #birthDate",
      name: 'birthDate',
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
      selector: "input[name='documentNo'], #documentNo",
      name: 'documentNo',
      label: 'Passport Number',
      nearbyText: 'Document No'
    },
    gender: {
      selector: "select[name='sex'], #sex",
      name: 'sex',
      label: 'Sex',
      nearbyText: 'Sex'
    },

    // Travel Information (Step 3 - Register Your Trip)
    arrivalDate: {
      selector: "input[name='scheduledArrivalDate'], #scheduledArrivalDate",
      name: 'scheduledArrivalDate',
      label: 'Scheduled Arrival Date',
      nearbyText: 'Arrival Date'
    },
    flightNumber: {
      selector: "input[name='flightNo'], #flightNo",
      name: 'flightNo',
      label: 'Flight Number',
      nearbyText: 'Flight No'
    },
    airlineCode: {
      selector: "input[name='airlineCode'], #airlineCode",
      name: 'airlineCode',
      label: 'Airline Code',
      nearbyText: 'Airline'
    },
    departureCity: {
      selector: "input[name='departureCity'], #departureCity",
      name: 'departureCity',
      label: 'Departure City',
      nearbyText: 'City of Departure'
    },
    purposeOfVisit: {
      selector: "select[name='purpose'], #purpose",
      name: 'purpose',
      label: 'Purpose of Visit',
      nearbyText: 'Purpose'
    },
    durationOfStay: {
      selector: "input[name='stayDuration'], #stayDuration",
      name: 'stayDuration',
      label: 'Number of Days',
      nearbyText: 'Duration of Stay'
    },

    // Accommodation (Step 4 - Enter Accommodation)
    hotelName: {
      selector: "input[name='stayPlaceName'], #stayPlaceName",
      name: 'stayPlaceName',
      label: 'Name of Place of Stay',
      nearbyText: 'Place of Stay'
    },
    hotelAddress: {
      selector: "input[name='stayPlaceAddress'], #stayPlaceAddress",
      name: 'stayPlaceAddress',
      label: 'Address of Place of Stay',
      nearbyText: 'Address of Stay'
    },
    hotelPhone: {
      selector: "input[name='stayPlaceTel'], #stayPlaceTel",
      name: 'stayPlaceTel',
      label: 'Phone Number of Place of Stay',
      nearbyText: 'Phone'
    },

    // Customs Declarations (Step 5 - Immigration & Customs Declaration)
    carryingProhibitedItems: {
      selector: "input[name='declaration1']",
      name: 'declaration1',
      label: 'Carrying prohibited or restricted items',
      nearbyText: 'prohibited'
    },
    currencyOver1M: {
      selector: "input[name='declaration2']",
      name: 'declaration2',
      label: 'Carrying cash or securities exceeding 1 million yen',
      nearbyText: '1,000,000'
    },
    commercialGoods: {
      selector: "input[name='declaration3']",
      name: 'declaration3',
      label: 'Carrying commercial goods or samples',
      nearbyText: 'commercial'
    },
    meatProducts: {
      selector: "input[name='declaration4']",
      name: 'declaration4',
      label: 'Carrying meat or meat products',
      nearbyText: 'meat'
    },
    plantProducts: {
      selector: "input[name='declaration5']",
      name: 'declaration5',
      label: 'Carrying plants, fruits or vegetables',
      nearbyText: 'plant'
    },
    itemsToDeclareDuty: {
      selector: "input[name='declaration6']",
      name: 'declaration6',
      label: 'Carrying items exceeding duty-free allowance',
      nearbyText: 'duty-free'
    }
  };

  /**
   * Page detectors: map portal step IDs to detection functions.
   * Each function returns true when the current portal page matches that step.
   * Steps correspond to submissionGuide order values in JPN.json.
   *
   * @type {Object.<string, function(): boolean>}
   */
  const pageDetectors = {
    /**
     * Step 1: Account creation page
     * URL contains 'register' or email/password inputs are present
     */
    account_creation: function() {
      const url = window.location.href.toLowerCase();
      return (
        url.includes('/register') ||
        url.includes('/signup') ||
        (!!document.querySelector('input[name="email"]') &&
         !!document.querySelector('input[name="password"]') &&
         !document.querySelector("input[name='familyName']"))
      );
    },

    /**
     * Step 2: Register personal details (passport info)
     * Detected by presence of familyName or documentNo fields
     */
    personal_info: function() {
      return (
        !!document.querySelector("input[name='familyName']") ||
        !!document.querySelector("input[name='documentNo']") ||
        !!document.querySelector('#familyName')
      );
    },

    /**
     * Step 3: Trip registration (flight + travel details)
     * Detected by presence of scheduledArrivalDate or flightNo fields
     */
    trip_registration: function() {
      return (
        !!document.querySelector("input[name='scheduledArrivalDate']") ||
        !!document.querySelector("input[name='flightNo']") ||
        !!document.querySelector('#scheduledArrivalDate')
      );
    },

    /**
     * Step 4: Accommodation entry
     * Detected by presence of stayPlaceName field
     */
    accommodation: function() {
      return (
        !!document.querySelector("input[name='stayPlaceName']") ||
        !!document.querySelector('#stayPlaceName')
      );
    },

    /**
     * Step 5: Customs/immigration declaration
     * Detected by presence of declaration radio buttons
     */
    customs_declaration: function() {
      return (
        !!document.querySelector("input[name='declaration1']") ||
        !!document.querySelector("input[name='declaration2']")
      );
    },

    /**
     * Step 6: QR code display page
     * Detected by presence of QR code image or success/completion indicators
     */
    qr_code: function() {
      return (
        !!document.querySelector('.qr-code') ||
        !!document.querySelector('#qr-code') ||
        !!document.querySelector('canvas[class*="qr"]') ||
        !!document.querySelector('img[alt*="QR"]') ||
        (window.location.href.toLowerCase().includes('complete') &&
         !!document.querySelector('canvas'))
      );
    }
  };

  /**
   * Submit button selector for each step.
   * VJW uses different submit patterns per page.
   * @type {string}
   */
  const submitButtonSelector = [
    'button[type="submit"]',
    '.vjw-btn-primary',
    '.btn-next',
    'button.next',
    '#next-btn',
    'input[type="submit"]'
  ].join(', ');

  // Japan Visit Japan Web specific automation
  window.BorderlyAutomation.Japan = {

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
              window.BorderlyAutomation.Debug.logStep('Japan VJW automation started', true, {
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
     * Detect current step in the Visit Japan Web process
     */
    detectCurrentStep: function() {
      return new Promise(function(resolve) {
        if (pageDetectors.qr_code()) {
          resolve('qr_code');
        } else if (pageDetectors.customs_declaration()) {
          resolve('customs_declaration');
        } else if (pageDetectors.accommodation()) {
          resolve('accommodation');
        } else if (pageDetectors.trip_registration()) {
          resolve('trip_registration');
        } else if (pageDetectors.personal_info()) {
          resolve('personal_info');
        } else if (pageDetectors.account_creation()) {
          resolve('account_creation');
        } else {
          resolve('unknown');
        }
      });
    },

    /**
     * Handle specific step in the process
     */
    handleStep: function(step, formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function(resolve) {
        (async function() {
          try {
            var result = false;
            switch (step) {
              case 'account_creation':
                result = await self.handleAccountCreation(formData, options);
                break;
              case 'personal_info':
                result = await self.fillPersonalInfo(formData, options);
                break;
              case 'trip_registration':
                result = await self.fillTripRegistration(formData, options);
                break;
              case 'accommodation':
                result = await self.fillAccommodation(formData, options);
                break;
              case 'customs_declaration':
                result = await self.fillCustomsDeclaration(formData, options);
                break;
              case 'qr_code':
                result = await self.handleQRCode(formData, options);
                break;
              default:
                console.warn('Unknown Japan VJW step:', step);
                result = false;
            }
            resolve(result);
          } catch (error) {
            console.error('Error handling Japan VJW step:', error);
            resolve(false);
          }
        })();
      });
    },

    /**
     * Handle account creation step
     * VJW requires a free account — manual email verification is required
     */
    handleAccountCreation: function(formData, options) {
      options = options || {};
      return new Promise(function(resolve) {
        // Account creation requires email verification — manual intervention needed
        if (options.debug) {
          window.BorderlyAutomation.Debug.logStep('VJW account creation page', true, {
            message: 'Manual account creation required. Register with your email at vjw-lp.digital.go.jp/en/'
          });
        }
        resolve(false); // Manual intervention required
      });
    },

    /**
     * Fill personal information (passport details)
     * Corresponds to submission guide Step 2: "Register Your Details"
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
              { criteria: fieldMappings.gender, key: 'gender' }
            ];

            var successCount = await self._fillFields(fieldsToFill, formData, options);

            if (successCount > 0 && !options.testMode) {
              var nextBtn = document.querySelector(submitButtonSelector);
              if (nextBtn) {
                await window.BorderlyAutomation.Click.smartClick(nextBtn);
                await window.BorderlyAutomation.Page.waitForNavigation();
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
     * Fill trip registration fields
     * Corresponds to submission guide Step 3: "Register Your Trip"
     */
    fillTripRegistration: function(formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function(resolve) {
        (async function() {
          try {
            var fieldsToFill = [
              { criteria: fieldMappings.arrivalDate, key: 'arrivalDate' },
              { criteria: fieldMappings.flightNumber, key: 'flightNumber' },
              { criteria: fieldMappings.airlineCode, key: 'airlineCode' },
              { criteria: fieldMappings.departureCity, key: 'departureCity' },
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
     * Fill accommodation fields
     * Corresponds to submission guide Step 4: "Enter Accommodation"
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
     * Fill customs declaration fields
     * Corresponds to submission guide Step 5: "Complete Immigration & Customs Declaration"
     * Most tourists should answer No (false) to all questions.
     */
    fillCustomsDeclaration: function(formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function(resolve) {
        (async function() {
          try {
            var fieldsToFill = [
              { criteria: fieldMappings.carryingProhibitedItems, key: 'carryingProhibitedItems' },
              { criteria: fieldMappings.currencyOver1M, key: 'currencyOver1M' },
              { criteria: fieldMappings.commercialGoods, key: 'commercialGoods' },
              { criteria: fieldMappings.meatProducts, key: 'meatProducts' },
              { criteria: fieldMappings.plantProducts, key: 'plantProducts' },
              { criteria: fieldMappings.itemsToDeclareDuty, key: 'itemsToDeclareDuty' }
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
     * Handle QR code page — extract and send QR code to React Native
     * Corresponds to submission guide Step 6: "Get Your QR Code"
     */
    handleQRCode: function(formData, options) {
      options = options || {};
      return new Promise(function(resolve) {
        (async function() {
          try {
            var qrCanvas = document.querySelector('canvas');
            var qrImg = document.querySelector('.qr-code img, #qr-code img, img[alt*="QR"]');

            if (qrCanvas || qrImg) {
              if (options.debug) {
                window.BorderlyAutomation.Debug.logStep('VJW QR code detected', true, {
                  hasCanvas: !!qrCanvas,
                  hasImg: !!qrImg
                });
              }

              var result = {};

              if (qrCanvas) {
                // Extract QR code data URL from canvas
                try {
                  result.qrCodeDataUrl = qrCanvas.toDataURL('image/png');
                } catch (e) {
                  // Canvas may be tainted (cross-origin) — use screenshot instead
                  result.qrCodeDataUrl = null;
                }
              }

              if (qrImg) {
                result.qrCodeUrl = qrImg.src;
              }

              // Notify React Native app
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'japan_vjw_qr_code',
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
     * @param {Array<{criteria: Object, key: string}>} fieldsToFill
     * @param {Object} formData - flat or nested form data
     * @param {Object} options
     * @returns {Promise<number>} count of successfully filled fields
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
        url.includes('vjw-lp.digital.go.jp') ||
        url.includes('visit-japan-web') ||
        url.includes('vjw')
      );
    }
  };

  // Register Japan automation
  window.BorderlyAutomation.registerCountry = window.BorderlyAutomation.registerCountry || function(countryCode, automation) {
    window.BorderlyAutomation.countries = window.BorderlyAutomation.countries || {};
    window.BorderlyAutomation.countries[countryCode] = automation;
  };

  window.BorderlyAutomation.registerCountry('JPN', window.BorderlyAutomation.Japan);

  if (window.BorderlyAutomation.Japan.isSupported()) {
    console.log('Japan Visit Japan Web automation script loaded and ready');
  }

})();
