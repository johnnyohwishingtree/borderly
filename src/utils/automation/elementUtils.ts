/**
 * Element interaction utilities for WebView automation
 */

export class ElementUtils {
  /**
   * Generate JavaScript to check element readiness
   */
  static generateReadinessCheck(selector: string): string {
    return `
      (function() {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) return { ready: false, reason: 'Element not found' };

        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);

        const isVisible = rect.width > 0 && rect.height > 0 &&
                         style.visibility !== 'hidden' &&
                         style.display !== 'none';

        const isEnabled = !element.disabled && !element.hasAttribute('aria-disabled');
        const isInteractable = style.pointerEvents !== 'none';

        return {
          ready: isVisible && isEnabled && isInteractable,
          visible: isVisible,
          enabled: isEnabled,
          interactable: isInteractable,
          coordinates: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
        };
      })()
    `;
  }

  /**
   * Generate JavaScript to simulate realistic human interaction
   */
  static generateHumanLikeInteraction(
    action: 'click' | 'focus' | 'hover',
    selector: string
  ): string {
    const baseScript = `
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) throw new Error('Element not found');

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    `;

    switch (action) {
      case 'click':
        return `
          ${baseScript}

          // Simulate mouse movement and hover first
          element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

          setTimeout(() => {
            const rect = element.getBoundingClientRect();
            const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 4;
            const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * 4;

            // Mouse down
            element.dispatchEvent(new MouseEvent('mousedown', {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y
            }));

            // Small delay for realistic interaction
            setTimeout(() => {
              // Mouse up and click
              element.dispatchEvent(new MouseEvent('mouseup', {
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
              }));

              element.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
              }));
            }, 50 + Math.random() * 100);
          }, 100 + Math.random() * 200);
        `;

      case 'focus':
        return `
          ${baseScript}

          // Simulate focus sequence
          element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
          element.focus();
          element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
        `;

      case 'hover':
        return `
          ${baseScript}

          // Simulate hover
          element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        `;

      default:
        return baseScript;
    }
  }

  /**
   * Generate JavaScript for smart form field detection
   */
  static generateFieldDetection(criteria: {
    fieldType?: string;
    labelText?: string;
    placeholder?: string;
    name?: string;
    nearbyText?: string;
  }): string {
    return `
      (function() {
        const results = [];

        // Strategy 1: Direct attribute matching
        ${criteria.name ? `
          document.querySelectorAll('input[name*="${criteria.name}"], select[name*="${criteria.name}"], textarea[name*="${criteria.name}"]')
            .forEach(el => results.push({ element: el, confidence: 0.9, strategy: 'name_match' }));
        ` : ''}

        ${criteria.placeholder ? `
          document.querySelectorAll('input[placeholder*="${criteria.placeholder}"]')
            .forEach(el => results.push({ element: el, confidence: 0.8, strategy: 'placeholder_match' }));
        ` : ''}

        // Strategy 2: Label association
        ${criteria.labelText ? `
          document.querySelectorAll('label')
            .filter(label => label.textContent.toLowerCase().includes('${criteria.labelText.toLowerCase()}'))
            .forEach(label => {
              // Try to find associated input
              const forId = label.getAttribute('for');
              if (forId) {
                const input = document.getElementById(forId);
                if (input) results.push({ element: input, confidence: 0.85, strategy: 'label_for' });
              }

              // Try to find input within label
              const inputInLabel = label.querySelector('input, select, textarea');
              if (inputInLabel) results.push({ element: inputInLabel, confidence: 0.8, strategy: 'label_nested' });

              // Try to find nearby input
              const nextInput = label.nextElementSibling;
              if (nextInput && ['INPUT', 'SELECT', 'TEXTAREA'].includes(nextInput.tagName)) {
                results.push({ element: nextInput, confidence: 0.7, strategy: 'label_sibling' });
              }
            });
        ` : ''}

        // Strategy 3: Nearby text matching
        ${criteria.nearbyText ? `
          document.querySelectorAll('input, select, textarea').forEach(field => {
            const parent = field.closest('div, td, li, section');
            if (parent && parent.textContent.toLowerCase().includes('${criteria.nearbyText.toLowerCase()}')) {
              results.push({ element: field, confidence: 0.6, strategy: 'nearby_text' });
            }
          });
        ` : ''}

        // Remove duplicates and sort by confidence
        const unique = [];
        const seen = new Set();

        results.forEach(result => {
          if (!seen.has(result.element)) {
            seen.add(result.element);
            unique.push(result);
          }
        });

        unique.sort((a, b) => b.confidence - a.confidence);

        return unique.map(result => ({
          selector: result.element.id ? '#' + result.element.id :
                   result.element.name ? '[name="' + result.element.name + '"]' :
                   result.element.tagName.toLowerCase() + ':nth-child(' + Array.from(result.element.parentNode.children).indexOf(result.element) + ')',
          confidence: result.confidence,
          strategy: result.strategy,
          elementInfo: {
            tagName: result.element.tagName,
            type: result.element.type,
            name: result.element.name,
            id: result.element.id,
            placeholder: result.element.placeholder
          }
        }));
      })();
    `;
  }
}
