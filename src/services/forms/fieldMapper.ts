import { TravelerProfile, Address } from '../../types/profile';
import { TripLeg } from '../../types/trip';

export interface FormContext {
  profile: TravelerProfile;
  leg: TripLeg;
}

// Memoization cache for path resolution
const pathResolutionCache = new Map<string, { value: unknown; timestamp: number }>();
const PATH_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Automatic cache cleanup interval
let pathCacheCleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Initializes automatic cache cleanup timer
 */
function initializePathCacheCleanup(): void {
  if (!pathCacheCleanupInterval) {
    pathCacheCleanupInterval = setInterval(clearExpiredPathCache, PATH_CACHE_TTL);
  }
}

/**
 * Stops automatic cache cleanup timer
 */
function stopPathCacheCleanup(): void {
  if (pathCacheCleanupInterval) {
    clearInterval(pathCacheCleanupInterval);
    pathCacheCleanupInterval = null;
  }
}

// Initialize cleanup on module load
initializePathCacheCleanup();

/**
 * Creates a simple hash of a string to avoid storing sensitive data in cache keys
 */
function createSimpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generates a secure cache key for path resolution
 */
function generatePathCacheKey(path: string, context: FormContext): string {
  // Use actual IDs or generate unique session-based identifiers
  const profileId = context.profile.id || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const legId = context.leg.id || `leg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
  const contextData = {
    profileId,
    legId,
    path,
    // Include relevant data for computed fields
    arrivalDate: context.leg.arrivalDate,
    departureDate: context.leg.departureDate,
    accommodationAddress: context.leg.accommodation?.address,
  };
  
  const contextStr = JSON.stringify(contextData);
  // Limit size to prevent DoS attacks while allowing legitimate path data
  if (contextStr.length > 25000) { // 25KB limit
    throw new Error('Path context data too large for caching');
  }
  
  const contextHash = createSimpleHash(contextStr);
  return `${path}:${contextHash}`;
}

/**
 * Resolves auto-fill source paths to actual values from profile and trip data.
 * Supports dot notation (e.g., "profile.passportNumber", "leg.accommodation.address.line1")
 * and computed fields (e.g., "leg._calculatedDuration", "leg.accommodation.address._formatted").
 * Uses memoization for optimal performance.
 */
export function resolveAutoFillPath(
  path: string,
  context: FormContext
): unknown {
  // Check cache first
  const cacheKey = generatePathCacheKey(path, context);
  const cached = pathResolutionCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < PATH_CACHE_TTL) {
    return cached.value;
  }
  
  const result = resolveAutoFillPathUncached(path, context);
  
  // Cache the result
  pathResolutionCache.set(cacheKey, {
    value: result,
    timestamp: Date.now(),
  });
  
  return result;
}

/**
 * Internal function that performs the actual path resolution without caching
 */
function resolveAutoFillPathUncached(
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
  if (path === '') {
    return context;
  }

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
    address.postalCode,
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
    resolveAutoFillPath(path, context);
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
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

/**
 * Clears expired entries from the path resolution cache
 */
export function clearExpiredPathCache(): void {
  const now = Date.now();
  for (const [key, entry] of pathResolutionCache.entries()) {
    if (now - entry.timestamp >= PATH_CACHE_TTL) {
      pathResolutionCache.delete(key);
    }
  }
}

/**
 * Clears all path resolution cache entries
 */
export function clearPathCache(): void {
  pathResolutionCache.clear();
  // Re-initialize cleanup timer after clearing
  stopPathCacheCleanup();
  initializePathCacheCleanup();
}

/**
 * Gets path resolution cache statistics
 */
export function getPathCacheStats(): { size: number } {
  return { size: pathResolutionCache.size };
}
