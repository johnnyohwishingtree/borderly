/**
 * Singapore SG Arrival Card Automation Script
 *
 * Automates form filling for Singapore's SG Arrival Card portal
 * (https://eservices.ica.gov.sg/sgarrivalcard)
 *
 * Portal flow (no account required, single-session multi-section form):
 *   Step 1 - Access SG Arrival Card portal
 *   Step 2 - Personal details
 *   Step 3 - Travel information
 *   Step 4 - Accommodation details
 *   Step 5 - Health declaration
 *   Step 6 - Customs declaration
 *   Step 7 - Submit and save confirmation
 *
 * NOTE: Selectors are based on DOM inspection of the portal as of 2025-06-01.
 * Run validateSelectors() to confirm they are still valid before use.
 * Last verified: 2025-06-01
 */

(function () {
  'use strict';

  if (!window.BorderlyAutomation || !window.BorderlyAutomation._loaded) {
    console.error('Borderly common automation utilities not loaded');
    return;
  }

  window.BorderlyAutomation.Singapore = {

    /** Portal entry URL */
    portalUrl: 'https://eservices.ica.gov.sg/sgarrivalcard',

    /**
     * Field ID → CSS selector mapping.
     * Each value is a comma-separated fallback chain (tried left-to-right).
     * Mirrors the portalSelector values in src/schemas/SGP.json.
     */
    fieldMappings: {
      surname:               '[name="familyName"], #familyName, [name="lastName"], #surname, [id="family-name"]',
      givenNames:            '[name="givenName"], #givenName, [name="firstName"], [id="given-name"], [id="first-name"]',
      dateOfBirth:           '[name="dateOfBirth"], #dateOfBirth, [name="dob"], [name="birthDate"], [id="date-of-birth"]',
      nationality:           '[name="nationality"], #nationality, select[name*="nation"], [name="nationalityCode"]',
      passportNumber:        '[name="passportNo"], #passportNo, [name="passportNumber"], [id="passport-number"]',
      passportExpiry:        '[name="passportExpiryDate"], #passportExpiryDate, [name="expiryDate"], [name="passportExpiry"], [id="passport-expiry"]',
      gender:                '[name="sex"], #sex, [name="gender"], #gender, select[name*="sex"]',
      email:                 '[name="email"], #email, [type="email"], [name="emailAddress"]',
      phoneNumber:           '[name="mobileNo"], #mobileNo, [name="phoneNumber"], [name="mobile"], [id="mobile-number"]',
      arrivalDate:           '[name="arrivalDate"], #arrivalDate, [name="dateOfArrival"], [id="arrival-date"]',
      arrivalTime:           '[name="arrivalTime"], #arrivalTime, [name="eta"], [id="arrival-time"]',
      flightNumber:          '[name="flightNo"], #flightNo, [name="flightNumber"], [name="vesselNo"], [id="flight-number"]',
      airlineCode:           '[name="airline"], #airline, [name="airlineCode"], [name="airlineName"], [id="airline-code"]',
      departureCity:         '[name="lastPort"], #lastPort, [name="departureCity"], [name="embarkationPort"], [id="departure-city"]',
      purposeOfVisit:        '[name="purposeOfVisit"], #purposeOfVisit, select[name*="purpose"], [name="visitPurpose"]',
      intendedLengthOfStay:  '[name="intendedDuration"], #intendedDuration, [name="lengthOfStay"], [name="stayDuration"], [id="length-of-stay"]',
      accommodationType:     '[name="accommodationType"], #accommodationType, select[name*="accom"], [name="lodgingType"]',
      accommodationName:     '[name="accommodationName"], #accommodationName, [name="hotelName"], [id="accommodation-name"]',
      accommodationAddress:  'textarea[name="accommodationAddress"], #accommodationAddress, textarea[name*="address"], textarea[name="address"]',
      accommodationPhone:    '[name="accommodationPhone"], #accommodationPhone, [name="hotelPhone"], [id="accommodation-phone"]',
      feverSymptoms:         '[name="hasFeverSymptoms"], input[name*="fever"], [id="fever-symptoms"], input[name*="symptom"]',
      infectiousDisease:     '[name="hasInfectiousDisease"], input[name*="infectious"], [id="infectious-disease"]',
      visitedOutbreakArea:   '[name="visitedOutbreakArea"], input[name*="outbreak"], [id="outbreak-area"]',
      contactWithInfected:   '[name="contactWithInfected"], input[name*="contact"], [id="contact-infected"]',
      exceedsAllowance:      '[name="exceedsAllowance"], input[name*="duty"], [id="exceeds-allowance"], [name="exceedsDutyFree"]',
      carryingCash:          '[name="carryingCash"], input[name*="cash"], [id="carrying-cash"], input[name*="currency"]',
      prohibitedGoods:       '[name="prohibitedGoods"], input[name*="prohibited"], [id="prohibited-goods"]',
      commercialGoods:       '[name="commercialGoods"], input[name*="commercial"], [id="commercial-goods"]'
    },

    /**
     * Page detectors — identify which section of the SG Arrival Card is active.
     * The SG Arrival Card is typically a single-page multi-section form.
     */
    pageDetectors: {
      landing: {
        urlPattern: /\/sgarrivalcard\/?$/i,
        domSelector: '.sgac-intro, .ica-start, .arrival-card-start, #start-sgac',
        stepOrder: 1,
        description: 'SG Arrival Card landing page'
      },
      personal_details: {
        urlPattern: /\/sgarrivalcard\/(personal|step-?1|traveller)/i,
        domSelector: '[name="familyName"], [name="passportNo"], .personal-details-section',
        stepOrder: 2,
        description: 'Personal details section'
      },
      travel_information: {
        urlPattern: /\/sgarrivalcard\/(travel|step-?2|flight)/i,
        domSelector: '[name="arrivalDate"], [name="flightNo"], .travel-info-section',
        stepOrder: 3,
        description: 'Travel information section'
      },
      accommodation_details: {
        urlPattern: /\/sgarrivalcard\/(accommodation|step-?3|hotel)/i,
        domSelector: '[name="accommodationType"], [name="accommodationName"], .accommodation-section',
        stepOrder: 4,
        description: 'Accommodation details section'
      },
      health_declaration: {
        urlPattern: /\/sgarrivalcard\/(health|step-?4|declaration)/i,
        domSelector: '[name="hasFeverSymptoms"], input[name*="fever"], .health-declaration-section',
        stepOrder: 5,
        description: 'Health declaration section'
      },
      customs_declaration: {
        urlPattern: /\/sgarrivalcard\/(customs|step-?5|goods)/i,
        domSelector: '[name="exceedsAllowance"], [name="carryingCash"], .customs-section',
        stepOrder: 6,
        description: 'Customs declaration section'
      },
      confirmation: {
        urlPattern: /\/sgarrivalcard\/(confirm|submit|done|success)/i,
        domSelector: '.confirmation, .submission-receipt, #confirmation-id, .sgac-success',
        stepOrder: 7,
        description: 'Submission confirmation'
      }
    },

    /** Selector for the primary submit / next button on each portal page */
    submitButtonSelector: 'button[type="submit"], #submit-card, .submit-btn, .btn-next, [id*="next"], [id*="submit"]',

    // -------------------------------------------------------------------------
    // Main orchestrator
    // -------------------------------------------------------------------------

    automate: function (formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function (resolve, reject) {
        window.BorderlyAutomation.Page.waitForReady()
          .then(function () { return self.detectCurrentStep(); })
          .then(function (step) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('Singapore SGAC step detected', true, { step: step });
            }
            return self.handleStep(step, formData, options);
          })
          .then(function (result) {
            resolve({ success: result.success, step: result.step, nextAction: result.nextAction });
          })
          .catch(function (err) {
            reject(window.BorderlyAutomation.Error.captureContext(err));
          });
      });
    },

    // -------------------------------------------------------------------------
    // Step detection
    // -------------------------------------------------------------------------

    detectCurrentStep: function () {
      var self = this;
      return new Promise(function (resolve) {
        var url = window.location.href;
        for (var key in self.pageDetectors) {
          if (!Object.prototype.hasOwnProperty.call(self.pageDetectors, key)) { continue; }
          var detector = self.pageDetectors[key];
          if (detector.urlPattern && detector.urlPattern.test(url)) {
            resolve(key);
            return;
          }
          if (detector.domSelector && document.querySelector(detector.domSelector)) {
            resolve(key);
            return;
          }
        }
        resolve('unknown');
      });
    },

    // -------------------------------------------------------------------------
    // Step dispatcher
    // -------------------------------------------------------------------------

    handleStep: function (step, formData, options) {
      var self = this;
      return new Promise(function (resolve) {
        var handlers = {
          landing:               function () { return self.handleLanding(formData, options); },
          personal_details:      function () { return self.fillPersonalDetails(formData, options); },
          travel_information:    function () { return self.fillTravelInformation(formData, options); },
          accommodation_details: function () { return self.fillAccommodationDetails(formData, options); },
          health_declaration:    function () { return self.fillHealthDeclaration(formData, options); },
          customs_declaration:   function () { return self.fillCustomsDeclaration(formData, options); },
          confirmation:          function () { return self.handleConfirmation(formData, options); }
        };

        var handler = handlers[step];
        if (!handler) {
          console.warn('Singapore SGAC: unknown step', step);
          resolve({ success: false, step: step, nextAction: 'manual_intervention_required' });
          return;
        }

        handler().then(function (success) {
          resolve({ success: success, step: step, nextAction: success ? 'proceed' : 'manual_intervention_required' });
        }).catch(function () {
          resolve({ success: false, step: step, nextAction: 'manual_intervention_required' });
        });
      });
    },

    // -------------------------------------------------------------------------
    // Step handlers
    // -------------------------------------------------------------------------

    handleLanding: function (formData, options) {
      return new Promise(function (resolve) {
        var startBtn = document.querySelector('.sgac-intro button, #start-sgac, .btn-start, a[href*="personal"]');
        if (startBtn) {
          if (options && !options.testMode) {
            window.BorderlyAutomation.Click.smartClick(startBtn)
              .then(function () { setTimeout(function () { resolve(true); }, 2000); })
              .catch(function () { resolve(false); });
          } else {
            resolve(true);
          }
        } else {
          resolve(false);
        }
      });
    },

    fillPersonalDetails: function (formData, options) {
      var self = this;
      return new Promise(function (resolve) {
        var fields = [
          { id: 'surname',        key: 'surname' },
          { id: 'givenNames',     key: 'givenNames' },
          { id: 'dateOfBirth',    key: 'dateOfBirth' },
          { id: 'nationality',    key: 'nationality' },
          { id: 'passportNumber', key: 'passportNumber' },
          { id: 'passportExpiry', key: 'passportExpiry' },
          { id: 'gender',         key: 'gender' },
          { id: 'email',          key: 'email' },
          { id: 'phoneNumber',    key: 'phoneNumber' }
        ];
        self._fillFieldSet(fields, formData, options).then(function (count) {
          self._clickNext(count, options).then(function () { resolve(count > 0); });
        });
      });
    },

    fillTravelInformation: function (formData, options) {
      var self = this;
      return new Promise(function (resolve) {
        var fields = [
          { id: 'arrivalDate',           key: 'arrivalDate' },
          { id: 'arrivalTime',           key: 'arrivalTime' },
          { id: 'flightNumber',          key: 'flightNumber' },
          { id: 'airlineCode',           key: 'airlineCode' },
          { id: 'departureCity',         key: 'departureCity' },
          { id: 'purposeOfVisit',        key: 'purposeOfVisit' },
          { id: 'intendedLengthOfStay',  key: 'intendedLengthOfStay' }
        ];
        self._fillFieldSet(fields, formData, options).then(function (count) {
          self._clickNext(count, options).then(function () { resolve(count > 0); });
        });
      });
    },

    fillAccommodationDetails: function (formData, options) {
      var self = this;
      return new Promise(function (resolve) {
        var fields = [
          { id: 'accommodationType',    key: 'accommodationType' },
          { id: 'accommodationName',    key: 'accommodationName' },
          { id: 'accommodationAddress', key: 'accommodationAddress' },
          { id: 'accommodationPhone',   key: 'accommodationPhone' }
        ];
        self._fillFieldSet(fields, formData, options).then(function (count) {
          self._clickNext(count, options).then(function () { resolve(count > 0); });
        });
      });
    },

    fillHealthDeclaration: function (formData, options) {
      var self = this;
      return new Promise(function (resolve) {
        var fields = [
          { id: 'feverSymptoms',       key: 'feverSymptoms' },
          { id: 'infectiousDisease',   key: 'infectiousDisease' },
          { id: 'visitedOutbreakArea', key: 'visitedOutbreakArea' },
          { id: 'contactWithInfected', key: 'contactWithInfected' }
        ];
        self._fillFieldSet(fields, formData, options).then(function (count) {
          self._clickNext(count, options).then(function () { resolve(count > 0); });
        });
      });
    },

    fillCustomsDeclaration: function (formData, options) {
      var self = this;
      return new Promise(function (resolve) {
        var fields = [
          { id: 'exceedsAllowance', key: 'exceedsAllowance' },
          { id: 'carryingCash',     key: 'carryingCash' },
          { id: 'prohibitedGoods',  key: 'prohibitedGoods' },
          { id: 'commercialGoods',  key: 'commercialGoods' }
        ];
        self._fillFieldSet(fields, formData, options).then(function (count) {
          // Final declaration step — trigger submit
          if (!options.testMode) {
            var submitBtn = document.querySelector(self.submitButtonSelector);
            if (submitBtn && count > 0) {
              window.BorderlyAutomation.Click.smartClick(submitBtn)
                .then(function () { setTimeout(function () { resolve(true); }, 3000); })
                .catch(function () { resolve(count > 0); });
              return;
            }
          }
          resolve(count > 0);
        });
      });
    },

    handleConfirmation: function (formData, options) {
      return new Promise(function (resolve) {
        var confirmEl = document.querySelector('.confirmation, #confirmation-id, .submission-receipt, .sgac-success');
        if (confirmEl) {
          if (options && options.debug) {
            window.BorderlyAutomation.Debug.logStep('Singapore SGAC confirmed', true, {
              text: confirmEl.textContent.trim().substring(0, 100)
            });
          }
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'singapore_sgac_confirmation',
              data: { confirmationText: confirmEl.textContent.trim() }
            }));
          }
          resolve(true);
        } else {
          resolve(false);
        }
      });
    },

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    _fillFieldSet: function (fieldDefs, formData, options) {
      var self = this;
      return new Promise(function (resolve) {
        var filled = 0;
        var tasks = fieldDefs.map(function (def) {
          return new Promise(function (res) {
            var value = self._getValue(formData, def.key);
            if (value === null || value === undefined) { res(); return; }
            var selector = self.fieldMappings[def.id];
            if (!selector) { res(); return; }
            var element = window.BorderlyAutomation.DOM.findElement({ selector: selector });
            if (!element) { res(); return; }
            window.BorderlyAutomation.Form.fillField(element, value).then(function (ok) {
              if (ok) {
                filled++;
                if (options && options.debug) {
                  window.BorderlyAutomation.Debug.highlightElement(element, 800);
                }
              }
              res();
            }).catch(res);
          });
        });

        Promise.all(tasks).then(function () { resolve(filled); });
      });
    },

    _clickNext: function (filledCount, options) {
      var self = this;
      return new Promise(function (resolve) {
        if (!filledCount || (options && options.testMode)) { resolve(); return; }
        var btn = document.querySelector(self.submitButtonSelector);
        if (!btn) { resolve(); return; }
        window.BorderlyAutomation.Click.smartClick(btn).then(function () {
          setTimeout(resolve, 2000);
        }).catch(resolve);
      });
    },

    _getValue: function (obj, key) {
      if (!obj || !key) { return null; }
      return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : null;
    },

    isSupported: function () {
      return window.location.href.includes('ica.gov.sg') ||
        window.location.href.includes('sgarrivalcard');
    }
  };

  // Register
  window.BorderlyAutomation.registerCountry = window.BorderlyAutomation.registerCountry || function (code, automation) {
    window.BorderlyAutomation.countries = window.BorderlyAutomation.countries || {};
    window.BorderlyAutomation.countries[code] = automation;
  };
  window.BorderlyAutomation.registerCountry('SGP', window.BorderlyAutomation.Singapore);

  if (window.BorderlyAutomation.Singapore.isSupported()) {
    console.log('Singapore SGAC automation script loaded and ready');
  }

})();
