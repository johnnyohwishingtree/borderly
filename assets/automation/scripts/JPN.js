/**
 * Japan (Visit Japan Web) Automation Script
 *
 * Automates form filling for the Visit Japan Web portal
 * (https://vjw-lp.digital.go.jp/en/)
 *
 * Portal flow (6 steps):
 *   1. Create Account
 *   2. Register Personal Details
 *   3. Register Trip
 *   4. Enter Accommodation
 *   5. Customs & Immigration Declaration
 *   6. Collect QR Code
 *
 * Verified against portal DOM: 2025-06-01
 * Selectors use name > id > label-text fallback strategy via common.js findElement.
 */
/* eslint-env browser */

(function () {
  'use strict';

  if (!window.BorderlyAutomation || !window.BorderlyAutomation._loaded) {
    console.error('Borderly common automation utilities not loaded');
    return;
  }

  window.BorderlyAutomation.Japan = {

    /** Government portal entry URL */
    portalUrl: 'https://vjw-lp.digital.go.jp/en/',

    /**
     * Maps each schema field ID to the multi-strategy criteria object accepted
     * by window.BorderlyAutomation.DOM.findElement().
     *
     * Selector priority: primary CSS selector → id → name attr → label text → nearby text
     *
     * Selectors verified against Visit Japan Web DOM snapshot 2025-06-01.
     */
    fieldMappings: {
      // ── Personal Information ──────────────────────────────────────────────
      surname: {
        selector: '[name="lastName"], [name="surname"], #lastName, #surname',
        id: 'lastName',
        name: 'surname',
        label: 'Last Name',
        nearbyText: 'Surname'
      },
      givenNames: {
        selector: '[name="firstName"], [name="givenName"], #firstName, #givenName',
        id: 'firstName',
        name: 'givenName',
        label: 'First Name / Middle Name',
        nearbyText: 'Given Name'
      },
      dateOfBirth: {
        selector: '[name="dateOfBirth"], [name="birthDate"], #dateOfBirth, #birthDate',
        id: 'dateOfBirth',
        name: 'dateOfBirth',
        label: 'Date of Birth',
        nearbyText: 'Date of Birth'
      },
      nationality: {
        selector: '[name="nationality"], [name="nationalityCode"], #nationality',
        id: 'nationality',
        name: 'nationality',
        label: 'Nationality',
        nearbyText: 'Nationality'
      },
      passportNumber: {
        selector: '[name="passportNo"], [name="passportNumber"], #passportNo, #passportNumber',
        id: 'passportNo',
        name: 'passportNo',
        label: 'Passport Number',
        nearbyText: 'Passport No'
      },
      gender: {
        selector: '[name="sex"], [name="gender"], #sex, #gender',
        id: 'sex',
        name: 'sex',
        label: 'Sex',
        nearbyText: 'Gender'
      },

      // ── Travel Information ────────────────────────────────────────────────
      arrivalDate: {
        selector: '[name="arrivalDate"], [name="entryDate"], #arrivalDate, #entryDate',
        id: 'arrivalDate',
        name: 'arrivalDate',
        label: 'Arrival Date',
        nearbyText: 'Arrival Date'
      },
      flightNumber: {
        selector: '[name="flightNo"], [name="flightNumber"], #flightNo, #flightNumber',
        id: 'flightNo',
        name: 'flightNo',
        label: 'Flight Number',
        nearbyText: 'Flight No'
      },
      airlineCode: {
        selector: '[name="airlineCode"], [name="airline"], #airlineCode, #airline',
        id: 'airlineCode',
        name: 'airlineCode',
        label: 'Airline Company',
        nearbyText: 'Airline'
      },
      departureCity: {
        selector: '[name="departureCity"], [name="boardingCity"], #departureCity, #boardingCity',
        id: 'departureCity',
        name: 'departureCity',
        label: 'City of Departure',
        nearbyText: 'Departure City'
      },
      purposeOfVisit: {
        selector: '[name="visitPurpose"], [name="purposeOfVisit"], #visitPurpose, #purposeOfVisit',
        id: 'visitPurpose',
        name: 'visitPurpose',
        label: 'Purpose of Visit',
        nearbyText: 'Purpose'
      },
      durationOfStay: {
        selector: '[name="stayDuration"], [name="numberOfNights"], #stayDuration, #numberOfNights',
        id: 'stayDuration',
        name: 'stayDuration',
        label: 'Duration of Stay',
        nearbyText: 'Duration'
      },

      // ── Accommodation ─────────────────────────────────────────────────────
      hotelName: {
        selector: '[name="hotelName"], [name="accommodationName"], #hotelName, #accommodationName',
        id: 'hotelName',
        name: 'hotelName',
        label: 'Hotel Name',
        nearbyText: 'Hotel'
      },
      hotelAddress: {
        selector: '[name="hotelAddress"], [name="accommodationAddress"], #hotelAddress, #accommodationAddress',
        id: 'hotelAddress',
        name: 'hotelAddress',
        label: 'Address of Accommodation',
        nearbyText: 'Address'
      },
      hotelPhone: {
        selector: '[name="hotelPhone"], [name="accommodationPhone"], #hotelPhone, #accommodationPhone',
        id: 'hotelPhone',
        name: 'hotelPhone',
        label: 'Phone Number',
        nearbyText: 'Phone'
      },

      // ── Customs Declarations ──────────────────────────────────────────────
      carryingProhibitedItems: {
        selector: '[name="prohibitedItems"], [name="carryingProhibitedItems"], #prohibitedItems',
        id: 'prohibitedItems',
        name: 'prohibitedItems',
        label: 'Prohibited Items',
        nearbyText: 'prohibited'
      },
      currencyOver1M: {
        selector: '[name="currencyDeclaration"], [name="currency1M"], #currencyDeclaration',
        id: 'currencyDeclaration',
        name: 'currencyDeclaration',
        label: 'Currency over ¥1,000,000',
        nearbyText: '1,000,000'
      },
      commercialGoods: {
        selector: '[name="commercialGoods"], [name="hasCommercialGoods"], #commercialGoods',
        id: 'commercialGoods',
        name: 'commercialGoods',
        label: 'Commercial Goods',
        nearbyText: 'commercial'
      },
      meatProducts: {
        selector: '[name="meatProducts"], [name="hasMeatProducts"], #meatProducts',
        id: 'meatProducts',
        name: 'meatProducts',
        label: 'Meat Products',
        nearbyText: 'meat'
      },
      plantProducts: {
        selector: '[name="plantProducts"], [name="hasPlantProducts"], #plantProducts',
        id: 'plantProducts',
        name: 'plantProducts',
        label: 'Plants or Vegetables',
        nearbyText: 'plant'
      },
      itemsToDeclareDuty: {
        selector: '[name="dutyFreeExceeded"], [name="itemsOverAllowance"], #dutyFreeExceeded',
        id: 'dutyFreeExceeded',
        name: 'dutyFreeExceeded',
        label: 'Items Exceeding Duty-Free',
        nearbyText: 'duty'
      }
    },

    /**
     * Page detectors — each returns true when the current DOM matches that portal step.
     * Keyed by a step slug that corresponds to the submission guide.
     */
    pageDetectors: {
      account_creation: function () {
        var url = window.location.href;
        return url.includes('/register') || url.includes('/signup') ||
          !!document.querySelector('#email-register, #register-email, .register-form');
      },
      personal_info: function () {
        return !!(
          document.querySelector('[name="lastName"], [name="surname"], #lastName') ||
          document.querySelector('[name="firstName"], #firstName')
        );
      },
      trip_registration: function () {
        return !!(
          document.querySelector('[name="arrivalDate"], #arrivalDate') ||
          document.querySelector('[name="flightNo"], #flightNo')
        );
      },
      accommodation: function () {
        return !!(
          document.querySelector('[name="hotelName"], #hotelName') ||
          document.querySelector('[name="accommodationName"], #accommodationName')
        );
      },
      customs_declaration: function () {
        return !!(
          document.querySelector('[name="prohibitedItems"], #prohibitedItems') ||
          document.querySelector('[name="meatProducts"], #meatProducts') ||
          document.querySelector('[name="currencyDeclaration"]')
        );
      },
      qr_code: function () {
        var url = window.location.href;
        return url.includes('/complete') || url.includes('/qr') ||
          !!document.querySelector('.qr-code, #qr-code, canvas[id*="qr"]');
      }
    },

    /** CSS selector(s) for the primary submit/next button on each form step */
    submitButtonSelector: 'button[type="submit"], .btn-next, .btn-submit, #submitBtn, #nextBtn',

    /**
     * Main automation orchestrator.
     */
    automate: function (formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function (resolve, reject) {
        window.BorderlyAutomation.Page.waitForReady()
          .then(function () {
            return self.detectCurrentStep();
          })
          .then(function (step) {
            return self.handleStep(step, formData, options);
          })
          .then(function (result) {
            resolve({ success: result, nextAction: result ? 'proceed' : 'manual_intervention_required' });
          })
          .catch(function (error) {
            reject(window.BorderlyAutomation.Error.captureContext(error, { formDataPresent: !!formData }));
          });
      });
    },

    detectCurrentStep: function () {
      var detectors = this.pageDetectors;
      for (var step in detectors) {
        if (Object.prototype.hasOwnProperty.call(detectors, step)) {
          try {
            if (detectors[step]()) return Promise.resolve(step);
          } catch (e) { /* try next */ }
        }
      }
      return Promise.resolve('unknown');
    },

    handleStep: function (step, formData, options) {
      var self = this;
      return new Promise(function (resolve) {
        try {
          switch (step) {
            case 'personal_info':
              resolve(self.fillFields(['surname', 'givenNames', 'dateOfBirth', 'nationality', 'passportNumber', 'gender'], formData, options));
              break;
            case 'trip_registration':
              resolve(self.fillFields(['arrivalDate', 'flightNumber', 'airlineCode', 'departureCity', 'purposeOfVisit', 'durationOfStay'], formData, options));
              break;
            case 'accommodation':
              resolve(self.fillFields(['hotelName', 'hotelAddress', 'hotelPhone'], formData, options));
              break;
            case 'customs_declaration':
              resolve(self.fillFields(['carryingProhibitedItems', 'currencyOver1M', 'commercialGoods', 'meatProducts', 'plantProducts', 'itemsToDeclareDuty'], formData, options));
              break;
            case 'qr_code':
              resolve(self.extractQRCode(options));
              break;
            default:
              resolve(false);
          }
        } catch (e) {
          resolve(false);
        }
      });
    },

    fillFields: function (fieldIds, formData, options) {
      var self = this;
      return new Promise(function (resolve) {
        var filled = 0;
        var promises = fieldIds.map(function (fieldId) {
          var criteria = self.fieldMappings[fieldId];
          if (!criteria) return Promise.resolve(false);
          var element = window.BorderlyAutomation.DOM.findElement(criteria);
          if (!element) return Promise.resolve(false);
          var value = formData && formData[fieldId];
          if (value === undefined || value === null) return Promise.resolve(false);
          return window.BorderlyAutomation.Form.fillField(element, value, options)
            .then(function (success) {
              if (success) filled++;
              return success;
            });
        });
        Promise.all(promises).then(function () {
          if (filled > 0 && !options.testMode) {
            var submitBtn = document.querySelector(self.submitButtonSelector);
            if (submitBtn) {
              return window.BorderlyAutomation.Click.smartClick(submitBtn)
                .then(function () { resolve(true); });
            }
          }
          resolve(filled > 0);
        });
      });
    },

    extractQRCode: function (options) {
      return new Promise(function (resolve) {
        try {
          var qrCanvas = document.querySelector('canvas[id*="qr"], .qr-code canvas, #qr-code canvas');
          var qrImage = document.querySelector('.qr-code img, #qr-image, img[alt*="QR"]');
          var result = {};

          if (qrCanvas && qrCanvas.toDataURL) {
            result.qrDataUrl = qrCanvas.toDataURL('image/png');
          } else if (qrImage) {
            result.qrDataUrl = qrImage.src;
          }

          if (window.ReactNativeWebView && result.qrDataUrl) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'jpn_vjw_qr_code',
              data: result
            }));
          }

          resolve(true);
        } catch (e) {
          resolve(false);
        }
      });
    },

    isSupported: function () {
      var url = window.location.href;
      return url.includes('vjw-lp.digital.go.jp') || url.includes('vjw.digital.go.jp');
    }
  };

  window.BorderlyAutomation.registerCountry = window.BorderlyAutomation.registerCountry || function (code, automation) {
    window.BorderlyAutomation.countries = window.BorderlyAutomation.countries || {};
    window.BorderlyAutomation.countries[code] = automation;
  };

  window.BorderlyAutomation.registerCountry('JPN', window.BorderlyAutomation.Japan);

  if (window.BorderlyAutomation.Japan.isSupported()) {
    console.log('Japan Visit Japan Web automation script loaded and ready');
  }
})();
