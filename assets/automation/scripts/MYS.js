/**
 * Malaysia MDAC Automation Script
 *
 * Automates form filling for Malaysia's Digital Arrival Card portal
 * (https://imigresen-online.imi.gov.my/mdac/main)
 *
 * Portal flow (no account required):
 *   Step 1 - Access MDAC portal
 *   Step 2 - Enter personal information
 *   Step 3 - Travel details
 *   Step 4 - Accommodation information
 *   Step 5 - Health and declarations
 *   Step 6 - Submit and save confirmation
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

  window.BorderlyAutomation.Malaysia = {

    /** Portal entry URL */
    portalUrl: 'https://imigresen-online.imi.gov.my/mdac/main',

    /**
     * Field ID → CSS selector mapping.
     * Each value is a comma-separated fallback chain (tried left-to-right).
     * Mirrors the portalSelector values in src/schemas/MYS.json.
     */
    fieldMappings: {
      surname:               '[name="lastName"], #lastName, [name="familyName"], #surname, [id="family-name"]',
      givenNames:            '[name="firstName"], #firstName, [name="givenName"], [id="given-name"], [id="first-name"]',
      dateOfBirth:           '[name="dob"], #dob, [name="dateOfBirth"], [name="birthDate"], [id="date-of-birth"]',
      nationality:           '[name="nationality"], #nationality, select[name*="nation"], [name="citizenship"]',
      passportNumber:        '[name="passportNo"], #passportNo, [name="passportNumber"], [id="passport-number"]',
      passportExpiry:        '[name="passportExpiryDate"], #passportExpiryDate, [name="expiryDate"], [name="passportExpiry"], [id="passport-expiry"]',
      gender:                '[name="gender"], #gender, select[name*="sex"], [name="sex"]',
      email:                 '[name="email"], #email, [type="email"], [name="emailAddress"]',
      phoneNumber:           '[name="mobileNo"], #mobileNo, [name="phoneNumber"], [name="phone"], [id="phone-number"]',
      arrivalDate:           '[name="arrivalDate"], #arrivalDate, [name="dateOfArrival"], [id="arrival-date"]',
      arrivalAirport:        '[name="portOfEntry"], #portOfEntry, select[name*="port"], select[name*="airport"]',
      flightNumber:          '[name="flightNo"], #flightNo, [name="flightNumber"], [id="flight-number"]',
      purposeOfVisit:        '[name="purposeOfVisit"], #purposeOfVisit, select[name*="purpose"], [name="visitPurpose"]',
      durationOfStay:        '[name="duration"], #duration, [name="lengthOfStay"], [name="durationOfStay"], [id="duration-stay"]',
      hotelName:             '[name="hotelName"], #hotelName, [name="accommodationName"], [id="accommodation-name"]',
      hotelAddress:          'textarea[name="hotelAddress"], #hotelAddress, textarea[name*="address"], textarea[name="accommodationAddress"]',
      hotelPhone:            '[name="hotelPhone"], #hotelPhone, [name="accommodationPhone"], [id="hotel-phone"]',
      healthCondition:       '[name="hasHealthCondition"], input[name*="health"], [id="health-condition"]',
      visitedHighRiskCountries: '[name="visitedHighRisk"], input[name*="high-risk"], [id="high-risk-country"], input[name*="risk"]',
      carryingCurrency:      '[name="hasCurrency"], input[name*="currency"], [id="carrying-currency"], [name="currencyDeclaration"]',
      carryingProhibitedItems: '[name="hasProhibitedItems"], input[name*="prohibited"], [id="prohibited-items"]'
    },

    /**
     * Page detectors — identify which portal step is currently displayed.
     * MDAC is a multi-step form within the same session.
     */
    pageDetectors: {
      landing: {
        urlPattern: /\/mdac\/main/i,
        domSelector: '.mdac-start, .mdac-landing, #start-form, .arrival-card-intro',
        stepOrder: 1,
        description: 'MDAC landing / start page'
      },
      personal_information: {
        urlPattern: /\/mdac\/(personal|step-?1|traveller)/i,
        domSelector: '[name="lastName"], [name="familyName"], .personal-info-form',
        stepOrder: 2,
        description: 'Personal information entry'
      },
      travel_details: {
        urlPattern: /\/mdac\/(travel|step-?2|flight)/i,
        domSelector: '[name="portOfEntry"], [name="arrivalDate"], .travel-details-form',
        stepOrder: 3,
        description: 'Travel details'
      },
      accommodation: {
        urlPattern: /\/mdac\/(accommodation|step-?3|hotel)/i,
        domSelector: '[name="hotelName"], [name="accommodationName"], .accommodation-form',
        stepOrder: 4,
        description: 'Accommodation information'
      },
      health_declarations: {
        urlPattern: /\/mdac\/(health|step-?4|declaration)/i,
        domSelector: '[name="hasHealthCondition"], input[name*="health"], .health-form, .declaration-form',
        stepOrder: 5,
        description: 'Health and declarations'
      },
      confirmation: {
        urlPattern: /\/mdac\/(confirm|submit|done|success)/i,
        domSelector: '.confirmation, .success-message, .submission-receipt, #confirmation-number',
        stepOrder: 6,
        description: 'Submission confirmation'
      }
    },

    /** Selector for the primary submit / next button on each portal page */
    submitButtonSelector: 'button[type="submit"], .submit-btn, #submit-application, .btn-next, [id*="next"], [id*="submit"]',

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
              window.BorderlyAutomation.Debug.logStep('Malaysia MDAC step detected', true, { step: step });
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
          personal_information:  function () { return self.fillPersonalInformation(formData, options); },
          travel_details:        function () { return self.fillTravelDetails(formData, options); },
          accommodation:         function () { return self.fillAccommodation(formData, options); },
          health_declarations:   function () { return self.fillHealthDeclarations(formData, options); },
          confirmation:          function () { return self.handleConfirmation(formData, options); }
        };

        var handler = handlers[step];
        if (!handler) {
          console.warn('Malaysia MDAC: unknown step', step);
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
        var startBtn = document.querySelector('.mdac-start button, #start-form, .btn-start, a[href*="personal"]');
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

    fillPersonalInformation: function (formData, options) {
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

    fillTravelDetails: function (formData, options) {
      var self = this;
      return new Promise(function (resolve) {
        var fields = [
          { id: 'arrivalDate',    key: 'arrivalDate' },
          { id: 'arrivalAirport', key: 'arrivalAirport' },
          { id: 'flightNumber',   key: 'flightNumber' },
          { id: 'purposeOfVisit', key: 'purposeOfVisit' },
          { id: 'durationOfStay', key: 'durationOfStay' }
        ];
        self._fillFieldSet(fields, formData, options).then(function (count) {
          self._clickNext(count, options).then(function () { resolve(count > 0); });
        });
      });
    },

    fillAccommodation: function (formData, options) {
      var self = this;
      return new Promise(function (resolve) {
        var fields = [
          { id: 'hotelName',    key: 'hotelName' },
          { id: 'hotelAddress', key: 'hotelAddress' },
          { id: 'hotelPhone',   key: 'hotelPhone' }
        ];
        self._fillFieldSet(fields, formData, options).then(function (count) {
          self._clickNext(count, options).then(function () { resolve(count > 0); });
        });
      });
    },

    fillHealthDeclarations: function (formData, options) {
      var self = this;
      return new Promise(function (resolve) {
        var fields = [
          { id: 'healthCondition',          key: 'healthCondition' },
          { id: 'visitedHighRiskCountries', key: 'visitedHighRiskCountries' },
          { id: 'carryingCurrency',         key: 'carryingCurrency' },
          { id: 'carryingProhibitedItems',  key: 'carryingProhibitedItems' }
        ];
        self._fillFieldSet(fields, formData, options).then(function (count) {
          // Final step — submit the form
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
        var confirmEl = document.querySelector('.confirmation, #confirmation-number, .submission-receipt');
        if (confirmEl) {
          if (options && options.debug) {
            window.BorderlyAutomation.Debug.logStep('Malaysia MDAC confirmed', true, {
              text: confirmEl.textContent.trim().substring(0, 100)
            });
          }
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'malaysia_mdac_confirmation',
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
      return window.location.href.includes('imi.gov.my') ||
        window.location.href.includes('mdac');
    }
  };

  // Register
  window.BorderlyAutomation.registerCountry = window.BorderlyAutomation.registerCountry || function (code, automation) {
    window.BorderlyAutomation.countries = window.BorderlyAutomation.countries || {};
    window.BorderlyAutomation.countries[code] = automation;
  };
  window.BorderlyAutomation.registerCountry('MYS', window.BorderlyAutomation.Malaysia);

  if (window.BorderlyAutomation.Malaysia.isSupported()) {
    console.log('Malaysia MDAC automation script loaded and ready');
  }

})();
