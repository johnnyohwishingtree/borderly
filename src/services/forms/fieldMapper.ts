import { TravelerProfile, Address } from '../../types/profile';
import { TripLeg } from '../../types/trip';

export interface FormContext {
  profile: TravelerProfile;
  leg: TripLeg;
}

/**
 * Resolves auto-fill source paths to actual values from profile and trip data.
 * Supports dot notation (e.g., "profile.passportNumber", "leg.accommodation.address.line1")
 * and computed fields (e.g., "leg._calculatedDuration", "leg.accommodation.address._formatted").
 */
export function resolveAutoFillPath(
  path: string,
  context: FormContext
): unknown {
  // Handle computed fields first
  if (path === 'leg._calculatedDuration') {
    return calculateDuration(context.leg.arrivalDate, context.leg.departureDate);
  }
  
  if (path === 'leg.accommodation.address._formatted') {
    return formatAddress(context.leg.accommodation.address);
  }

  // Handle dot-notation paths
  const parts = path.split('.');
  let current: unknown = context;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    
    if (typeof current !== 'object') {
      return undefined;
    }
    
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Calculates the duration of stay in days from arrival to departure date.
 */
function calculateDuration(arrival: string, departure?: string): number | undefined {
  if (!departure) {
    return undefined;
  }
  
  try {
    const arrivalDate = new Date(arrival);
    const departureDate = new Date(departure);
    
    if (isNaN(arrivalDate.getTime()) || isNaN(departureDate.getTime())) {
      return undefined;
    }
    
    const diffTime = departureDate.getTime() - arrivalDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Return positive duration or undefined for invalid dates
    return diffDays > 0 ? diffDays : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Formats an address object into a single string for form display.
 */
function formatAddress(address?: Address): string | undefined {
  if (!address) {
    return undefined;
  }
  
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * Validates that a path can be resolved without throwing errors.
 * Useful for testing and debugging auto-fill configurations.
 */
export function validateAutoFillPath(
  path: string,
  context: FormContext
): { isValid: boolean; error?: string } {
  try {
    const result = resolveAutoFillPath(path, context);
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Gets all available paths from a context object for debugging/testing.
 * Returns a flat list of all accessible dot-notation paths.
 */
export function getAvailablePaths(obj: unknown, prefix = ''): string[] {
  const paths: string[] = [];
  
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return paths;
  }
  
  const target = obj as Record<string, unknown>;
  
  for (const [key, value] of Object.entries(target)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    paths.push(currentPath);
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...getAvailablePaths(value, currentPath));
    }
  }
  
  return paths;
}