/**
 * Traveler Forms — Multi-traveler form generation and status management
 */

import { TravelerProfile } from '../../../types/profile';
import { TripLeg, TravelerFormData } from '../../../types/trip';
import { CountryFormSchema } from '../../../types/schema';
import { generateFilledForm, updateFormData } from './formEngine';
import type { FilledForm } from './formEngine';

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
    updatedLeg.travelerFormsData[existingTravelerIndex] = {
      ...updatedLeg.travelerFormsData[existingTravelerIndex],
      formData: updateFormData(
        updatedLeg.travelerFormsData[existingTravelerIndex].formData,
        fieldId,
        value
      ),
    };
  } else {
    updatedLeg.travelerFormsData.push({
      travelerId,
      formData: { [fieldId]: value },
      formStatus: 'in_progress',
      completionPercentage: 0,
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
    updatedLeg.travelerFormsData.push({
      travelerId,
      formData: {},
      formStatus: status,
      completionPercentage: 0,
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

  if (statuses.every(status => status === 'submitted')) {
    return 'submitted';
  }

  if (statuses.every(status => status === 'ready')) {
    return 'ready';
  }

  if (statuses.some(status => status === 'in_progress' || status === 'ready')) {
    return 'in_progress';
  }

  return 'not_started';
}
