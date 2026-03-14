/**
 * Malaysia (MDAC) Automation Script
 *
 * Automates form filling for the Malaysia Digital Arrival Card portal
 * (https://imigresen-online.imi.gov.my/mdac/main)
 *
 * Portal flow (6 steps):
 *   1. Access MDAC Portal (landing page — no fields)
 *   2. Enter Personal Information
 *   3. Travel Details
 *   4. Accommodation Information
 *   5. Health and Declaration
 *   6. Submit and Save
 *
 * No account creation required.
 * Verified against portal DOM: 2025-06-01
 */
/* eslint-env browser */

(function () {
  'use strict';

  if (!window.BorderlyAutomation || !window.BorderlyAutomation._loaded) {
    console.error('Borderly common automation utilities not loaded');
    return;
  }

  window.BorderlyAutomation.Malaysia = {

    /** Government portal entry URL */
    portalUrl: 'https://imigresen-online.imi.gov.my/mdac/main',

    /**
     * Maps each schema field ID to the multi-strategy criteria object accepted
     * by window.BorderlyAutomation.DOM.findElement().
     *
     * Verified against Malaysia MDAC DOM snapshot 2025-06-01.
     */
    fieldMappings: {
      // ── Personal Information ──────────────────────────────────────────────
      surname: {
        selector: '[name="familyName"], [name="lastName"], #familyName, #lastName',
        id: 'familyName',
        name: 'familyName',
        label: 'Family Name',
        nearbyText: 'Family Name'
      },
      givenNames: {
        selector: '[name="firstName"], [name="givenName"], #firstName, #givenName',
        id: 'firstName',
        name: 'firstName',
        label: 'First Name',
        nearbyText: 'First Name'
      },
      dateOfBirth: {
        selector: '[name="dateOfBirth"], [name="dob"], #dateOfBirth, #dob',
        id: 'dateOfBirth',
        name: 'dateOfBirth',
        label: 'Date of Birth',
        nearbyText: 'Date of Birth'
      },
      nationality: {
        selector: '[name="nationality"], [name="citizenOf"], #nationality, #citizenOf',
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
      passportExpiry: {
        selector: '[name="passportExpiry"], [name="expiryDate"], #passportExpiry, #expiryDate',
        id: 'passportExpiry',
        name: 'passportExpiry',
        label: 'Passport Expiry',
        nearbyText: 'Expiry'
      },
      gender: {
        selector: '[name="gender"], [name="sex"], #gender, #sex',
        id: 'gender',
        name: 'gender',
        label: 'Gender',
        nearbyText: 'Gender'
      },
      email: {
        selector: '[name="email"], [name="emailAddress"], #email, #emailAddress',
        id: 'email',
        name: 'email',
        label: 'Email Address',
        nearbyText: 'Email'
      },
      phoneNumber: {
        selector: '[name="phoneNo"], [name="mobileNo"], [name="phone"], #phoneNo, #mobileNo',
        id: 'phoneNo',
        name: 'phoneNo',
        label: 'Phone Number',
        nearbyText: 'Phone'
      },

      // ── Travel Information ────────────────────────────────────────────────
      arrivalDate: {
        selector: '[name="arrivalDate"], [name="dateOfArrival"], #arrivalDate, #dateOfArrival',
        id: 'arrivalDate',
        name: 'arrivalDate',
        label: 'Arrival Date',
        nearbyText: 'Arrival Date'
      },
      arrivalAirport: {
        selector: '[name="portOfEntry"], [name="arrivalPort"], #portOfEntry, #arrivalPort',
        id: 'portOfEntry',
        name: 'portOfEntry',
        label: 'Port of Entry',
        nearbyText: 'Port of Entry'
      },
      flightNumber: {
        selector: '[name="flightNo"], [name="flightNumber"], #flightNo, #flightNumber',
        id: 'flightNo',
        name: 'flightNo',
        label: 'Flight Number',
        nearbyText: 'Flight'
      },
      purposeOfVisit: {
        selector: '[name="purposeOfVisit"], [name="visitPurpose"], #purposeOfVisit, #visitPurpose',
        id: 'purposeOfVisit',
        name: 'purposeOfVisit',
        label: 'Purpose of Visit',
        nearbyText: 'Purpose'
      },
      durationOfStay: {
        selector: '[name="stayDuration"], [name="durationOfStay"], #stayDuration, #durationOfStay',
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
        label: 'Hotel Phone',
        nearbyText: 'Phone'
      },

      // ── Health Declarations ───────────────────────────────────────────────
      healthCondition: {
        selector: '[name="healthCondition"], [name="infectiousDisease"], #healthCondition',
        id: 'healthCondition',
        name: 'healthCondition',
        label: 'Health Condition',
        nearbyText: 'infectious'
      },
      visitedHighRiskCountries: {
        selector: '[name="highRiskCountry"], [name="visitedHighRisk"], #highRiskCountry',
        id: 'highRiskCountry',
        name: 'highRiskCountry',
        label: 'High-Risk Countries',
        nearbyText: 'high-risk'
      },
      carryingCurrency: {
        selector: '[name="currencyDeclaration"], [name="carryingCurrency"], #currencyDeclaration',
        id: 'currencyDeclaration',
        name: 'currencyDeclaration',
        label: 'Currency RM10,000',
        nearbyText: 'RM10,000'
      },
      carryingProhibitedItems: {
        selector: '[name="prohibitedItems"], [name="restrictedGoods"], #prohibitedItems',
        id: 'prohibitedItems',
        name: 'prohibitedItems',
        label: 'Prohibited Items',
        nearbyText: 'prohibited'
      }
    },

    /**
     * Page detectors — returns true when the current DOM matches that portal step.
     */
    pageDetectors: {
      landing: function () {
        var url = window.location.href;
        return url.includes('/mdac/main') && !document.querySelector('[name="familyName"], [name="firstName"]');
      },
      personal_info: function () {
        return !!(
          document.querySelector('[name="familyName"], #familyName') ||
          document.querySelector('[name="firstName"], #firstName')
        );
      },
      travel_details: function () {
        return !!(
          document.querySelector('[name="arrivalDate"], #arrivalDate') ||
          document.querySelector('[name="portOfEntry"], #portOfEntry')
        );
      },
      accommodation: function () {
        return !!(
          document.querySelector('[name="hotelName"], #hotelName') ||
          document.querySelector('[name="accommodationName"]')
        );
      },
      health_declaration: function () {
        return !!(
          document.querySelector('[name="healthCondition"], #healthCondition') ||
          document.querySelector('[name="highRiskCountry"]')
        );
      },
      confirmation: function () {
        var url = window.location.href;
        return url.includes('/confirm') || url.includes('/success') ||
          !!document.querySelector('.confirmation-message, .success-message, #confirmation');
      }
    },

    /** CSS selector for the primary submit/next button */
    submitButtonSelector: 'button[type="submit"], .btn-next, .btn-submit, #btnSubmit, #btnNext, .mdac-submit',

    automate: function (formData, options) {
      options = options || {};
      var self = this;
      return new Promise(function (resolve, reject) {
        window.BorderlyAutomation.Page.waitForReady()
          .then(function () { return self.detectCurrentStep(); })
          .then(function (step) { return self.handleStep(step, formData, options); })
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
              resolve(self.fillFields(['surname', 'givenNames', 'dateOfBirth', 'nationality', 'passportNumber', 'passportExpiry', 'gender', 'email', 'phoneNumber'], formData, options));
              break;
            case 'travel_details':
              resolve(self.fillFields(['arrivalDate', 'arrivalAirport', 'flightNumber', 'purposeOfVisit', 'durationOfStay'], formData, options));
              break;
            case 'accommodation':
              resolve(self.fillFields(['hotelName', 'hotelAddress', 'hotelPhone'], formData, options));
              break;
            case 'health_declaration':
              resolve(self.fillFields(['healthCondition', 'visitedHighRiskCountries', 'carryingCurrency', 'carryingProhibitedItems'], formData, options));
              break;
            case 'confirmation':
              resolve(self.captureConfirmation(options));
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
            .then(function (success) { if (success) filled++; return success; });
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

    captureConfirmation: function (options) {
      return new Promise(function (resolve) {
        try {
          var refEl = document.querySelector('.reference-number, #referenceNo, .submission-reference');
          if (refEl && window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mys_mdac_confirmation',
              data: { referenceNumber: refEl.textContent.trim() }
            }));
          }
          resolve(true);
        } catch (e) {
          resolve(false);
        }
      });
    },

    isSupported: function () {
      return window.location.href.includes('imigresen-online.imi.gov.my');
    }
  };

  window.BorderlyAutomation.registerCountry = window.BorderlyAutomation.registerCountry || function (code, automation) {
    window.BorderlyAutomation.countries = window.BorderlyAutomation.countries || {};
    window.BorderlyAutomation.countries[code] = automation;
  };

  window.BorderlyAutomation.registerCountry('MYS', window.BorderlyAutomation.Malaysia);

  if (window.BorderlyAutomation.Malaysia.isSupported()) {
    console.log('Malaysia MDAC automation script loaded and ready');
  }
})();
