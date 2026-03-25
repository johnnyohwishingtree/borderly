/**
 * Intelligent auto-fill logic for travel forms.
 * Provides smart defaults, fallbacks, and contextual auto-filling based on
 * profile data, trip information, and country-specific requirements.
 */

import { FormField } from '../../../types/schema';
import { resolveAutoFillPath, FormContext } from '../fieldMapper';
import { calculateStayDuration } from '../../../utils/dateUtils';
import {
  isValidFieldValue,
  predictPurposeOfVisit,
  getCommonStayDuration,
  convertNationalityToDisplayName,
  formatAddressForCountry,
  getSmartDeclarationDefault,
  getCurrencyThreshold,
  extractAirlineFromFlight,
  expandAirlineName,
  getSmartSelectDefault,
} from './autoFillHelpers';

export interface AutoFillResult {
  value: unknown;
  source: 'profile' | 'trip' | 'computed' | 'default' | 'smart';
  confidence: number; // 0-1, higher means more confident in the auto-fill
}

export interface AutoFillOptions {
  enableSmartDefaults: boolean;
  enableFallbacks: boolean;
  confidenceThreshold: number; // Minimum confidence to auto-fill (default 0.7)
  countryCode?: string;
}

/**
 * Enhanced auto-fill engine that provides intelligent field population.
 */
export function intelligentAutoFill(
  field: FormField,
  context: FormContext,
  options: AutoFillOptions = {
    enableSmartDefaults: true,
    enableFallbacks: true,
    confidenceThreshold: 0.7,
  }
): AutoFillResult | null {
  // First, try standard auto-fill from profile/trip data
  if (field.autoFillSource) {
    const standardResult = tryStandardAutoFill(field, context);
    if (standardResult) {
      return standardResult;
    }
  }

  // If standard auto-fill fails, try smart alternatives
  if (options.enableSmartDefaults) {
    const smartResult = trySmartAutoFill(field, context, options.countryCode);
    if (smartResult && smartResult.confidence >= options.confidenceThreshold) {
      return smartResult;
    }
  }

  // Try fallback logic
  if (options.enableFallbacks) {
    const fallbackResult = tryFallbackAutoFill(field, context);
    if (fallbackResult && fallbackResult.confidence >= options.confidenceThreshold) {
      return fallbackResult;
    }
  }

  // Finally, try default values
  const defaultResult = getDefaultAutoFill(field, context);
  if (defaultResult && defaultResult.confidence >= options.confidenceThreshold) {
    return defaultResult;
  }

  return null;
}

/**
 * Tries standard auto-fill from autoFillSource.
 */
function tryStandardAutoFill(field: FormField, context: FormContext): AutoFillResult | null {
  if (!field.autoFillSource) {
    return null;
  }

  try {
    const value = resolveAutoFillPath(field.autoFillSource, context);
    if (isValidFieldValue(value, field.type)) {
      return {
        value,
        source: field.autoFillSource.startsWith('profile.') ? 'profile' : 
                field.autoFillSource.startsWith('leg.') && !field.autoFillSource.includes('_calculated') ? 'trip' : 'computed',
        confidence: 0.95,
      };
    }
  } catch {
    // Fall through to other methods
  }

  return null;
}

/**
 * Tries smart auto-fill using contextual intelligence.
 */
function trySmartAutoFill(
  field: FormField,
  context: FormContext,
  countryCode?: string
): AutoFillResult | null {
  const fieldId = field.id.toLowerCase();

  // Smart nationality mapping
  if (fieldId.includes('nationality') || fieldId.includes('citizenship')) {
    const nationality = context.profile.nationality;
    if (nationality && nationality.length === 3) {
      return {
        value: convertNationalityToDisplayName(nationality),
        source: 'smart',
        confidence: 0.9,
      };
    }
  }

  // Smart purpose of visit prediction
  if (fieldId.includes('purpose') || fieldId.includes('reason')) {
    const purpose = predictPurposeOfVisit(context, countryCode);
    if (purpose) {
      return {
        value: purpose,
        source: 'smart',
        confidence: 0.8,
      };
    }
  }

  // Smart duration calculation with fallbacks
  if (fieldId.includes('duration') || fieldId.includes('stay') || fieldId.includes('days')) {
    const duration = calculateStayDuration(context.leg.arrivalDate, context.leg.departureDate);
    if (duration) {
      return {
        value: duration,
        source: 'computed',
        confidence: 0.95,
      };
    }
    // Fallback to common duration if no departure date
    return {
      value: getCommonStayDuration(countryCode),
      source: 'smart',
      confidence: 0.75,
    };
  }

  // Smart address formatting
  if (fieldId.includes('address') && !fieldId.includes('hotel') && !fieldId.includes('accommodation')) {
    const homeAddress = context.profile.homeAddress;
    if (homeAddress) {
      return {
        value: formatAddressForCountry(homeAddress, countryCode),
        source: 'smart',
        confidence: 0.85,
      };
    }
  }

  // Smart declaration defaults based on profile
  if (fieldId.includes('declare') || fieldId.includes('carrying') || fieldId.includes('bringing')) {
    const defaultValue = getSmartDeclarationDefault(field, context);
    if (defaultValue !== null) {
      return {
        value: defaultValue,
        source: 'smart',
        confidence: 0.9,
      };
    }
  }

  // Smart currency threshold detection
  if (fieldId.includes('currency') || fieldId.includes('cash') || fieldId.includes('money')) {
    const threshold = getCurrencyThreshold(countryCode);
    if (threshold && field.type === 'boolean') {
      return {
        value: false, // Most travelers don't exceed thresholds
        source: 'smart',
        confidence: 0.85,
      };
    }
  }

  // Smart flight information extraction
  if (fieldId.includes('airline') && context.leg.flightNumber) {
    const airlineCode = extractAirlineFromFlight(context.leg.flightNumber);
    if (airlineCode) {
      return {
        value: fieldId.includes('code') ? airlineCode : expandAirlineName(airlineCode),
        source: 'smart',
        confidence: 0.9,
      };
    }
  }

  return null;
}

/**
 * Tries fallback auto-fill using related data.
 */
function tryFallbackAutoFill(field: FormField, context: FormContext): AutoFillResult | null {
  // Fallback name fields to each other
  if (field.id === 'firstName' || field.id === 'givenName') {
    const givenNames = context.profile.givenNames;
    if (givenNames) {
      return {
        value: givenNames.split(' ')[0], // Use first name only
        source: 'profile',
        confidence: 0.8,
      };
    }
  }

  if (field.id === 'lastName' || field.id === 'familyName') {
    return {
      value: context.profile.surname,
      source: 'profile',
      confidence: 0.95,
    };
  }

  // Fallback contact info to profile
  if (field.id.includes('email') && context.profile.email) {
    return {
      value: context.profile.email,
      source: 'profile',
      confidence: 0.9,
    };
  }

  if (field.id.includes('phone') && context.profile.phoneNumber) {
    return {
      value: context.profile.phoneNumber,
      source: 'profile',
      confidence: 0.9,
    };
  }

  return null;
}

/**
 * Gets default values with intelligent defaults.
 */
function getDefaultAutoFill(field: FormField, context: FormContext): AutoFillResult | null {
  switch (field.type) {
    case 'boolean':
      // Smart boolean defaults
      if (field.id.includes('criminal') || field.id.includes('prohibited') || field.id.includes('drugs')) {
        return { value: false, source: 'default', confidence: 0.95 };
      }
      if (field.id.includes('business') || field.id.includes('commercial')) {
        return { value: false, source: 'default', confidence: 0.8 };
      }
      return { value: false, source: 'default', confidence: 0.7 };

    case 'select':
      // Smart select defaults
      if (field.options && field.options.length > 0) {
        const smartOption = getSmartSelectDefault(field, context);
        if (smartOption) {
          return { value: smartOption, source: 'smart', confidence: 0.75 };
        }
        return { value: field.options[0].value, source: 'default', confidence: 0.5 };
      }
      break;

    case 'number':
      if (field.id.includes('duration') || field.id.includes('days')) {
        return { value: 7, source: 'default', confidence: 0.6 }; // Common week-long trip
      }
      if (field.validation?.min !== undefined) {
        return { value: field.validation.min, source: 'default', confidence: 0.5 };
      }
      break;

    case 'date':
      if (field.id.includes('arrival')) {
        return { value: context.leg.arrivalDate, source: 'trip', confidence: 0.95 };
      }
      if (field.id.includes('departure') && context.leg.departureDate) {
        return { value: context.leg.departureDate, source: 'trip', confidence: 0.95 };
      }
      break;
  }

  return null;
}

/**
 * Calculates auto-fill confidence metrics for a form.
 */
export function calculateAutoFillMetrics(
  fields: FormField[],
  context: FormContext,
  options?: AutoFillOptions
): {
  autoFillableFields: number;
  totalFields: number;
  averageConfidence: number;
  highConfidenceFields: number;
} {
  let autoFillableFields = 0;
  let totalConfidence = 0;
  let highConfidenceFields = 0;

  for (const field of fields) {
    const result = intelligentAutoFill(field, context, options);
    if (result) {
      autoFillableFields++;
      totalConfidence += result.confidence;
      if (result.confidence >= 0.8) {
        highConfidenceFields++;
      }
    }
  }

  return {
    autoFillableFields,
    totalFields: fields.length,
    averageConfidence: autoFillableFields > 0 ? totalConfidence / autoFillableFields : 0,
    highConfidenceFields,
  };
}

/**
 * Batch auto-fill for multiple fields with optimization.
 */
export function batchAutoFill(
  fields: FormField[],
  context: FormContext,
  options?: AutoFillOptions
): Record<string, AutoFillResult> {
  const results: Record<string, AutoFillResult> = {};

  for (const field of fields) {
    const result = intelligentAutoFill(field, context, options);
    if (result) {
      results[field.id] = result;
    }
  }

  return results;
}
