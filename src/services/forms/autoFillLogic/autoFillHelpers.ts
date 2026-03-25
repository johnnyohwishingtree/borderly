/**
 * Auto-Fill Helpers — Lookup functions, mappings, and smart defaults
 */

import { Address } from '../../../types/profile';
import { FormField } from '../../../types/schema';
import { FormContext } from '../fieldMapper';
import { calculateStayDuration, isValidISODate } from '../../../utils/dateUtils';

/**
 * Helper function to determine if a value is valid for a field type.
 */
export function isValidFieldValue(value: unknown, fieldType: string): boolean {
  if (value === undefined || value === null || value === '') {
    return false;
  }

  switch (fieldType) {
    case 'text':
    case 'textarea':
      return typeof value === 'string' && value.trim().length > 0;
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'date':
      return typeof value === 'string' && isValidISODate(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'select':
      return typeof value === 'string' && value.length > 0;
    default:
      return false;
  }
}

/**
 * Smart purpose of visit prediction based on trip context.
 */
export function predictPurposeOfVisit(context: FormContext, _countryCode?: string): string | null {
  const leg = context.leg;

  const duration = calculateStayDuration(leg.arrivalDate, leg.departureDate);
  if (duration && duration <= 2) {
    return 'transit';
  }

  if (duration && duration > 30) {
    return 'visiting_relatives';
  }

  if (leg.accommodation?.name?.toLowerCase().includes('hotel')) {
    return 'tourism';
  }

  return 'tourism';
}

/**
 * Gets common stay duration for a country when departure date is unknown.
 */
export function getCommonStayDuration(countryCode?: string): number {
  switch (countryCode) {
    case 'JPN':
      return 14;
    case 'SGP':
      return 5;
    case 'MYS':
      return 7;
    default:
      return 10;
  }
}

/**
 * Converts ISO country code to display name for nationality fields.
 */
export function convertNationalityToDisplayName(countryCode: string): string {
  const nationalityMap: Record<string, string> = {
    'USA': 'United States',
    'GBR': 'United Kingdom',
    'JPN': 'Japan',
    'KOR': 'Republic of Korea',
    'CHN': 'China',
    'SGP': 'Singapore',
    'MYS': 'Malaysia',
    'AUS': 'Australia',
    'CAN': 'Canada',
    'DEU': 'Germany',
    'FRA': 'France',
    'ESP': 'Spain',
    'ITA': 'Italy',
    'NLD': 'Netherlands',
  };

  return nationalityMap[countryCode] || countryCode;
}

/**
 * Formats address according to country conventions.
 */
export function formatAddressForCountry(address: Address, countryCode?: string): string {
  const parts = [address.line1, address.line2, address.city, address.state, address.postalCode];
  const filteredParts = parts.filter(Boolean);

  switch (countryCode) {
    case 'JPN':
      return `${address.postalCode || ''} ${filteredParts.slice(0, -1).join(', ')}`.trim();
    case 'GBR':
      return filteredParts.join(', ');
    default:
      return filteredParts.join(', ');
  }
}

/**
 * Gets smart declaration defaults based on profile and common patterns.
 */
export function getSmartDeclarationDefault(field: FormField, context: FormContext): boolean | null {
  const fieldId = field.id.toLowerCase();
  const profile = context.profile;

  const defaults = profile.defaultDeclarations;

  if (defaults) {
    if (fieldId.includes('prohibited') || fieldId.includes('drugs') || fieldId.includes('weapons')) {
      return defaults.carryingProhibitedItems;
    }
    if (fieldId.includes('currency') || fieldId.includes('cash') || fieldId.includes('money')) {
      return defaults.carryingCurrency;
    }
    if (fieldId.includes('commercial') || fieldId.includes('business') || fieldId.includes('goods')) {
      return defaults.carryingCommercialGoods;
    }
    if (fieldId.includes('farm') || fieldId.includes('agriculture')) {
      return defaults.visitedFarm;
    }
    if (fieldId.includes('criminal') || fieldId.includes('conviction')) {
      return defaults.hasCriminalRecord;
    }
    if (fieldId.includes('declare') || fieldId.includes('duty')) {
      return defaults.hasItemsToDeclare;
    }
  }

  return null;
}

/**
 * Gets currency threshold information for a country.
 */
export function getCurrencyThreshold(countryCode?: string): number | null {
  const thresholds: Record<string, number> = {
    'JPN': 1000000,
    'USA': 10000,
    'SGP': 20000,
    'MYS': 10000,
  };

  return thresholds[countryCode || ''] || null;
}

/**
 * Extracts airline code from flight number.
 */
export function extractAirlineFromFlight(flightNumber: string): string | null {
  const match = flightNumber.match(/^([A-Z]{2,3})/);
  return match ? match[1] : null;
}

/**
 * Expands airline code to full airline name.
 */
export function expandAirlineName(airlineCode: string): string {
  const airlineMap: Record<string, string> = {
    'AA': 'American Airlines',
    'BA': 'British Airways',
    'NH': 'All Nippon Airways',
    'JL': 'Japan Airlines',
    'SQ': 'Singapore Airlines',
    'MH': 'Malaysia Airlines',
    'CX': 'Cathay Pacific',
    'LH': 'Lufthansa',
    'AF': 'Air France',
    'KL': 'KLM',
  };

  return airlineMap[airlineCode] || airlineCode;
}

/**
 * Gets smart default for select fields based on context.
 */
export function getSmartSelectDefault(field: FormField, context: FormContext): string | null {
  if (!field.options || field.options.length === 0) {
    return null;
  }

  const fieldId = field.id.toLowerCase();

  if (fieldId.includes('purpose') || fieldId.includes('reason')) {
    const predicted = predictPurposeOfVisit(context);
    if (predicted && field.options.some(opt => opt.value === predicted)) {
      return predicted;
    }
  }

  if (fieldId.includes('gender') || fieldId.includes('sex')) {
    const gender = context.profile.gender;
    const option = field.options.find(opt =>
      opt.value.toUpperCase() === gender ||
      opt.value.toLowerCase().startsWith(gender.toLowerCase())
    );
    return option?.value || null;
  }

  if (fieldId.includes('nationality') || fieldId.includes('country')) {
    const nationality = context.profile.nationality;
    const option = field.options.find(opt =>
      opt.value === nationality ||
      opt.label.toLowerCase().includes(nationality.toLowerCase())
    );
    return option?.value || null;
  }

  return null;
}
