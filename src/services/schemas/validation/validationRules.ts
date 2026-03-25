/**
 * Schema Validation Rules and Constants
 *
 * Constants used by the schema validator for field type validation,
 * action type validation, and other rule-based checks.
 */

/** Valid field types for form fields */
export const VALID_FIELD_TYPES = [
  'text', 'date', 'select', 'searchable_select', 'boolean', 'number', 'textarea', 'address'
];

/** Valid fill methods for field automation */
export const VALID_FILL_METHODS = ['input', 'select', 'click', 'upload'];

/** Valid action types for step automation */
export const VALID_ACTION_TYPES = ['navigate', 'click', 'wait', 'fill', 'submit', 'scroll'];

/** Valid complexity levels for schema metadata */
export const VALID_COMPLEXITIES = ['low', 'medium', 'high'];

/** Valid implementation statuses for schema metadata */
export const VALID_STATUSES = ['planned', 'in_progress', 'complete', 'deprecated'];

/** Valid maintenance frequencies for schema metadata */
export const VALID_FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'annually'];

/** Valid prerequisite types for portal flow */
export const VALID_PREREQUISITE_TYPES = ['document', 'payment', 'approval', 'other'];

/** Required top-level fields for a country form schema */
export const REQUIRED_SCHEMA_FIELDS = [
  'countryCode', 'countryName', 'schemaVersion', 'lastUpdated',
  'portalUrl', 'portalName', 'submission', 'sections', 'submissionGuide'
];

/** Regex for semantic versioning */
export const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

/** Regex for duration format (hours, days, weeks) */
export const DURATION_REGEX = /^(\d+)([hdw])$/;
