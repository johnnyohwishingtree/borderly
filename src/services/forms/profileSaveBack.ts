import type { FormSection } from '@/types/schema';
import type { TravelerProfile } from '@/types/profile';

/**
 * Extracts form field values that map to empty profile fields and returns
 * a partial profile update. Called after form save to progressively enrich
 * the user's profile with data entered just-in-time during form fill.
 *
 * Only saves back fields where:
 * 1. autoFillSource starts with "profile."
 * 2. The profile field is currently empty/undefined
 * 3. The user entered a non-empty value
 */
export function saveFormFieldsToProfile(
  sections: FormSection[],
  formData: Record<string, unknown>,
  profile: TravelerProfile,
): Partial<TravelerProfile> | null {
  const updates: Record<string, unknown> = {};

  for (const section of sections) {
    for (const field of section.fields) {
      if (!field.autoFillSource?.startsWith('profile.')) continue;

      const value = formData[field.id];
      if (value === undefined || value === null || value === '') continue;

      const profilePath = field.autoFillSource.slice('profile.'.length);
      const currentValue = resolveProfilePath(profile, profilePath);

      // Only save back if the profile field is empty
      if (currentValue !== undefined && currentValue !== null && currentValue !== '') continue;

      setProfilePath(updates, profilePath, value);
    }
  }

  return Object.keys(updates).length > 0 ? updates as Partial<TravelerProfile> : null;
}

/** Resolve a dot-notation path on the profile object. */
function resolveProfilePath(profile: TravelerProfile, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = profile;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/** Set a dot-notation path on a partial update object, creating nested objects as needed. */
function setProfilePath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');

  if (parts.length === 1) {
    obj[parts[0]] = value;
    return;
  }

  // Nested path — build intermediate objects
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}
