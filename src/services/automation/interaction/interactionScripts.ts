/**
 * Interaction Scripts — WebView script generators for DOM interactions
 */

import type { DOMInteractionConfig, ElementInteractionOptions } from './interactionTypes';

/**
 * Generate click script with proper event handling
 */
export function generateClickScript(
  selector: string,
  options: ElementInteractionOptions,
  config: DOMInteractionConfig
): string {
  return `
    (async function() {
      try {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) {
          return { success: false, error: 'Element not found' };
        }

        const initialValue = element.value || element.textContent;
        const initialChecked = element.checked;

        ${options.scrollIntoView !== false ? `
          element.scrollIntoView({ behavior: ${JSON.stringify(config.scrollBehavior)}, block: 'center' });
        ` : ''}

        await new Promise(resolve => setTimeout(resolve, ${config.clickDelay}));

        element.focus();

        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 0,
          buttons: 1,
          clientX: element.getBoundingClientRect().left + element.offsetWidth / 2,
          clientY: element.getBoundingClientRect().top + element.offsetHeight / 2
        });

        element.dispatchEvent(clickEvent);

        const finalValue = element.value || element.textContent;
        const finalChecked = element.checked;
        const elementChanged = (initialValue !== finalValue) || (initialChecked !== finalChecked);

        return {
          success: true,
          elementChanged: elementChanged,
          initialValue: initialValue,
          finalValue: finalValue
        };

      } catch (error) {
        return { success: false, error: error.message };
      }
    })();
  `;
}

/**
 * Generate typing script with realistic timing
 */
export function generateTypeScript(
  selector: string,
  text: string,
  options: ElementInteractionOptions,
  config: DOMInteractionConfig
): string {
  return `
    (function() {
      try {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) {
          return { success: false, error: 'Element not found' };
        }

        ${options.scrollIntoView !== false ? `
          element.scrollIntoView({ behavior: '${config.scrollBehavior}', block: 'center' });
        ` : ''}

        element.focus();

        element.value = '';
        element.dispatchEvent(new Event('input', { bubbles: true }));

        const text = '${text.replace(/'/g, "\\'")}';
        let currentValue = '';

        return new Promise((resolve) => {
          let index = 0;

          function typeNextCharacter() {
            if (index < text.length) {
              currentValue += text[index];
              element.value = currentValue;

              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new KeyboardEvent('keydown', { key: text[index] }));
              element.dispatchEvent(new KeyboardEvent('keyup', { key: text[index] }));

              index++;
              setTimeout(typeNextCharacter, ${config.typeDelay});
            } else {
              element.dispatchEvent(new Event('change', { bubbles: true }));
              element.blur();

              resolve({
                success: true,
                finalValue: element.value,
                charactersTyped: text.length
              });
            }
          }

          typeNextCharacter();
        });

      } catch (error) {
        return { success: false, error: error.message };
      }
    })();
  `;
}

/**
 * Generate select option script
 */
export function generateSelectScript(
  selector: string,
  optionValue: string,
  scrollIntoView: boolean,
  scrollBehavior: string
): string {
  return `
    (function() {
      try {
        const select = document.querySelector(${JSON.stringify(selector)});
        if (!select) {
          return { success: false, error: 'Select element not found' };
        }

        if (${scrollIntoView}) {
          select.scrollIntoView({ behavior: '${scrollBehavior}', block: 'center' });
        }

        select.focus();

        const exactOption = select.querySelector('option[value="${optionValue}"]');
        if (exactOption) {
          select.value = '${optionValue}';
        } else {
          const options = Array.from(select.options);
          const matchingOption = options.find(opt =>
            opt.text.toLowerCase().includes('${optionValue.toLowerCase()}') ||
            opt.value.toLowerCase().includes('${optionValue.toLowerCase()}')
          );

          if (matchingOption) {
            select.value = matchingOption.value;
          } else {
            return {
              success: false,
              error: 'No matching option found for: ${optionValue}',
              availableOptions: options.map(opt => ({ text: opt.text, value: opt.value }))
            };
          }
        }

        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.blur();

        return {
          success: true,
          selectedValue: select.value,
          selectedText: select.options[select.selectedIndex]?.text
        };

      } catch (error) {
        return { success: false, error: error.message };
      }
    })();
  `;
}

/**
 * Generate checkbox toggle script
 */
export function generateToggleScript(
  selector: string,
  checked: boolean,
  scrollIntoView: boolean,
  scrollBehavior: string
): string {
  return `
    (function() {
      try {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) {
          return { success: false, error: 'Checkbox/radio element not found' };
        }

        if (${scrollIntoView}) {
          element.scrollIntoView({ behavior: '${scrollBehavior}', block: 'center' });
        }

        element.focus();
        element.checked = ${checked};

        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.blur();

        return {
          success: true,
          checked: element.checked,
          value: element.value
        };

      } catch (error) {
        return { success: false, error: error.message };
      }
    })();
  `;
}

/**
 * Generate wait-for-element script
 */
export function generateWaitScript(selector: string, condition: string, timeout: number): string {
  return `
    (function() {
      return new Promise((resolve) => {
        const startTime = Date.now();
        const timeout = ${timeout};

        function checkCondition() {
          const element = document.querySelector(${JSON.stringify(selector)});

          switch ('${condition}') {
            case 'appear':
              return element !== null;
            case 'disappear':
              return element === null;
            case 'visible':
              if (!element) return false;
              const rect = element.getBoundingClientRect();
              const style = window.getComputedStyle(element);
              return rect.width > 0 && rect.height > 0 &&
                     style.visibility !== 'hidden' &&
                     style.display !== 'none';
            case 'hidden':
              if (!element) return true;
              const hiddenRect = element.getBoundingClientRect();
              const hiddenStyle = window.getComputedStyle(element);
              return hiddenRect.width === 0 || hiddenRect.height === 0 ||
                     hiddenStyle.visibility === 'hidden' ||
                     hiddenStyle.display === 'none';
            default:
              return false;
          }
        }

        function poll() {
          if (checkCondition()) {
            resolve({ success: true, conditionMet: '${condition}' });
          } else if (Date.now() - startTime > timeout) {
            resolve({ success: false, error: 'Timeout waiting for condition: ${condition}' });
          } else {
            setTimeout(poll, 200);
          }
        }

        poll();
      });
    })();
  `;
}

/**
 * Generate data extraction script
 */
export function generateExtractScript(
  selector: string,
  dataType: string,
  attributeName?: string
): string {
  return `
    (function() {
      try {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) {
          return { success: false, error: 'Element not found for data extraction' };
        }

        let data;
        switch ('${dataType}') {
          case 'text':
            data = element.textContent || element.innerText || '';
            break;
          case 'value':
            data = element.value || '';
            break;
          case 'html':
            data = element.innerHTML || '';
            break;
          case 'attribute':
            data = element.getAttribute('${attributeName || ''}') || '';
            break;
          default:
            return { success: false, error: 'Invalid data type: ${dataType}' };
        }

        return {
          success: true,
          data: data,
          dataType: '${dataType}',
          selector: '${selector}'
        };

      } catch (error) {
        return { success: false, error: error.message };
      }
    })();
  `;
}

/**
 * Generate scroll script
 */
export function generateScrollScript(
  target: string | { x: number; y: number },
  behavior: string
): string {
  if (typeof target === 'string') {
    return `
      (function() {
        try {
          const element = document.querySelector(${JSON.stringify(target)});
          if (!element) {
            return { success: false, error: 'Element not found for scrolling' };
          }

          element.scrollIntoView({
            behavior: '${behavior}',
            block: 'center',
            inline: 'center'
          });

          return { success: true, scrolledTo: 'element' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })();
    `;
  } else {
    return `
      (function() {
        try {
          window.scrollTo({
            left: ${target.x},
            top: ${target.y},
            behavior: '${behavior}'
          });

          return { success: true, scrolledTo: 'coordinates', x: ${target.x}, y: ${target.y} };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })();
    `;
  }
}

/**
 * Generate stability check script
 */
export function generateStabilityScript(timeout: number): string {
  return `
    (function() {
      return new Promise((resolve) => {
        let stableTime = 0;
        const requiredStableTime = 1000;
        const checkInterval = 100;

        let lastUrl = window.location.href;
        let lastTitle = document.title;

        function checkStability() {
          const currentUrl = window.location.href;
          const currentTitle = document.title;

          if (currentUrl === lastUrl && currentTitle === lastTitle) {
            stableTime += checkInterval;
            if (stableTime >= requiredStableTime) {
              resolve(true);
              return;
            }
          } else {
            stableTime = 0;
            lastUrl = currentUrl;
            lastTitle = currentTitle;
          }

          setTimeout(checkStability, checkInterval);
        }

        setTimeout(checkStability, checkInterval);

        setTimeout(() => resolve(true), ${timeout});
      });
    })();
  `;
}
