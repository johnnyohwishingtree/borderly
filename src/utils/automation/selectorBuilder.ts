/**
 * Selector building utilities for WebView automation
 */

// Type declaration for CSS.escape
declare global {
  interface Window {
    CSS?: {
      escape(value: string): string;
    };
  }
}

// For non-browser environments
interface CSS {
  escape(value: string): string;
}

declare const CSS: CSS | undefined;

// Fallback for CSS.escape when not available
const cssEscape = (value: string): string => {
  if (typeof CSS !== 'undefined' && CSS?.escape) {
    return CSS.escape(value);
  }
  // Simple CSS escape fallback for server/test environments
  return value.replace(/[!"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~]/g, '\\$&');
};

export class SelectorBuilder {
  /**
   * Build a CSS selector with fallbacks
   */
  static buildSelector(options: {
    id?: string;
    className?: string;
    tagName?: string;
    attributes?: Record<string, string>;
    text?: string;
    parent?: string;
    index?: number;
  }): string {
    const selectors = [];

    // ID selector (highest priority)
    if (options.id) {
      selectors.push(`#${this.escape(options.id)}`);
    }

    // Class selector
    if (options.className) {
      const classes = options.className.split(/\s+/).filter(c => c.trim());
      if (classes.length > 0) {
        selectors.push(`.${classes.map(c => this.escape(c)).join('.')}`);
      }
    }

    // Tag with attributes
    if (options.tagName) {
      let tagSelector = options.tagName.toLowerCase();

      if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
          tagSelector += `[${this.escape(key)}="${this.escape(value)}"]`;
        });
      }

      selectors.push(tagSelector);
    }

    // Text content selector
    if (options.text) {
      selectors.push(`*:contains("${this.escape(options.text)}")`);
    }

    // Parent context
    if (options.parent) {
      return selectors.map(s => `${options.parent} ${s}`).join(', ');
    }

    // Add index if specified
    if (options.index !== undefined) {
      return selectors.map(s => `${s}:nth-child(${options.index})`).join(', ');
    }

    return selectors.join(', ');
  }

  /**
   * Build form field selector with common patterns
   */
  static buildFormFieldSelector(fieldInfo: {
    name?: string;
    id?: string;
    label?: string;
    type?: string;
    placeholder?: string;
  }): string {
    const selectors = [];

    // By name attribute
    if (fieldInfo.name) {
      const escapedName = fieldInfo.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      selectors.push(`input[name="${escapedName}"]`);
      selectors.push(`select[name="${escapedName}"]`);
      selectors.push(`textarea[name="${escapedName}"]`);
    }

    // By ID
    if (fieldInfo.id) {
      selectors.push(`#${cssEscape(fieldInfo.id)}`);
    }

    // By associated label
    if (fieldInfo.label) {
      selectors.push(`label:contains("${cssEscape(fieldInfo.label)}") input`);
      selectors.push(`label:contains("${cssEscape(fieldInfo.label)}") select`);
      selectors.push(`label:contains("${cssEscape(fieldInfo.label)}") textarea`);
    }

    // By type and placeholder
    if (fieldInfo.type && fieldInfo.placeholder) {
      selectors.push(`input[type="${fieldInfo.type}"][placeholder*="${cssEscape(fieldInfo.placeholder)}"]`);
    }

    return selectors.join(', ');
  }

  /**
   * Escape CSS selector for safe injection
   */
  static escape(value: string): string {
    // Polyfill for CSS.escape if not available
    if (typeof CSS !== 'undefined' && CSS.escape) {
      return CSS.escape(value);
    }

    // Manual escaping for special characters
    return value.replace(/[!"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~]/g, '\\$&');
  }
}
