import { useMemo } from 'react';
import { useProfileStore } from '../stores/useProfileStore';
import { checkPassportValidity } from '../services/documents';
import { schemaRegistry } from '../services/schemas/schemaRegistry';
import type { PassportValidityStatus } from '../types/document';

interface UsePassportValidityOptions {
  /** ISO 3166-1 alpha-3 country code, e.g. "JPN" */
  countryCode: string;
  /** ISO 8601 date string of the leg's departure date */
  departureDate?: string | undefined;
}

/**
 * Data returned when the hook detects a passport validity issue.
 * Contains everything `PassportValidityWarning` needs to render.
 */
export interface PassportValidityWarningData {
  status: PassportValidityStatus;
  countryName: string;
  requiredMonths: number;
  passportExpiry: string;
}

/**
 * Checks whether the active traveler's passport meets the validity
 * requirements for a given destination country on a given departure date.
 *
 * Returns `null` when:
 * - No profile is loaded
 * - `countryCode` is empty or has no schema
 * - `departureDate` is not provided
 * - The country has no `passportValidityMonths` requirement (no check needed)
 * - The passport is valid (no warning to show)
 *
 * Returns a `PassportValidityWarningData` object when the passport does not
 * meet the country's validity requirements — ready to pass straight to the
 * `PassportValidityWarning` component.
 */
export function usePassportValidity({
  countryCode,
  departureDate,
}: UsePassportValidityOptions): PassportValidityWarningData | null {
  const profile = useProfileStore(s => s.profile);

  return useMemo(() => {
    if (!profile || !countryCode || !departureDate) return null;

    const schema = schemaRegistry.getSchema(countryCode);
    if (!schema) return null;

    // Only warn when the country actually requires a validity buffer.
    const requiredMonths = schema.passportValidityMonths ?? 0;
    if (requiredMonths === 0) return null;

    const status = checkPassportValidity(profile, departureDate, schema);
    if (status.isValid) return null;

    return {
      status,
      countryName: schema.countryName,
      requiredMonths,
      passportExpiry: profile.passportExpiry,
    };
  }, [profile, countryCode, departureDate]);
}
