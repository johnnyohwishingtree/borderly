import type { TravelerFormData } from '../types/trip';

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
