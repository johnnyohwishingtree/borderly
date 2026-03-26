/**
 * Canonical enum lists for Borderly.
 *
 * These are the app's internal values. Country schemas use `autoFillMapping`
 * to translate these canonical values into portal-specific labels.
 */

export interface EnumOption {
  value: string;
  label: string;
}

// ── Occupation ──────────────────────────────────────────────────────────────

export const OCCUPATIONS: EnumOption[] = [
  { value: 'SOFTWARE_DEVELOPER', label: 'Software Developer' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'NURSE', label: 'Nurse' },
  { value: 'ENGINEER', label: 'Engineer' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'LAWYER', label: 'Lawyer' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'GOVERNMENT_WORKER', label: 'Government Worker' },
  { value: 'MILITARY', label: 'Military' },
  { value: 'SELF_EMPLOYED', label: 'Self-employed' },
  { value: 'BUSINESS_OWNER', label: 'Business Owner' },
  { value: 'FREELANCER', label: 'Freelancer' },
  { value: 'HOMEMAKER', label: 'Homemaker' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'UNEMPLOYED', label: 'Unemployed' },
  { value: 'OTHER', label: 'Other' },
];

export type OccupationValue = (typeof OCCUPATIONS)[number]['value'];

// ── Purpose of Visit ────────────────────────────────────────────────────────

export const PURPOSES_OF_VISIT: EnumOption[] = [
  { value: 'VACATION', label: 'Vacation' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'TRANSIT', label: 'Transit' },
  { value: 'STUDY', label: 'Study' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'FAMILY_VISIT', label: 'Family Visit' },
  { value: 'CONFERENCE', label: 'Conference' },
  { value: 'OTHER', label: 'Other' },
];

export type PurposeOfVisitValue = (typeof PURPOSES_OF_VISIT)[number]['value'];

// ── Marital Status ──────────────────────────────────────────────────────────

export const MARITAL_STATUSES: EnumOption[] = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'MARRIED', label: 'Married' },
  { value: 'DIVORCED', label: 'Divorced' },
  { value: 'WIDOWED', label: 'Widowed' },
  { value: 'SEPARATED', label: 'Separated' },
  { value: 'OTHER', label: 'Other' },
];

export type MaritalStatusValue = (typeof MARITAL_STATUSES)[number]['value'];

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Look up the human-readable label for a canonical enum value. */
export function getEnumLabel(options: EnumOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

/**
 * Best-effort migration: match freeform text to the closest canonical value.
 * Returns the canonical value if a match is found, otherwise 'OTHER'.
 */
export function matchFreeformToEnum(
  options: EnumOption[],
  freeform: string,
): string {
  if (!freeform) return '';
  const normalized = freeform.trim().toLowerCase();

  // Exact match on value or label
  const exact = options.find(
    (o) =>
      o.value.toLowerCase() === normalized ||
      o.label.toLowerCase() === normalized,
  );
  if (exact) return exact.value;

  // Substring match on label
  const partial = options.find(
    (o) =>
      o.label.toLowerCase().includes(normalized) ||
      normalized.includes(o.label.toLowerCase()),
  );
  if (partial) return partial.value;

  return 'OTHER';
}
