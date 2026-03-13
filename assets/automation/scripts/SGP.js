/**
 * Singapore SG Arrival Card (SGAC) Automation Script
 *
 * Automates form filling for the Singapore ICA SG Arrival Card portal
 * (https://eservices.ica.gov.sg/sgarrivalcard)
 * This script handles the multi-section form: personal details → travel info →
 * accommodation → health declaration → customs declaration → submit.
 *
 * NOTE: No account creation required — the form is completed in a single session.
 * Selectors were mapped from the SG Arrival Card portal as of 2025-06-01.
 * The portal uses a React-based SPA at eservices.ica.gov.sg; field selectors
 * rely on `name` attributes, label text, and nearbyText matching.
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
   * Portal URL for Singapore SG Arrival Card
   * @type {string}
   */
  var portalUrl = 'https://eservices.ica.gov.sg/sgarrivalcard';

  /**
   * Field mappings: schema field ID → multi-strategy selector criteria
   * Each entry uses the findElement() criteria format from common.js.
   * Multiple selectors separated by comma act as fallbacks.
   *
   * @type {Object.<string, {selector?: string, id?: string, name?: string, label?: string, nearbyText?: string}>}
   */
  var fieldMappings = {
    // Personal Information (Section 1)
    surname: {
      selector: "input[name='surname'], #surname, input[name='familyName']",
      name: 'surname',
      label: 'Family Name/Surname',
      nearbyText: 'Surname'
    },
    givenNames: {
      selector: "input[name='givenName'], #givenName, input[name='firstName']",
      name: 'givenName',
      label: 'Given Name',
      nearbyText: 'Given Name'
    },
    dateOfBirth: {
      selector: "input[name='dateOfBirth'], #dateOfBirth, input[name='dob']",
      name: 'dateOfBirth',
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
      selector: "input[name='passportNumber'], #passportNumber, input[name='passportNo']",
      name: 'passportNumber',
      label: 'Passport Number',
      nearbyText: 'Passport'
    },
    passportExpiry: {
      selector: "input[name='passportExpiryDate'], #passportExpiryDate, input[name='passportExpiry']",
      name: 'passportExpiryDate',
      label: 'Passport Expiry Date',
      nearbyText: 'Expiry'
    },
    gender: {
      selector: "select[name='sex'], #sex, select[name='gender']",
      name: 'sex',
      label: 'Sex',
      nearbyText: 'Sex'
    },
    email: {
      selector: "input[name='email'], input[type='email'], #email",
      name: 'email',
      label: 'Email Address',
      nearbyText: 'Email'
    },
    phoneNumber: {
      selector: "input[name='mobileNumber'], #mobileNumber, input[type='tel']",
      name: 'mobileNumber',
      label: 'Mobile Number',
      nearbyText: 'Mobile'
    },

    // Travel Information (Section 2)
    arrivalDate: {
      selector: "input[name='arrivalDate'], #arrivalDate, input[name='dateOfArrival']",
      name: 'arrivalDate',
      label: 'Arrival Date',
      nearbyText: 'Arrival Date'
    },
    arrivalTime: {
      selector: "input[name='arrivalTime'], #arrivalTime, input[name='eta']",
      name: 'arrivalTime',
      label: 'Estimated Time of Arrival',
      nearbyText: 'Arrival Time'
    },
    flightNumber: {
      selector: "input[name='flightNumber'], #flightNumber, input[name='flightNo']",
      name: 'flightNumber',
      label: 'Flight Number',
      nearbyText: 'Flight'
    },
    airlineCode: {
      selector: "input[name='airlineCode'], #airlineCode, select[name='airline']",
      name: 'airlineCode',
      label: 'Airline',
      nearbyText: 'Airline'
    },
    departureCity: {
      selector: "input[name='portOfEmbarkation'], #portOfEmbarkation, input[name='departureCity']",
      name: 'portOfEmbarkation',
      label: 'Port of Embarkation',
      nearbyText: 'Last Departure'
    },
    purposeOfVisit: {
      selector: "select[name='purposeOfVisit'], #purposeOfVisit, select[name='visitPurpose']",
      name: 'purposeOfVisit',
      label: 'Purpose of Visit',
      nearbyText: 'Purpose'
    },
    intendedLengthOfStay: {
      selector: "input[name='intendedDuration'], #intendedDuration, input[name='intendedLengthOfStay']",
      name: 'intendedDuration',
      label: 'Intended Duration of Stay',
      nearbyText: 'Length of Stay'
    },

    // Accommodation Details (Section 3)
    accommodationType: {
      selector: "select[name='accommodationType'], #accommodationType, select[name='stayType']",
      name: 'accommodationType',
      label: 'Type of Accommodation',
      nearbyText: 'Accommodation Type'
    },
    accommodationName: {
      selector: "input[name='accommodationName'], #accommodationName, input[name='hotelName']",
      name: 'accommodationName',
      label: 'Name of Accommodation',
      nearbyText: 'Accommodation Name'
    },
    accommodationAddress: {
      selector: "textarea[name='accommodationAddress'], #accommodationAddress, textarea[name='stayAddress']",
      name: 'accommodationAddress',
      label: 'Address of Accommodation',
      nearbyText: 'Address'
    },
    accommodationPhone: {
      selector: "input[name='accommodationContactNo'], #accommodationContactNo, input[name='accommodationPhone']",
      name: 'accommodationContactNo',
      label: 'Contact Number of Accommodation',
      nearbyText: 'Contact Number'
    },

    // Health Declaration (Section 4)
    feverSymptoms: {
      selector: "input[name='hasFever'], #hasFever, input[name='feverSymptoms']",
      name: 'hasFever',
      label: 'Fever or Flu-like Symptoms',
      nearbyText: 'fever'
    },
    infectiousDisease: {
      selector: "input[name='hasInfectiousDisease'], #hasInfectiousDisease, input[name='infectiousDisease']",
      name: 'hasInfectiousDisease',
      label: 'Infectious Disease',
      nearbyText: 'infectious disease'
    },
    visitedOutbreakArea: {
      selector: "input[name='visitedOutbreakArea'], #visitedOutbreakArea, input[name='outbreakAreaVisit']",
      name: 'visitedOutbreakArea',
      label: 'Visited Outbreak Area',
      nearbyText: 'outbreak'
    },
    contactWithInfected: {
      selector: "input[name='contactWithInfected'], #contactWithInfected, input[name='infectedContact']",
      name: 'contactWithInfected',
      label: 'Contact with Infected Person',
      nearbyText: 'close contact'
    },

    // Customs Declaration (Section 5)
    exceedsAllowance: {
      selector: "input[name='exceedsAllowance'], #exceedsAllowance, input[name='dutyFreeExcess']",
      name: 'exceedsAllowance',
      label: 'Goods Exceeding Duty-Free Allowance',
      nearbyText: 'duty-free'
    },
    carryingCash: {
      selector: "input[name='carryingCash'], #carryingCash, input[name='cashDeclaration']",
      name: 'carryingCash',
      label: 'Carrying Cash Exceeding S$20,000',
      nearbyText: 'S$20,000'
    },
    prohibitedGoods: {
      selector: "input[name='prohibitedGoods'], #prohibitedGoods, input[name='controlledGoods']",
      name: 'prohibitedGoods',
      label: 'Prohibited or Controlled Goods',
      nearbyText: 'prohibited'
    },
    commercialGoods: {
      selector: "input[name='commercialGoods'], #commercialGoods, input[name='goodsForSale']",
      name: 'commercialGoods',
      label: 'Commercial Goods',
      nearbyText: 'commercial'
    }
  };

  /**
   * Page detectors: map portal steps to detection functions.
   * SG Arrival Card is a single-page form with multiple sections visible at once,
   * but the ICA portal may show sections progressively. Detectors identify
   * which primary section is currently active/visible.
   *
   * @type {Object.<string, function(): boolean>}
   */
  var pageDetectors = {
    /**
     * Step 1: Landing / instructions page
     */
    landing: function() {
      var url = window.location.href.toLowerCase();
      return (
        (url.includes('sgarrivalcard') && !document.querySelector("input[name='surname']")) ||
        !!document.querySelector('.ica-landing') ||
        !!document.querySelector('.sgac-intro')
      );
    },

    /**
     * Step 2: Personal details section is active
     */
    personal_details: function() {
      return (
        !!document.querySelector("input[name='surname']") ||
        !!document.querySelector("input[name='givenName']") ||
        !!document.querySelector("input[name='passportNumber']")
      );
    },

    /**
     * Step 3: Travel information section is active
     */
    travel_info: function() {
      return (
        !!document.querySelector("input[name='arrivalDate']") ||
        !!document.querySelector("input[name='flightNumber']") ||
        !!document.querySelector("select[name='purposeOfVisit']")
      );
    },

    /**
     * Step 4: Accommodation details section
     */
    accommodation: function() {
      return (
        !!document.querySelector("select[name='accommodationType']") ||
        !!document.querySelector("input[name='accommodationName']")
      );
    },

    /**
     * Step 5: Health declaration section
     */
    health_declaration: function() {
      return (
        !!document.querySelector("input[name='hasFever']") ||
        !!document.querySelector("input[name='hasInfectiousDisease']") ||
        !!document.querySelector("input[name='visitedOutbreakArea']")
      );
    },

    /**
     * Step 6: Customs declaration section
     */
    customs_declaration: function() {
      return (
        !!document.querySelector("input[name='exceedsAllowance']") ||
        !!document.querySelector("input[name='carryingCash']") ||
        !!document.querySelector("input[name='prohibitedGoods']")
      );
    },

    /**
     * Step 7: Submission confirmation page
     */
    confirmation: function() {
      var url = window.location.href.toLowerCase();
      return (
        url.includes('/confirm') ||
        url.includes('/success') ||
        !!document.querySelector('.ica-confirmation') ||
        !!document.querySelector('.submission-success') ||
        !!document.querySelector('#submission-reference')
      );
    }
  };

  /**
   * Submit button selector for SG Arrival Card.
   * @type {string}
   */
  var submitButtonSelector = [
    '#submit-card',
    'button[type="submit"]',
    '.ica-btn-submit',
    '.sg-submit-btn',
    'input[type="submit"]',
    'button.submit'
  ].join(', ');

  // Singapore SG Arrival Card specific automation
  window.BorderlyAutomation.Singapore = {

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
              window.BorderlyAutomation.Debug.logStep('Singapore SGAC automation started', true, {
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
     * Detect current step in the SG Arrival Card process
     */
    detectCurrentStep: function() {
      return new Promise(function(resolve) {
        if (pageDetectors.confirmation()) {
          resolve('confirmation');
        } else if (pageDetectors.customs_declaration()) {
          resolve('customs_declaration');
        } else if (pageDetectors.health_declaration()) {
          resolve('health_declaration');
        } else if (pageDetectors.accommodation()) {
          resolve('accommodation');
        } else if (pageDetectors.travel_info()) {
          resolve('travel_info');
        } else if (pageDetectors.personal_details()) {
          resolve('personal_details');
        } else if (pageDetectors.landing()) {
          resolve('landing');
        } else {
          resolve('unknown');
        }
      });
    },

    /**
     * Handle specific step
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
              case 'personal_details':
                result = await self.fillPersonalDetails(formData, options);
                break;
              case 'travel_info':
                result = await self.fillTravelInfo(formData, options);
                break;
              case 'accommodation':
                result = await self.fillAccommodation(formData, options);
                break;
              case 'health_declaration':
                result = await self.fillHealthDeclaration(formData, options);
                break;
              case 'customs_declaration':
                result = await self.fillCustomsDeclaration(formData, options);
                break;
              case 'confirmation':
                result = await self.handleConfirmation(formData, options);
                break;
              default:
                console.warn('Unknown Singapore SGAC step:', step);
                result = false;
            }
            resolve(result);
          } catch (error) {
            console.error('Error handling Singapore SGAC step:', error);
            resolve(false);
          }
        })();
      });
    },

    /**
     * Handle landing page
     */
    handleLanding: function(formData, options) {
      options = options || {};
      return new Promise(function(resolve) {
        (async function() {
          try {
            // Look for "Apply Now" or "Submit Arrival Card" button
            var startBtn = document.querySelector(
              '.ica-apply-btn, #apply-now, a[href*="apply"], button.apply'
            );
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
     * Fill personal details
     * Corresponds to submission guide Step 2: "Personal Details"
     */
    fillPersonalDetails: function(formData, options) {
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
     * Fill travel information
     * Corresponds to submission guide Step 3: "Travel Information"
     */
    fillTravelInfo: function(formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function(resolve) {
        (async function() {
          try {
            var fieldsToFill = [
              { criteria: fieldMappings.arrivalDate, key: 'arrivalDate' },
              { criteria: fieldMappings.arrivalTime, key: 'arrivalTime' },
              { criteria: fieldMappings.flightNumber, key: 'flightNumber' },
              { criteria: fieldMappings.airlineCode, key: 'airlineCode' },
              { criteria: fieldMappings.departureCity, key: 'departureCity' },
              { criteria: fieldMappings.purposeOfVisit, key: 'purposeOfVisit' },
              { criteria: fieldMappings.intendedLengthOfStay, key: 'intendedLengthOfStay' }
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
     * Fill accommodation details
     * Corresponds to submission guide Step 4: "Accommodation Details"
     */
    fillAccommodation: function(formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function(resolve) {
        (async function() {
          try {
            var fieldsToFill = [
              { criteria: fieldMappings.accommodationType, key: 'accommodationType' },
              { criteria: fieldMappings.accommodationName, key: 'accommodationName' },
              { criteria: fieldMappings.accommodationAddress, key: 'accommodationAddress' },
              { criteria: fieldMappings.accommodationPhone, key: 'accommodationPhone' }
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
     * Fill health declaration
     * Corresponds to submission guide Step 5: "Health Declaration"
     */
    fillHealthDeclaration: function(formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function(resolve) {
        (async function() {
          try {
            var fieldsToFill = [
              { criteria: fieldMappings.feverSymptoms, key: 'feverSymptoms' },
              { criteria: fieldMappings.infectiousDisease, key: 'infectiousDisease' },
              { criteria: fieldMappings.visitedOutbreakArea, key: 'visitedOutbreakArea' },
              { criteria: fieldMappings.contactWithInfected, key: 'contactWithInfected' }
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
     * Fill customs declaration
     * Corresponds to submission guide Step 6: "Customs Declaration"
     */
    fillCustomsDeclaration: function(formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function(resolve) {
        (async function() {
          try {
            var fieldsToFill = [
              { criteria: fieldMappings.exceedsAllowance, key: 'exceedsAllowance' },
              { criteria: fieldMappings.carryingCash, key: 'carryingCash' },
              { criteria: fieldMappings.prohibitedGoods, key: 'prohibitedGoods' },
              { criteria: fieldMappings.commercialGoods, key: 'commercialGoods' }
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
     * Handle confirmation page — extract reference and notify React Native
     * Corresponds to submission guide Step 7: "Submit and Save Confirmation"
     */
    handleConfirmation: function(formData, options) {
      options = options || {};
      return new Promise(function(resolve) {
        (async function() {
          try {
            var referenceEl = document.querySelector(
              '#submission-reference, .ica-confirmation, .submission-success, .confirmation-ref'
            );

            if (referenceEl) {
              if (options.debug) {
                window.BorderlyAutomation.Debug.logStep('SGAC confirmation detected', true, {
                  hasReference: !!referenceEl
                });
              }

              var result = {};
              result.referenceNumber = referenceEl.textContent.trim();

              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'singapore_sgac_success',
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
        url.includes('eservices.ica.gov.sg') ||
        url.includes('sgarrivalcard')
      );
    }
  };

  // Register Singapore automation
  window.BorderlyAutomation.registerCountry = window.BorderlyAutomation.registerCountry || function(countryCode, automation) {
    window.BorderlyAutomation.countries = window.BorderlyAutomation.countries || {};
    window.BorderlyAutomation.countries[countryCode] = automation;
  };

  window.BorderlyAutomation.registerCountry('SGP', window.BorderlyAutomation.Singapore);

  if (window.BorderlyAutomation.Singapore.isSupported()) {
    console.log('Singapore SG Arrival Card automation script loaded and ready');
  }

})();
