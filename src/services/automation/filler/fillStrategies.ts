/**
 * Fill Strategies — Input-type-specific filling strategies for form automation
 */

import type { FieldFillStrategy } from './fillerTypes';

/**
 * Create default fill strategies for common input types
 */
export function createDefaultFillStrategies(): Map<string, FieldFillStrategy> {
  const strategies = new Map<string, FieldFillStrategy>();

  strategies.set('text', {
    inputType: 'text',
    fillMethod: (element, value, _mapping) => `
      ${element}.value = ${value};
      ${element}.dispatchEvent(new Event('input', { bubbles: true }));
      ${element}.dispatchEvent(new Event('change', { bubbles: true }));
      ${element}.blur();
    `
  });

  strategies.set('select', {
    inputType: 'select',
    fillMethod: (element, value, _mapping) => `
      ${element}.value = ${value};

      if (!${element}.value || ${element}.value !== ${value}) {
        const options = Array.from(${element}.options);
        const matchingOption = options.find(opt =>
          opt.text.toLowerCase().includes(${value}.toLowerCase()) ||
          opt.value.toLowerCase() === ${value}.toLowerCase()
        );
        if (matchingOption) {
          ${element}.value = matchingOption.value;
        }
      }

      ${element}.dispatchEvent(new Event('change', { bubbles: true }));
      ${element}.blur();
    `
  });

  strategies.set('radio', {
    inputType: 'radio',
    fillMethod: (element, value, _mapping) => `
      const firstRadio = document.querySelector(${element});
      if (firstRadio && firstRadio.name) {
        const radioButtons = document.querySelectorAll('input[type="radio"][name="' + firstRadio.name + '"]');
        radioButtons.forEach(radio => {
          if (radio.value === ${value} || radio.value.toLowerCase() === ${value}.toLowerCase()) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }
    `
  });

  strategies.set('checkbox', {
    inputType: 'checkbox',
    fillMethod: (element, value, _mapping) => `
      ${element}.checked = Boolean(${value});
      ${element}.dispatchEvent(new Event('change', { bubbles: true }));
    `
  });

  strategies.set('date', {
    inputType: 'date',
    fillMethod: (element, value, _mapping) => `
      ${element}.value = ${value};
      ${element}.dispatchEvent(new Event('input', { bubbles: true }));
      ${element}.dispatchEvent(new Event('change', { bubbles: true }));
      ${element}.blur();
    `
  });

  strategies.set('file', {
    inputType: 'file',
    fillMethod: (element, _value, _mapping) => `
      console.log('File upload for element:', ${element});
    `
  });

  return strategies;
}
