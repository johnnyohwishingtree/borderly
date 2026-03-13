/**
 * Japan Visit Japan Web Automation Script
 *
 * Automates form filling for Japan's Visit Japan Web portal
 * (https://vjw-lp.digital.go.jp/en/)
 *
 * Portal flow (requires account):
 *   Step 1 - Account creation / login
 *   Step 2 - Register personal details (passport info)
 *   Step 3 - Register trip (travel info)
 *   Step 4 - Enter accommodation details
 *   Step 5 - Complete immigration & customs declaration
 *   Step 6 - Receive QR code
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

  window.BorderlyAutomation.Japan = {

    /** Portal entry URL */
    portalUrl: 'https://vjw-lp.digital.go.jp/en/',

    /**
     * Field ID → CSS selector mapping.
     * Each value is a comma-separated fallback chain (tried left-to-right).
     * Mirrors the portalSelector values in src/schemas/JPN.json.
     */
    fieldMappings: {
      surname:               '[name="familyName"], #familyName, [name="lastName"], #last-name, [id="family-name"]',
      givenNames:            '[name="givenName"], #givenName, [name="firstName"], #first-name, [id="given-name"]',
      dateOfBirth:           '[name="birthDate"], #birthDate, [name="dateOfBirth"], [id="birth-date"], [id="date-of-birth"]',
      nationality:           '[name="nationality"], #nationality, [name="nationalityCode"], select[name*="nation"]',
      passportNumber:        '[name="passportNo"], #passportNo, [name="passportNumber"], [id="passport-number"]',
      gender:                '[name="sex"], #sex, [name="gender"], #gender, select[name*="sex"]',
      arrivalDate:           '[name="scheduledArrivalDate"], #scheduledArrivalDate, [name="arrivalDate"], [id="arrival-date"]',
      flightNumber:          '[name="flightNumber"], #flightNumber, [name="flightNo"], [id="flight-number"]',
      airlineCode:           '[name="airlineCode"], #airlineCode, [name="airlineCd"], [id="airline-code"]',
      departureCity:         '[name="departureCity"], #departureCity, [name="originCity"], [id="departure-city"]',
      purposeOfVisit:        '[name="visitPurpose"], #visitPurpose, [name="purpose"], select[id*="purpose"]',
      durationOfStay:        '[name="numberOfNights"], #numberOfNights, [name="stayDays"], [name="durationOfStay"], [id="stay-days"]',
      hotelName:             '[name="accommodationName"], #accommodationName, [name="hotelName"], [id="hotel-name"]',
      hotelAddress:          '[name="accommodationAddress"], #accommodationAddress, [name="hotelAddress"], [id="hotel-address"]',
      hotelPhone:            '[name="accommodationPhone"], #accommodationPhone, [name="hotelPhone"], [id="hotel-phone"]',
      carryingProhibitedItems: '[name="hasProhibitedItems"], input[name*="prohibited"], [id="prohibited-items"]',
      currencyOver1M:        '[name="hasCurrencyOver1M"], input[name*="currency"], [id="currency-over-limit"], [name="currencyDeclaration"]',
      commercialGoods:       '[name="hasCommercialGoods"], input[name*="commercial"], [id="commercial-goods"]',
      meatProducts:          '[name="hasMeatProducts"], input[name*="meat"], [id="meat-products"]',
      plantProducts:         '[name="hasPlantProducts"], input[name*="plant"], [id="plant-products"]',
      itemsToDeclareDuty:    '[name="hasDutyItems"], input[name*="duty"], [id="duty-items"], [name="exceedsDutyFree"]'
    },

    /**
     * Page detectors — identify which portal step is currently displayed.
     * Used to correlate portal pages with submission guide steps.
     */
    pageDetectors: {
      account_creation: {
        urlPattern: /\/(signup|register|create-account)/i,
        domSelector: '#email-registration, .account-create-form, [id*="register"]',
        stepOrder: 1,
        description: 'Account creation / login page'
      },
      personal_details: {
        urlPattern: /\/(profile|passport|personal)/i,
        domSelector: '[name="familyName"], [name="passportNo"], .passport-entry-form',
        stepOrder: 2,
        description: 'Register personal / passport details'
      },
      trip_registration: {
        urlPattern: /\/(trip|travel|entry)/i,
        domSelector: '[name="scheduledArrivalDate"], [name="flightNumber"], .trip-register-form',
        stepOrder: 3,
        description: 'Register trip / travel information'
      },
      accommodation: {
        urlPattern: /\/(accommodation|hotel|lodging)/i,
        domSelector: '[name="accommodationName"], [name="hotelName"], .accommodation-form',
        stepOrder: 4,
        description: 'Accommodation details'
      },
      customs_declaration: {
        urlPattern: /\/(customs|declaration|immigration)/i,
        domSelector: '[name="hasProhibitedItems"], [name="hasMeatProducts"], .customs-form, .declaration-form',
        stepOrder: 5,
        description: 'Immigration & customs declaration'
      },
      qr_code: {
        urlPattern: /\/(qr|complete|confirmation|done)/i,
        domSelector: '.qr-code, canvas[aria-label*="QR"], img[alt*="QR"], img[alt*="qr"]',
        stepOrder: 6,
        description: 'QR code generation and display'
      }
    },

    /** Selector for the primary submit / next button on each portal page */
    submitButtonSelector: 'button[type="submit"], .submit-btn, #submit-button, .next-btn, [id*="next"], [id*="submit"]',

    // -------------------------------------------------------------------------
    // Main orchestrator
    // -------------------------------------------------------------------------

    automate: function (formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function (resolve, reject) {
        window.BorderlyAutomation.Page.waitForReady()
          .then(function () {
            return self.detectCurrentStep();
          })
          .then(function (step) {
            if (options.debug) {
              window.BorderlyAutomation.Debug.logStep('Japan VJW step detected', true, { step: step });
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
          account_creation:    function () { return self.handleAccountCreation(formData, options); },
          personal_details:    function () { return self.fillPersonalDetails(formData, options); },
          trip_registration:   function () { return self.fillTripRegistration(formData, options); },
          accommodation:       function () { return self.fillAccommodation(formData, options); },
          customs_declaration: function () { return self.fillCustomsDeclaration(formData, options); },
          qr_code:             function () { return self.handleQrCode(formData, options); }
        };

        var handler = handlers[step];
        if (!handler) {
          console.warn('Japan VJW: unknown step', step);
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

    handleAccountCreation: function (formData, options) {
      return new Promise(function (resolve) {
        if (options.debug) {
          window.BorderlyAutomation.Debug.logStep('VJW account creation page', true, {
            message: 'Account creation requires email verification — guide user manually'
          });
        }
        resolve(false); // Manual step
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
          { id: 'gender',         key: 'gender' }
        ];
        self._fillFieldSet(fields, formData, options).then(function (count) {
          self._clickNext(count, options).then(function () { resolve(count > 0); });
        });
      });
    },

    fillTripRegistration: function (formData, options) {
      var self = this;
      return new Promise(function (resolve) {
        var fields = [
          { id: 'arrivalDate',    key: 'arrivalDate' },
          { id: 'flightNumber',   key: 'flightNumber' },
          { id: 'airlineCode',    key: 'airlineCode' },
          { id: 'departureCity',  key: 'departureCity' },
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

    fillCustomsDeclaration: function (formData, options) {
      var self = this;
      return new Promise(function (resolve) {
        var fields = [
          { id: 'carryingProhibitedItems', key: 'carryingProhibitedItems' },
          { id: 'currencyOver1M',          key: 'currencyOver1M' },
          { id: 'commercialGoods',         key: 'commercialGoods' },
          { id: 'meatProducts',            key: 'meatProducts' },
          { id: 'plantProducts',           key: 'plantProducts' },
          { id: 'itemsToDeclareDuty',      key: 'itemsToDeclareDuty' }
        ];
        self._fillFieldSet(fields, formData, options).then(function (count) {
          self._clickNext(count, options).then(function () { resolve(count > 0); });
        });
      });
    },

    handleQrCode: function (formData, options) {
      return new Promise(function (resolve) {
        var qrSelectors = [
          '.qr-code img',
          'canvas[aria-label*="QR"]',
          'img[alt*="QR"]',
          'img[alt*="qr"]',
          '.qr-image',
          '#qr-code'
        ];

        var qrElement = null;
        for (var i = 0; i < qrSelectors.length; i++) {
          qrElement = document.querySelector(qrSelectors[i]);
          if (qrElement) { break; }
        }

        if (qrElement) {
          if (options && options.debug) {
            window.BorderlyAutomation.Debug.logStep('VJW QR code found', true);
          }

          var qrData = null;
          if (qrElement.tagName === 'CANVAS') {
            try { qrData = qrElement.toDataURL('image/png'); } catch (e) { /* ignore */ }
          } else if (qrElement.tagName === 'IMG') {
            qrData = qrElement.src;
          }

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'japan_vjw_qr_code',
              data: { qrImageData: qrData, pageUrl: window.location.href }
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
      return new Promise(function (resolve) {
        if (!filledCount || (options && options.testMode)) { resolve(); return; }
        var btn = document.querySelector(
          window.BorderlyAutomation.Japan.submitButtonSelector
        );
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
      return window.location.href.includes('vjw') ||
        window.location.href.includes('digital.go.jp');
    }
  };

  // Register
  window.BorderlyAutomation.registerCountry = window.BorderlyAutomation.registerCountry || function (code, automation) {
    window.BorderlyAutomation.countries = window.BorderlyAutomation.countries || {};
    window.BorderlyAutomation.countries[code] = automation;
  };
  window.BorderlyAutomation.registerCountry('JPN', window.BorderlyAutomation.Japan);

  if (window.BorderlyAutomation.Japan.isSupported()) {
    console.log('Japan VJW automation script loaded and ready');
  }

})();
