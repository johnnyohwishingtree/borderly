import { TravelerProfile } from '../../types/profile';
import { TripLeg, TravelerFormData } from '../../types/trip';
import { CountryFormSchema, FormField } from '../../types/schema';
import { resolveAutoFillPath, FormContext } from './fieldMapper';

// Cache for memoizing form generation results
interface FormCacheEntry {
  form: FilledForm;
  timestamp: number;
}

const formCache = new Map<string, FormCacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Memoization cache for field resolution
const fieldResolutionCache = new Map<string, { value: unknown; timestamp: number }>();
const FIELD_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export interface FilledFormField extends FormField {
  currentValue: unknown;
  source: 'auto' | 'user' | 'default' | 'empty';
  needsUserInput: boolean;
}

export interface FilledFormSection {
  id: string;
  title: string;
  fields: FilledFormField[];
}

export interface FilledForm {
  countryCode: string;
  countryName: string;
  portalName: string;
  portalUrl: string;
  sections: FilledFormSection[];
  stats: FormStats;
}

export interface FormStats {
  totalFields: number;
  autoFilled: number;
  userFilled: number;
  remaining: number;
  completionPercentage: number;
}

/**
 * Generates a cache key for the form based on input parameters
 */
function generateCacheKey(
  profile: TravelerProfile,
  leg: TripLeg,
  schema: CountryFormSchema,
  existingFormData?: Record<string, unknown>
): string {
  const profileId = profile.id || 'default';
  const legId = leg.id || `${leg.destinationCountry}-${leg.arrivalDate}`;
  const existingDataHash = existingFormData 
    ? JSON.stringify(existingFormData)
    : undefined;
  
  return `${profileId}:${legId}:${schema.schemaVersion}${existingDataHash ? ':' + existingDataHash : ''}`;
}

/**
 * Checks if a cache entry is still valid
 */
function isCacheEntryValid(entry: FormCacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * Core form generation engine. Takes a traveler profile, trip leg, and country schema
 * to produce a filled form with auto-populated data and tracking of what needs user input.
 * Uses memoization and caching for optimal performance.
 */
export function generateFilledForm(
  profile: TravelerProfile,
  leg: TripLeg,
  schema: CountryFormSchema,
  existingFormData?: Record<string, unknown>
): FilledForm {
  // Check cache first
  const cacheKey = generateCacheKey(profile, leg, schema, existingFormData);
  const cachedEntry = formCache.get(cacheKey);
  
  if (cachedEntry && isCacheEntryValid(cachedEntry)) {
    return cachedEntry.form;
  }
  const context: FormContext = { profile, leg };
  let autoFilled = 0;
  let userFilled = 0;
  let remaining = 0;
  let totalFields = 0;

  const sections: FilledFormSection[] = schema.sections.map(section => ({
    id: section.id,
    title: section.title,
    fields: section.fields.map(field => {
      totalFields++;
      return processFormFieldWithCache(field, context, existingFormData);
    }),
  }));

  // Count field statistics
  sections.forEach(section => {
    section.fields.forEach(field => {
      switch (field.source) {
        case 'auto':
          autoFilled++;
          break;
        case 'user':
          userFilled++;
          break;
        default:
          remaining++;
          break;
      }
    });
  });

  const completionPercentage = totalFields > 0
    ? Math.round(((autoFilled + userFilled) / totalFields) * 100)
    : 0;

  const result = {
    countryCode: schema.countryCode,
    countryName: schema.countryName,
    portalName: schema.portalName,
    portalUrl: schema.portalUrl,
    sections,
    stats: {
      totalFields,
      autoFilled,
      userFilled,
      remaining,
      completionPercentage,
    },
  };

  // Cache the result
  formCache.set(cacheKey, {
    form: result,
    timestamp: Date.now(),
  });

  return result;
}

/**
 * Generates a cache key for field resolution
 */
function generateFieldCacheKey(
  field: FormField,
  context: FormContext,
  existingFormData?: Record<string, unknown>
): string {
  const contextHash = JSON.stringify({
    profileId: context.profile.id || 'default',
    legId: context.leg.id || `${context.leg.destinationCountry}-${context.leg.arrivalDate}`,
    autoFillSource: field.autoFillSource,
    existingValue: existingFormData?.[field.id],
  });
  
  return `${field.id}:${contextHash}`;
}

/**
 * Processes a single form field with caching to determine its value and source.
 */
function processFormFieldWithCache(
  field: FormField,
  context: FormContext,
  existingFormData?: Record<string, unknown>
): FilledFormField {
  // Check field resolution cache
  const fieldCacheKey = generateFieldCacheKey(field, context, existingFormData);
  const cachedField = fieldResolutionCache.get(fieldCacheKey);
  
  if (cachedField && Date.now() - cachedField.timestamp < FIELD_CACHE_TTL) {
    return cachedField.value as FilledFormField;
  }
  
  const result = processFormField(field, context, existingFormData);
  
  // Cache the result
  fieldResolutionCache.set(fieldCacheKey, {
    value: result,
    timestamp: Date.now(),
  });
  
  return result;
}

/**
 * Processes a single form field to determine its value and source.
 */
function processFormField(
  field: FormField,
  context: FormContext,
  existingFormData?: Record<string, unknown>
): FilledFormField {
  // Check if user already provided this value
  if (existingFormData?.[field.id] !== undefined) {
    const userValue = existingFormData[field.id];
    return {
      ...field,
      currentValue: userValue,
      source: 'user',
      needsUserInput: false,
    };
  }

  // Try auto-fill from profile/trip
  if (field.autoFillSource) {
    const resolved = resolveAutoFillPath(field.autoFillSource, context);
    if (isValidFieldValue(resolved, field.type)) {
      return {
        ...field,
        currentValue: resolved,
        source: 'auto',
        needsUserInput: false,
      };
    }
  }

  // Field needs user input - set appropriate default value
  const defaultValue = getDefaultValue(field);
  const isEmpty = defaultValue === '' || defaultValue === null || defaultValue === undefined;

  return {
    ...field,
    currentValue: defaultValue,
    source: isEmpty ? 'empty' : 'default',
    needsUserInput: true,
  };
}

/**
 * Checks if a resolved value is valid for a given field type.
 */
function isValidFieldValue(value: unknown, fieldType: string): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  switch (fieldType) {
    case 'text':
    case 'textarea':
      return typeof value === 'string' && value.trim().length > 0;

    case 'number':
      return typeof value === 'number' && !isNaN(value);

    case 'date':
      if (typeof value === 'string') {
        return !isNaN(Date.parse(value));
      }
      return value instanceof Date && !isNaN(value.getTime());

    case 'boolean':
      return typeof value === 'boolean';

    case 'select':
      return typeof value === 'string' && value.length > 0;

    default:
      return false;
  }
}

/**
 * Gets the appropriate default value for a field type.
 */
function getDefaultValue(field: FormField): unknown {
  switch (field.type) {
    case 'boolean':
      return false;

    case 'number':
      return field.validation?.min ?? 0;

    case 'select':
      return field.options?.[0]?.value ?? '';

    case 'text':
    case 'textarea':
    case 'date':
    default:
      return '';
  }
}

/**
 * Updates form data with new user input for a specific field.
 */
export function updateFormData(
  currentFormData: Record<string, unknown>,
  fieldId: string,
  value: unknown
): Record<string, unknown> {
  return {
    ...currentFormData,
    [fieldId]: value,
  };
}

/**
 * Validates that all required fields in a form have values.
 */
export function validateFormCompletion(form: FilledForm): {
  isComplete: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  form.sections.forEach(section => {
    section.fields.forEach(field => {
      if (field.required && field.needsUserInput) {
        missingFields.push(field.id);
      }
    });
  });

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Gets only the country-specific fields that need user input.
 * This implements the "Smart Delta" feature - only show fields unique to this country.
 */
export function getCountrySpecificFields(form: FilledForm): FilledFormField[] {
  const countrySpecificFields: FilledFormField[] = [];

  form.sections.forEach(section => {
    section.fields.forEach(field => {
      if (field.countrySpecific && field.needsUserInput) {
        countrySpecificFields.push(field);
      }
    });
  });

  return countrySpecificFields;
}

/**
 * Exports form data in a format suitable for copying to government portals.
 */
export function exportFormData(form: FilledForm): Record<string, unknown> {
  const exportData: Record<string, unknown> = {};

  form.sections.forEach(section => {
    section.fields.forEach(field => {
      // Only export fields that have meaningful values (not defaults for empty fields)
      const hasValue = field.currentValue !== '' &&
                      field.currentValue !== null &&
                      field.currentValue !== undefined;

      const isAutoOrUserFilled = field.source === 'auto' || field.source === 'user';

      if (hasValue && isAutoOrUserFilled) {
        exportData[field.id] = field.currentValue;
      }
    });
  });

  return exportData;
}

/**
 * Calculates form completion statistics for progress tracking.
 */
export function calculateFormProgress(form: FilledForm): {
  totalSections: number;
  completedSections: number;
  sectionProgress: { sectionId: string; completed: number; total: number }[];
} {
  const sectionProgress = form.sections.map(section => {
    const total = section.fields.filter(f => f.required).length;
    const completed = section.fields.filter(f => f.required && !f.needsUserInput).length;

    return {
      sectionId: section.id,
      completed,
      total,
    };
  });

  const completedSections = sectionProgress.filter(s => s.completed === s.total).length;

  return {
    totalSections: form.sections.length,
    completedSections,
    sectionProgress,
  };
}

/**
 * Clears expired entries from the form cache to prevent memory leaks
 */
export function clearExpiredFormCache(): void {
  const now = Date.now();
  for (const [key, entry] of formCache.entries()) {
    if (now - entry.timestamp >= CACHE_TTL) {
      formCache.delete(key);
    }
  }
}

/**
 * Clears expired entries from the field resolution cache
 */
export function clearExpiredFieldCache(): void {
  const now = Date.now();
  for (const [key, entry] of fieldResolutionCache.entries()) {
    if (now - entry.timestamp >= FIELD_CACHE_TTL) {
      fieldResolutionCache.delete(key);
    }
  }
}

/**
 * Clears all caches (useful for testing or when profile data changes significantly)
 */
export function clearAllCaches(): void {
  formCache.clear();
  fieldResolutionCache.clear();
}

/**
 * Gets cache statistics for monitoring and debugging
 */
export function getCacheStats(): {
  formCache: { size: number; hitRate?: number };
  fieldCache: { size: number; hitRate?: number };
} {
  return {
    formCache: { size: formCache.size },
    fieldCache: { size: fieldResolutionCache.size },
  };
}

/**
 * Generates filled forms for all assigned travelers on a trip leg.
 * Returns a map of traveler ID to their filled form.
 */
export function generateFilledFormsForAllTravelers(
  travelers: TravelerProfile[],
  leg: TripLeg,
  schema: CountryFormSchema,
  existingTravelerForms?: TravelerFormData[]
): Map<string, FilledForm> {
  const formsMap = new Map<string, FilledForm>();
  const assignedTravelers = leg.assignedTravelers || [];

  for (const travelerId of assignedTravelers) {
    const traveler = travelers.find(t => t.id === travelerId);
    if (!traveler) {
      console.warn(`Traveler with ID ${travelerId} not found`);
      continue;
    }

    const existingFormData = existingTravelerForms?.find(
      t => t.travelerId === travelerId
    )?.formData;

    const filledForm = generateFilledForm(
      traveler,
      leg,
      schema,
      existingFormData
    );

    formsMap.set(travelerId, filledForm);
  }

  return formsMap;
}

/**
 * Generates a filled form for a specific traveler on a trip leg.
 * This is a convenience function that wraps generateFilledForm with traveler lookup.
 */
export function generateFilledFormForTraveler(
  travelerId: string,
  travelers: TravelerProfile[],
  leg: TripLeg,
  schema: CountryFormSchema,
  existingFormData?: Record<string, unknown>
): FilledForm | null {
  const traveler = travelers.find(t => t.id === travelerId);
  if (!traveler) {
    console.warn(`Traveler with ID ${travelerId} not found`);
    return null;
  }

  return generateFilledForm(traveler, leg, schema, existingFormData);
}

/**
 * Gets the form status for a specific traveler on a trip leg.
 */
export function getTravelerFormStatus(
  travelerId: string,
  leg: TripLeg
): 'not_started' | 'in_progress' | 'ready' | 'submitted' {
  const travelerFormData = leg.travelerFormsData?.find(
    t => t.travelerId === travelerId
  );
  
  return travelerFormData?.formStatus || 'not_started';
}

/**
 * Updates form data for a specific traveler on a trip leg.
 */
export function updateTravelerFormData(
  travelerId: string,
  leg: TripLeg,
  fieldId: string,
  value: unknown
): TripLeg {
  const updatedLeg = { ...leg };
  
  if (!updatedLeg.travelerFormsData) {
    updatedLeg.travelerFormsData = [];
  }

  const existingTravelerIndex = updatedLeg.travelerFormsData.findIndex(
    t => t.travelerId === travelerId
  );

  if (existingTravelerIndex >= 0) {
    // Update existing traveler form data
    updatedLeg.travelerFormsData[existingTravelerIndex] = {
      ...updatedLeg.travelerFormsData[existingTravelerIndex],
      formData: updateFormData(
        updatedLeg.travelerFormsData[existingTravelerIndex].formData,
        fieldId,
        value
      ),
    };
  } else {
    // Create new traveler form data
    updatedLeg.travelerFormsData.push({
      travelerId,
      formData: { [fieldId]: value },
      formStatus: 'in_progress',
    });
  }

  return updatedLeg;
}

/**
 * Updates the form status for a specific traveler on a trip leg.
 */
export function updateTravelerFormStatus(
  travelerId: string,
  leg: TripLeg,
  status: 'not_started' | 'in_progress' | 'ready' | 'submitted'
): TripLeg {
  const updatedLeg = { ...leg };
  
  if (!updatedLeg.travelerFormsData) {
    updatedLeg.travelerFormsData = [];
  }

  const existingTravelerIndex = updatedLeg.travelerFormsData.findIndex(
    t => t.travelerId === travelerId
  );

  if (existingTravelerIndex >= 0) {
    updatedLeg.travelerFormsData[existingTravelerIndex] = {
      ...updatedLeg.travelerFormsData[existingTravelerIndex],
      formStatus: status,
    };
  } else {
    // Create new traveler form data with the status
    updatedLeg.travelerFormsData.push({
      travelerId,
      formData: {},
      formStatus: status,
    });
  }

  return updatedLeg;
}

/**
 * Gets the overall form status for a trip leg considering all assigned travelers.
 */
export function getOverallLegFormStatus(
  leg: TripLeg
): 'not_started' | 'in_progress' | 'ready' | 'submitted' {
  const assignedTravelers = leg.assignedTravelers || [];
  
  if (assignedTravelers.length === 0) {
    return 'not_started';
  }

  const statuses = assignedTravelers.map(travelerId => 
    getTravelerFormStatus(travelerId, leg)
  );

  // If all are submitted, overall is submitted
  if (statuses.every(status => status === 'submitted')) {
    return 'submitted';
  }

  // If all are ready, overall is ready
  if (statuses.every(status => status === 'ready')) {
    return 'ready';
  }

  // If any are started, overall is in progress
  if (statuses.some(status => status === 'in_progress' || status === 'ready')) {
    return 'in_progress';
  }

  return 'not_started';
}
