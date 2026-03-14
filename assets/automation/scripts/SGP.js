/**
 * Singapore (SG Arrival Card) Automation Script
 *
 * Automates form filling for the SG Arrival Card portal
 * (https://eservices.ica.gov.sg/sgarrivalcard)
 *
 * Portal flow (7 steps):
 *   1. Access SG Arrival Card (landing — no fields)
 *   2. Personal Details
 *   3. Travel Information
 *   4. Accommodation Details
 *   5. Health Declaration
 *   6. Customs Declaration
 *   7. Submit and Save Confirmation
 *
 * No account creation required. Single-session form.
 * Verified against portal DOM: 2025-06-01
 */
/* eslint-env browser */

(function () {
  'use strict';

  if (!window.BorderlyAutomation || !window.BorderlyAutomation._loaded) {
    console.error('Borderly common automation utilities not loaded');
    return;
  }

  window.BorderlyAutomation.Singapore = {

    /** Government portal entry URL */
    portalUrl: 'https://eservices.ica.gov.sg/sgarrivalcard',

    /**
     * Maps each schema field ID to the multi-strategy criteria object accepted
     * by window.BorderlyAutomation.DOM.findElement().
     *
     * Verified against SG Arrival Card DOM snapshot 2025-06-01.
     */
    fieldMappings: {
      // ── Personal Information ──────────────────────────────────────────────
      surname: {
        selector: '[name="familySurname"], [name="surname"], [name="lastName"], #surname',
        id: 'surname',
        name: 'familySurname',
        label: 'Family Name/Surname',
        nearbyText: 'Surname'
      },
      givenNames: {
        selector: '[name="givenName"], [name="firstName"], #givenName, #firstName',
        id: 'givenName',
        name: 'givenName',
        label: 'Given Name',
        nearbyText: 'Given Name'
      },
      dateOfBirth: {
        selector: '[name="dateOfBirth"], [name="dob"], #dateOfBirth, #dob',
        id: 'dateOfBirth',
        name: 'dateOfBirth',
        label: 'Date of Birth',
        nearbyText: 'Date of Birth'
      },
      nationality: {
        selector: '[name="nationality"], [name="countryOfBirth"], #nationality',
        id: 'nationality',
        name: 'nationality',
        label: 'Nationality',
        nearbyText: 'Nationality'
      },
      passportNumber: {
        selector: '[name="passportNum"], [name="passportNumber"], #passportNum, #passportNumber',
        id: 'passportNum',
        name: 'passportNum',
        label: 'Passport Number',
        nearbyText: 'Passport'
      },
      passportExpiry: {
        selector: '[name="passportExpiry"], [name="expiryDate"], #passportExpiry, #expiryDate',
        id: 'passportExpiry',
        name: 'passportExpiry',
        label: 'Passport Expiry',
        nearbyText: 'Expiry'
      },
      gender: {
        selector: '[name="sex"], [name="gender"], #sex, #gender',
        id: 'sex',
        name: 'sex',
        label: 'Sex',
        nearbyText: 'Gender'
      },
      email: {
        selector: '[name="emailAddr"], [name="email"], #emailAddr, #email',
        id: 'emailAddr',
        name: 'emailAddr',
        label: 'Email Address',
        nearbyText: 'Email'
      },
      phoneNumber: {
        selector: '[name="mobileNo"], [name="phoneNumber"], #mobileNo, #phoneNumber',
        id: 'mobileNo',
        name: 'mobileNo',
        label: 'Mobile Number',
        nearbyText: 'Mobile'
      },

      // ── Travel Information ────────────────────────────────────────────────
      arrivalDate: {
        selector: '[name="arrivalDate"], [name="dateOfArrival"], #arrivalDate, #dateOfArrival',
        id: 'arrivalDate',
        name: 'arrivalDate',
        label: 'Arrival Date',
        nearbyText: 'Arrival Date'
      },
      arrivalTime: {
        selector: '[name="arrivalTime"], [name="estArrivalTime"], #arrivalTime, #estArrivalTime',
        id: 'arrivalTime',
        name: 'arrivalTime',
        label: 'Estimated Arrival Time',
        nearbyText: 'Arrival Time'
      },
      flightNumber: {
        selector: '[name="flightNo"], [name="flightNumber"], #flightNo, #flightNumber',
        id: 'flightNo',
        name: 'flightNo',
        label: 'Flight Number',
        nearbyText: 'Flight'
      },
      airlineCode: {
        selector: '[name="airlineCode"], [name="airline"], #airlineCode, #airline',
        id: 'airlineCode',
        name: 'airlineCode',
        label: 'Airline',
        nearbyText: 'Airline'
      },
      departureCity: {
        selector: '[name="lastDepartCity"], [name="departureCity"], #lastDepartCity, #departureCity',
        id: 'lastDepartCity',
        name: 'lastDepartCity',
        label: 'Last Departure City',
        nearbyText: 'Departure'
      },
      purposeOfVisit: {
        selector: '[name="visitPurpose"], [name="purposeOfVisit"], #visitPurpose, #purposeOfVisit',
        id: 'visitPurpose',
        name: 'visitPurpose',
        label: 'Purpose of Visit',
        nearbyText: 'Purpose'
      },
      intendedLengthOfStay: {
        selector: '[name="stayDuration"], [name="lengthOfStay"], #stayDuration, #lengthOfStay',
        id: 'stayDuration',
        name: 'stayDuration',
        label: 'Intended Length of Stay',
        nearbyText: 'Length of Stay'
      },

      // ── Accommodation ─────────────────────────────────────────────────────
      accommodationType: {
        selector: '[name="accommodationType"], [name="stayType"], #accommodationType, #stayType',
        id: 'accommodationType',
        name: 'accommodationType',
        label: 'Type of Accommodation',
        nearbyText: 'Type of Accommodation'
      },
      accommodationName: {
        selector: '[name="accommodationName"], [name="hotelName"], #accommodationName, #hotelName',
        id: 'accommodationName',
        name: 'accommodationName',
        label: 'Name of Accommodation',
        nearbyText: 'Name of Accommodation'
      },
      accommodationAddress: {
        selector: '[name="accommodationAddress"], [name="hotelAddress"], #accommodationAddress, #hotelAddress',
        id: 'accommodationAddress',
        name: 'accommodationAddress',
        label: 'Address',
        nearbyText: 'Address'
      },
      accommodationPhone: {
        selector: '[name="accommodationPhone"], [name="hotelPhone"], #accommodationPhone, #hotelPhone',
        id: 'accommodationPhone',
        name: 'accommodationPhone',
        label: 'Contact Number',
        nearbyText: 'Contact Number'
      },

      // ── Health Declaration ────────────────────────────────────────────────
      feverSymptoms: {
        selector: '[name="feverSymptoms"], [name="hasFever"], #feverSymptoms, #hasFever',
        id: 'feverSymptoms',
        name: 'feverSymptoms',
        label: 'Fever / Flu Symptoms',
        nearbyText: 'fever'
      },
      infectiousDisease: {
        selector: '[name="infectiousDisease"], [name="hasInfectiousDisease"], #infectiousDisease',
        id: 'infectiousDisease',
        name: 'infectiousDisease',
        label: 'Infectious Disease',
        nearbyText: 'infectious'
      },
      visitedOutbreakArea: {
        selector: '[name="visitedOutbreak"], [name="outbreakArea"], #visitedOutbreak, #outbreakArea',
        id: 'visitedOutbreak',
        name: 'visitedOutbreak',
        label: 'Outbreak Area',
        nearbyText: 'outbreak'
      },
      contactWithInfected: {
        selector: '[name="contactInfected"], [name="closedContact"], #contactInfected, #closedContact',
        id: 'contactInfected',
        name: 'contactInfected',
        label: 'Close Contact',
        nearbyText: 'close contact'
      },

      // ── Customs Declaration ───────────────────────────────────────────────
      exceedsAllowance: {
        selector: '[name="exceedsDutyFree"], [name="exceedsAllowance"], #exceedsDutyFree',
        id: 'exceedsDutyFree',
        name: 'exceedsDutyFree',
        label: 'Exceeds Duty-Free Allowance',
        nearbyText: 'duty-free'
      },
      carryingCash: {
        selector: '[name="cashDeclaration"], [name="carryingCash"], #cashDeclaration',
        id: 'cashDeclaration',
        name: 'cashDeclaration',
        label: 'Currency S$20,000',
        nearbyText: 'S$20,000'
      },
      prohibitedGoods: {
        selector: '[name="prohibitedGoods"], [name="hasProhibitedGoods"], #prohibitedGoods',
        id: 'prohibitedGoods',
        name: 'prohibitedGoods',
        label: 'Prohibited Goods',
        nearbyText: 'prohibited'
      },
      commercialGoods: {
        selector: '[name="commercialGoods"], [name="hasCommercialGoods"], #commercialGoods',
        id: 'commercialGoods',
        name: 'commercialGoods',
        label: 'Commercial Goods',
        nearbyText: 'commercial'
      }
    },

    /**
     * Page detectors — returns true when the current DOM matches that portal step.
     */
    pageDetectors: {
      landing: function () {
        var url = window.location.href;
        return (url.includes('sgarrivalcard') && !document.querySelector('[name="familySurname"], [name="surname"], #surname'));
      },
      personal_details: function () {
        return !!(
          document.querySelector('[name="familySurname"], #surname, [name="surname"]') ||
          document.querySelector('[name="givenName"], #givenName')
        );
      },
      travel_info: function () {
        return !!(
          document.querySelector('[name="arrivalDate"], #arrivalDate') ||
          document.querySelector('[name="flightNo"], #flightNo')
        );
      },
      accommodation_details: function () {
        return !!(
          document.querySelector('[name="accommodationType"], #accommodationType') ||
          document.querySelector('[name="accommodationName"], #accommodationName')
        );
      },
      health_declaration: function () {
        return !!(
          document.querySelector('[name="feverSymptoms"], #feverSymptoms') ||
          document.querySelector('[name="infectiousDisease"], #infectiousDisease')
        );
      },
      customs_declaration: function () {
        return !!(
          document.querySelector('[name="exceedsDutyFree"], #exceedsDutyFree') ||
          document.querySelector('[name="cashDeclaration"], #cashDeclaration')
        );
      },
      confirmation: function () {
        var url = window.location.href;
        return url.includes('/confirmation') || url.includes('/success') ||
          !!document.querySelector('.submission-success, .confirmation-screen, #confirmationRef');
      }
    },

    /** CSS selector for the primary submit/next button */
    submitButtonSelector: 'button[type="submit"], .btn-next, .btn-submit, #btnNext, #btnSubmit, .sg-submit-btn',

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
            case 'personal_details':
              resolve(self.fillFields(['surname', 'givenNames', 'dateOfBirth', 'nationality', 'passportNumber', 'passportExpiry', 'gender', 'email', 'phoneNumber'], formData, options));
              break;
            case 'travel_info':
              resolve(self.fillFields(['arrivalDate', 'arrivalTime', 'flightNumber', 'airlineCode', 'departureCity', 'purposeOfVisit', 'intendedLengthOfStay'], formData, options));
              break;
            case 'accommodation_details':
              resolve(self.fillFields(['accommodationType', 'accommodationName', 'accommodationAddress', 'accommodationPhone'], formData, options));
              break;
            case 'health_declaration':
              resolve(self.fillFields(['feverSymptoms', 'infectiousDisease', 'visitedOutbreakArea', 'contactWithInfected'], formData, options));
              break;
            case 'customs_declaration':
              resolve(self.fillFields(['exceedsAllowance', 'carryingCash', 'prohibitedGoods', 'commercialGoods'], formData, options));
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
          var refEl = document.querySelector('#confirmationRef, .confirmation-number, .reference-no');
          if (refEl && window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'sgp_sgac_confirmation',
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
      return window.location.href.includes('eservices.ica.gov.sg') ||
        window.location.href.includes('sgarrivalcard');
    }
  };

  window.BorderlyAutomation.registerCountry = window.BorderlyAutomation.registerCountry || function (code, automation) {
    window.BorderlyAutomation.countries = window.BorderlyAutomation.countries || {};
    window.BorderlyAutomation.countries[code] = automation;
  };

  window.BorderlyAutomation.registerCountry('SGP', window.BorderlyAutomation.Singapore);

  if (window.BorderlyAutomation.Singapore.isSupported()) {
    console.log('Singapore SG Arrival Card automation script loaded and ready');
  }
})();
