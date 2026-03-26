import type { TravelerProfile } from '../types/profile';
import type { TravelerFormData, TripLeg } from '../types/trip';
import type { TravelerTab } from '../components/trips/TravelerTabs';
import type { CountryFormSchema } from '../types';
import { schemaRegistry } from '../services/schemas/schemaRegistry';
import { stripPIIFromFormData } from '../utils/piiSanitizer';
import { ERROR_CODES, createAppError, type AppError } from '../services/error/errorHandling';

/**
 * Derives the leg-level formStatus from the individual travelers' statuses.
 * - 'ready'       if ALL assigned travelers have formStatus 'ready' or 'submitted'
 * - 'in_progress' if at least one traveler has started ('in_progress', 'ready', or 'submitted')
 * - 'not_started' otherwise
 *
 * Exported for unit testing.
 */
export function deriveLegFormStatus(
  assignedTravelers: string[],
  updatedForms: TravelerFormData[],
): 'not_started' | 'in_progress' | 'ready' {
  if (assignedTravelers.length === 0) return 'not_started';

  const allReady = assignedTravelers.every(id => {
    const form = updatedForms.find(f => f.travelerId === id);
    return form?.formStatus === 'ready' || form?.formStatus === 'submitted';
  });

  if (allReady) return 'ready';

  const anyStarted = assignedTravelers.some(id => {
    const formStatus = updatedForms.find(f => f.travelerId === id)?.formStatus;
    // Any status other than 'not_started' implies the form has been touched.
    return formStatus && formStatus !== 'not_started';
  });

  return anyStarted ? 'in_progress' : 'not_started';
}

/**
 * Upserts a traveler's form entry in the travelerFormsData array.
 * If an entry for the traveler already exists, it is updated in-place;
 * otherwise a new entry is appended.
 */
export function upsertTravelerFormData(
  existingForms: TravelerFormData[],
  travelerId: string,
  formData: Record<string, unknown>,
  formStatus: TravelerFormData['formStatus'],
  completionPercentage: number,
): TravelerFormData[] {
  const updated = existingForms.map<TravelerFormData>(tf =>
    tf.travelerId === travelerId
      ? { ...tf, formData, formStatus, completionPercentage }
      : tf
  );
  if (!existingForms.find(tf => tf.travelerId === travelerId)) {
    updated.push({ travelerId, formData, formStatus, completionPercentage });
  }
  return updated;
}

/**
 * Loads and validates the schema for a given country, returning an error if not found.
 */
export function loadSchemaOrError(
  destinationCountry: string,
): { schema: CountryFormSchema } | { error: AppError } {
  const schema = schemaRegistry.getSchema(destinationCountry);
  if (!schema) {
    return {
      error: createAppError(
        ERROR_CODES.PARSING_ERROR,
        `Schema not found for ${destinationCountry}`,
        `Form template for ${destinationCountry} is not available. Please contact support.`,
      ),
    };
  }
  return { schema };
}

/**
 * Persists form data to the trip leg — handles both single- and multi-traveler cases.
 * Strips PII before persisting to WatermelonDB.
 */
export async function persistFormData(opts: {
  leg: TripLeg;
  rawFormData: Record<string, unknown>;
  isValid: boolean;
  hasMultipleTravelers: boolean;
  activeTravelerId: string | null;
  assignedTravelers: string[];
  getLegById: (id: string) => TripLeg | null | undefined;
  legId: string;
  updateTripLeg: (id: string, updates: Partial<TripLeg>) => Promise<void>;
  completionPercentage: number;
  statusOverride?: TravelerFormData['formStatus'];
}): Promise<void> {
  const formDataToSave = stripPIIFromFormData(opts.rawFormData);
  const status = opts.statusOverride ?? (opts.isValid ? 'ready' : 'in_progress');

  if (opts.hasMultipleTravelers && opts.activeTravelerId) {
    const freshLeg = opts.getLegById(opts.legId);
    const existingForms: TravelerFormData[] = freshLeg?.travelerFormsData ?? [];
    const updatedForms = upsertTravelerFormData(
      existingForms,
      opts.activeTravelerId,
      formDataToSave,
      status,
      opts.statusOverride === 'ready' ? 100 : opts.completionPercentage,
    );
    const derivedStatus = deriveLegFormStatus(opts.assignedTravelers, updatedForms);
    await opts.updateTripLeg(opts.leg.id, {
      travelerFormsData: updatedForms,
      formStatus: derivedStatus,
    });
  } else {
    await opts.updateTripLeg(opts.leg.id, {
      formData: formDataToSave,
      formStatus: status,
    });
  }
}

/**
 * Resolves the profile, schema, and initial data needed for form generation.
 * Returns an error if any required data is missing.
 */
export function resolveFormGenerationContext(opts: {
  trip: unknown;
  leg: TripLeg | null | undefined;
  profile: TravelerProfile | null;
  hasMultipleTravelers: boolean;
  activeTravelerId: string | null;
  travelerProfiles: Map<string, TravelerProfile>;
  getTravelerFormData: (legId: string, travelerId: string) => TravelerFormData | undefined;
  legId: string;
}): { error: AppError } | { profile: TravelerProfile; schema: CountryFormSchema; initialData: Record<string, unknown> } {
  if (!opts.trip || !opts.leg) {
    return { error: createAppError(ERROR_CODES.PARSING_ERROR, 'Trip, leg, or profile not found', 'Required data is missing. Please try navigating back and trying again.') };
  }

  if (opts.hasMultipleTravelers) {
    if (!opts.activeTravelerId || opts.travelerProfiles.size === 0) {
      return { error: createAppError(ERROR_CODES.PARSING_ERROR, 'Still loading traveler profiles', '') };
    }

    const travelerProfile = opts.travelerProfiles.get(opts.activeTravelerId);
    if (!travelerProfile) {
      return { error: createAppError(ERROR_CODES.PARSING_ERROR, `Profile not found for traveler ${opts.activeTravelerId}`, 'Unable to load traveler profile. Please go back and try again.') };
    }

    const schemaResult = loadSchemaOrError(opts.leg.destinationCountry);
    if ('error' in schemaResult) return schemaResult;

    const initialData = opts.getTravelerFormData(opts.legId, opts.activeTravelerId)?.formData ?? {};
    return { profile: travelerProfile, schema: schemaResult.schema, initialData };
  }

  if (!opts.profile) {
    return { error: createAppError(ERROR_CODES.PARSING_ERROR, 'Trip, leg, or profile not found', 'Required data is missing. Please try navigating back and trying again.') };
  }

  const schemaResult = loadSchemaOrError(opts.leg.destinationCountry);
  if ('error' in schemaResult) return schemaResult;

  return { profile: opts.profile, schema: schemaResult.schema, initialData: opts.leg.formData || {} };
}

/**
 * Builds traveler tab data for the TravelerTabs component.
 */
export function buildTravelerTabs(opts: {
  assignedTravelers: string[];
  activeTravelerId: string | null;
  travelerProfiles: Map<string, TravelerProfile>;
  getTravelerFormData: (legId: string, travelerId: string) => TravelerFormData | undefined;
  legId: string;
  currentFormStats: { completionPercentage: number } | null;
  isValid: boolean;
}): TravelerTab[] {
  return opts.assignedTravelers.map((travelerId): TravelerTab => {
    const travelerProfile = opts.travelerProfiles.get(travelerId);
    const isActive = travelerId === opts.activeTravelerId;
    const storedFormEntry = opts.getTravelerFormData(opts.legId, travelerId);

    let completionPercentage = 0;
    let formStatus: TravelerFormData['formStatus'] = storedFormEntry?.formStatus ?? 'not_started';

    if (isActive && opts.currentFormStats) {
      completionPercentage = opts.currentFormStats.completionPercentage;
      if (opts.isValid && completionPercentage === 100) {
        formStatus = 'ready';
      } else if (completionPercentage > 0) {
        formStatus = 'in_progress';
      }
    } else if (storedFormEntry) {
      if (storedFormEntry.formStatus === 'ready' || storedFormEntry.formStatus === 'submitted') {
        completionPercentage = 100;
      } else if (storedFormEntry.formStatus === 'in_progress') {
        completionPercentage = storedFormEntry.completionPercentage;
      }
    }

    const firstName = travelerProfile?.givenNames?.split(' ')[0] ?? 'Traveler';

    return {
      id: travelerId,
      name: firstName,
      completionPercentage,
      formStatus,
    };
  });
}
