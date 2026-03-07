/**
 * Common Automation Scripts - Shared JavaScript utilities for WebView automation
 * 
 * These scripts are injected into government portals to provide common functionality
 * for form filling, element interaction, and automation tasks.
 */

(function() {
  'use strict';

  // Namespace for automation utilities
  window.BorderlyAutomation = window.BorderlyAutomation || {};

  /**
   * DOM Utilities
   */
  window.BorderlyAutomation.DOM = {
    /**
     * Wait for element to appear with timeout
     */
    waitForElement: function(selector, timeout = 30000) {
      return new Promise(function(resolve, reject) {
        const startTime = Date.now();
        
        function check() {
          const element = document.querySelector(selector);
          if (element) {
            resolve(element);
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Element not found: ' + selector));
          } else {
            setTimeout(check, 100);
          }
        }
        
        check();
      });
    },

    /**
     * Wait for element to be visible and interactable
     */
    waitForInteractable: function(selector, timeout = 30000) {
      return new Promise(function(resolve, reject) {
        const startTime = Date.now();
        const self = this;
        
        function check() {
          const element = document.querySelector(selector);
          if (element && self.isInteractable(element)) {
            resolve(element);
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Element not interactable: ' + selector));
          } else {
            setTimeout(check, 100);
          }
        }
        
        check();
      }.bind(this));
    },

    /**
     * Check if element is visible and interactable
     */
    isInteractable: function(element) {
      if (!element) return false;
      
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0' &&
        !element.disabled &&
        style.pointerEvents !== 'none'
      );
    },

    /**
     * Scroll element into view with smooth behavior
     */
    scrollIntoView: function(element, behavior = 'smooth') {
      if (!element) return false;
      
      element.scrollIntoView({
        behavior: behavior,
        block: 'center',
        inline: 'center'
      });
      
      return true;
    },

    /**
     * Smart element finder with multiple strategies
     */
    findElement: function(criteria) {
      const strategies = [
        // Strategy 1: Direct selector
        () => criteria.selector ? document.querySelector(criteria.selector) : null,
        
        // Strategy 2: By ID
        () => criteria.id ? document.getElementById(criteria.id) : null,
        
        // Strategy 3: By name attribute
        () => criteria.name ? document.querySelector(`[name="${criteria.name}"]`) : null,
        
        // Strategy 4: By label text
        () => {
          if (!criteria.label) return null;
          const labels = Array.from(document.querySelectorAll('label'));
          const matchingLabel = labels.find(label => 
            label.textContent.toLowerCase().includes(criteria.label.toLowerCase())
          );
          
          if (matchingLabel) {
            const forId = matchingLabel.getAttribute('for');
            if (forId) {
              return document.getElementById(forId);
            }
            return matchingLabel.querySelector('input, select, textarea');
          }
          return null;
        },
        
        // Strategy 5: By placeholder
        () => criteria.placeholder ? 
          document.querySelector(`[placeholder*="${criteria.placeholder}"]`) : null,
        
        // Strategy 6: By nearby text
        () => {
          if (!criteria.nearbyText) return null;
          const elements = Array.from(document.querySelectorAll('input, select, textarea'));
          return elements.find(element => {
            const parent = element.closest('div, td, li, section');
            return parent && parent.textContent.toLowerCase()
              .includes(criteria.nearbyText.toLowerCase());
          });
        }
      ];
      
      for (const strategy of strategies) {
        try {
          const element = strategy();
          if (element) return element;
        } catch (e) {
          // Continue to next strategy
        }
      }
      
      return null;
    }
  };

  /**
   * Form Utilities
   */
  window.BorderlyAutomation.Form = {
    /**
     * Fill form field with proper event triggering
     */
    fillField: function(element, value, options = {}) {
      if (!element) return false;
      
      try {
        // Ensure element is visible and focusable
        window.BorderlyAutomation.DOM.scrollIntoView(element);
        element.focus();
        
        // Wait a moment for focus events to process
        const self = this;
        return new Promise(function(resolve) {
          setTimeout(function() {
            try {
              if (element.type === 'file') {
                // File inputs require special handling
                resolve(self.handleFileInput(element, value, options));
              } else if (element.tagName === 'SELECT') {
                // Select dropdowns
                resolve(self.fillSelectField(element, value, options));
              } else if (element.type === 'checkbox' || element.type === 'radio') {
                // Checkboxes and radio buttons
                resolve(self.fillCheckboxRadio(element, value, options));
              } else {
                // Text inputs, textareas, etc.
                resolve(self.fillTextField(element, value, options));
              }
            } catch (e) {
              resolve(false);
            }
          }, options.delay || 100);
        });
      } catch (e) {
        return Promise.resolve(false);
      }
    },

    /**
     * Fill text field with realistic typing
     */
    fillTextField: function(element, value, options = {}) {
      if (!element || value === undefined || value === null) return false;
      
      const stringValue = String(value);
      element.value = '';
      
      // Trigger input start events
      element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      
      if (options.realistic && stringValue.length > 0) {
        // Simulate realistic typing
        return this.typeRealistic(element, stringValue, options);
      } else {
        // Set value directly
        element.value = stringValue;
        
        // Trigger events
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.blur();
        
        return true;
      }
    },

    /**
     * Fill select field
     */
    fillSelectField: function(element, value, options = {}) {
      if (!element || value === undefined || value === null) return false;
      
      const stringValue = String(value);
      
      // Try exact value match first
      element.value = stringValue;
      
      // If that didn't work, try to find matching option by text
      if (!element.value || element.value !== stringValue) {
        const options = Array.from(element.options);
        const matchingOption = options.find(option => 
          option.text.toLowerCase().includes(stringValue.toLowerCase()) ||
          option.value.toLowerCase() === stringValue.toLowerCase()
        );
        
        if (matchingOption) {
          element.value = matchingOption.value;
        } else {
          return false;
        }
      }
      
      // Trigger change event
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.blur();
      
      return true;
    },

    /**
     * Fill checkbox or radio button
     */
    fillCheckboxRadio: function(element, value, options = {}) {
      if (!element) return false;
      
      const shouldCheck = Boolean(value);
      
      if (element.type === 'radio') {
        // For radio buttons, find the correct one to check
        const radioGroup = document.querySelectorAll(`input[name="${element.name}"]`);
        const targetRadio = Array.from(radioGroup).find(radio => 
          radio.value === String(value) || 
          radio.value.toLowerCase() === String(value).toLowerCase()
        );
        
        if (targetRadio) {
          targetRadio.checked = true;
          targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      } else {
        // Checkbox
        element.checked = shouldCheck;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    },

    /**
     * Handle file input (placeholder - actual implementation would need native integration)
     */
    handleFileInput: function(element, fileData, options = {}) {
      // This is a placeholder - actual file upload would require
      // integration with React Native's file system
      console.log('File upload requested for element:', element, 'data:', fileData);
      return false;
    },

    /**
     * Simulate realistic typing
     */
    typeRealistic: function(element, text, options = {}) {
      return new Promise(function(resolve) {
        const chars = text.split('');
        let index = 0;
        const delay = options.typingDelay || 50;
        
        function typeNextChar() {
          if (index < chars.length) {
            element.value += chars[index];
            
            // Trigger events for each character
            element.dispatchEvent(new KeyboardEvent('keydown', { key: chars[index] }));
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keyup', { key: chars[index] }));
            
            index++;
            setTimeout(typeNextChar, delay + Math.random() * delay);
          } else {
            // Finished typing
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.blur();
            resolve(true);
          }
        }
        
        typeNextChar();
      });
    }
  };

  /**
   * Click Utilities
   */
  window.BorderlyAutomation.Click = {
    /**
     * Smart click with pre-flight checks
     */
    smartClick: function(element, options = {}) {
      if (!element) return Promise.resolve(false);
      
      return new Promise(function(resolve) {
        try {
          // Pre-flight checks
          if (!window.BorderlyAutomation.DOM.isInteractable(element)) {
            resolve(false);
            return;
          }
          
          // Scroll into view
          window.BorderlyAutomation.DOM.scrollIntoView(element);
          
          // Wait for scroll to complete
          setTimeout(function() {
            // Simulate mouse movement and hover
            element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            
            // Wait a bit then click
            setTimeout(function() {
              const rect = element.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;
              
              // Add small random offset for more human-like behavior
              const offsetX = centerX + (Math.random() - 0.5) * 4;
              const offsetY = centerY + (Math.random() - 0.5) * 4;
              
              // Mouse down
              element.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                clientX: offsetX,
                clientY: offsetY,
                button: 0
              }));
              
              // Small delay for realism
              setTimeout(function() {
                // Mouse up and click
                element.dispatchEvent(new MouseEvent('mouseup', {
                  bubbles: true,
                  cancelable: true,
                  clientX: offsetX,
                  clientY: offsetY,
                  button: 0
                }));
                
                element.dispatchEvent(new MouseEvent('click', {
                  bubbles: true,
                  cancelable: true,
                  clientX: offsetX,
                  clientY: offsetY,
                  button: 0
                }));
                
                resolve(true);
              }, 50 + Math.random() * 100);
            }, 100 + Math.random() * 200);
          }, options.scrollDelay || 500);
        } catch (e) {
          resolve(false);
        }
      });
    }
  };

  /**
   * Validation Utilities
   */
  window.BorderlyAutomation.Validation = {
    /**
     * Check if form is ready for submission
     */
    isFormReady: function(formSelector) {
      const form = document.querySelector(formSelector || 'form');
      if (!form) return false;
      
      // Check for loading indicators
      const loadingIndicators = form.querySelectorAll(
        '.loading, .spinner, .busy, [aria-busy="true"], [data-loading="true"]'
      );
      if (loadingIndicators.length > 0) return false;
      
      // Check required fields
      const requiredFields = form.querySelectorAll('[required]');
      const unfilledRequired = Array.from(requiredFields).filter(field => {
        if (field.type === 'checkbox' || field.type === 'radio') {
          const name = field.name;
          const checkedInGroup = form.querySelector(`input[name="${name}"]:checked`);
          return !checkedInGroup;
        }
        return !field.value || field.value.trim() === '';
      });
      
      return unfilledRequired.length === 0;
    },

    /**
     * Validate field value
     */
    validateField: function(element, value) {
      if (!element) return { valid: false, error: 'Element not found' };
      
      const result = { valid: true, error: null };
      
      // Check required
      if (element.required && (!value || value.trim() === '')) {
        result.valid = false;
        result.error = 'Field is required';
        return result;
      }
      
      // Check pattern
      if (element.pattern && value) {
        const regex = new RegExp(element.pattern);
        if (!regex.test(value)) {
          result.valid = false;
          result.error = 'Value does not match required pattern';
          return result;
        }
      }
      
      // Check length constraints
      if (element.maxLength && value && value.length > element.maxLength) {
        result.valid = false;
        result.error = `Value too long (max ${element.maxLength} characters)`;
        return result;
      }
      
      if (element.minLength && value && value.length < element.minLength) {
        result.valid = false;
        result.error = `Value too short (min ${element.minLength} characters)`;
        return result;
      }
      
      // Check numeric constraints
      if (element.type === 'number') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          result.valid = false;
          result.error = 'Value must be a number';
          return result;
        }
        
        if (element.min !== '' && numValue < parseFloat(element.min)) {
          result.valid = false;
          result.error = `Value must be at least ${element.min}`;
          return result;
        }
        
        if (element.max !== '' && numValue > parseFloat(element.max)) {
          result.valid = false;
          result.error = `Value must be at most ${element.max}`;
          return result;
        }
      }
      
      return result;
    }
  };

  /**
   * Page Utilities
   */
  window.BorderlyAutomation.Page = {
    /**
     * Wait for page to be ready
     */
    waitForReady: function(timeout = 30000) {
      return new Promise(function(resolve, reject) {
        const startTime = Date.now();
        
        function check() {
          const isReady = document.readyState === 'complete' &&
            !document.querySelector('.loading, .spinner, [aria-busy="true"]');
          
          if (isReady) {
            resolve(true);
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Page ready timeout'));
          } else {
            setTimeout(check, 100);
          }
        }
        
        check();
      });
    },

    /**
     * Wait for navigation to complete
     */
    waitForNavigation: function(timeout = 30000) {
      return new Promise(function(resolve) {
        const startUrl = window.location.href;
        const startTime = Date.now();
        
        function check() {
          const currentUrl = window.location.href;
          const timeElapsed = Date.now() - startTime;
          
          if (currentUrl !== startUrl) {
            // URL changed, wait for new page to load
            setTimeout(function() {
              resolve({
                navigationOccurred: true,
                oldUrl: startUrl,
                newUrl: currentUrl,
                duration: timeElapsed
              });
            }, 1000); // Give page time to start loading
          } else if (timeElapsed > timeout) {
            resolve({
              navigationOccurred: false,
              oldUrl: startUrl,
              newUrl: currentUrl,
              duration: timeElapsed
            });
          } else {
            setTimeout(check, 100);
          }
        }
        
        check();
      });
    },

    /**
     * Get page metadata
     */
    getMetadata: function() {
      return {
        url: window.location.href,
        title: document.title,
        readyState: document.readyState,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        forms: document.querySelectorAll('form').length,
        inputs: document.querySelectorAll('input').length,
        hasJavaScript: true
      };
    }
  };

  /**
   * Error Handling Utilities
   */
  window.BorderlyAutomation.Error = {
    /**
     * Capture error context
     */
    captureContext: function(error, additionalInfo = {}) {
      return {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        page: window.BorderlyAutomation.Page.getMetadata(),
        timestamp: Date.now(),
        additionalInfo: additionalInfo
      };
    },

    /**
     * Safe function wrapper
     */
    safe: function(fn, fallback = null) {
      return function() {
        try {
          return fn.apply(this, arguments);
        } catch (e) {
          console.warn('Borderly Automation Error:', e);
          return fallback;
        }
      };
    }
  };

  /**
   * Debugging Utilities
   */
  window.BorderlyAutomation.Debug = {
    /**
     * Highlight element for debugging
     */
    highlightElement: function(element, duration = 2000) {
      if (!element) return;
      
      const originalStyle = {
        outline: element.style.outline,
        backgroundColor: element.style.backgroundColor
      };
      
      element.style.outline = '3px solid red';
      element.style.backgroundColor = 'yellow';
      
      setTimeout(function() {
        element.style.outline = originalStyle.outline;
        element.style.backgroundColor = originalStyle.backgroundColor;
      }, duration);
    },

    /**
     * Log automation step
     */
    logStep: function(stepName, result, details = {}) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        step: stepName,
        result: result,
        details: details,
        page: {
          url: window.location.href,
          title: document.title
        }
      };
      
      console.log('Borderly Automation Step:', logEntry);
      return logEntry;
    }
  };

  // Mark automation utilities as loaded
  window.BorderlyAutomation._loaded = true;
  
  // Dispatch ready event
  if (document.readyState === 'complete') {
    window.dispatchEvent(new CustomEvent('borderlyAutomationReady'));
  } else {
    window.addEventListener('load', function() {
      window.dispatchEvent(new CustomEvent('borderlyAutomationReady'));
    });
  }

})();