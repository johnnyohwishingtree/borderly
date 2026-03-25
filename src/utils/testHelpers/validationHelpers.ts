/**
 * Validation Helpers
 */

import { FilledForm } from '../../services/forms/formEngine';

export class ValidationHelpers {
  /**
   * Validates that an object contains no PII
   */
  static validateNoPII(obj: any): { isClean: boolean; foundPII: string[] } {
    const piiPatterns = [
      { name: 'Email', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
      { name: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
      { name: 'Credit Card', pattern: /\b\d{16}\b/g },
      { name: 'Phone', pattern: /\b\+?[\d\s\-\(\)]{10,}\b/g }
    ];

    const foundPII: string[] = [];
    const jsonString = JSON.stringify(obj);

    for (const { name, pattern } of piiPatterns) {
      if (pattern.test(jsonString)) {
        foundPII.push(name);
      }
    }

    return {
      isClean: foundPII.length === 0,
      foundPII
    };
  }

  /**
   * Validates form completion percentage
   */
  static validateFormCompletion(form: FilledForm): {
    isValid: boolean;
    expectedPercentage: number;
    actualPercentage: number;
  } {
    const { totalFields, autoFilled, userFilled } = form.stats;
    const completed = autoFilled + userFilled;
    const expectedPercentage = totalFields > 0 ? (completed / totalFields) * 100 : 0;

    return {
      isValid: Math.abs(form.stats.completionPercentage - expectedPercentage) < 0.01,
      expectedPercentage,
      actualPercentage: form.stats.completionPercentage
    };
  }

  /**
   * Validates country code format
   */
  static validateCountryCode(countryCode: string): boolean {
    return /^[A-Z]{3}$/.test(countryCode);
  }

  /**
   * Validates date format
   */
  static validateDateFormat(date: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
  }

  /**
   * Validates URL format
   */
  static validateURL(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('https://');
    } catch {
      return false;
    }
  }
}
