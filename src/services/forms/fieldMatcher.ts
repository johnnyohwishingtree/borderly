/**
 * Field Matching Engine
 *
 * Matches a webpage's form field to a Borderly schema field.
 * Used by the AutoFill extension to determine which profile value
 * to offer when a user taps a field in Safari.
 *
 * Matching strategies (in priority order):
 * 1. HTML `autocomplete` attribute → profile field
 * 2. <label> text → match against schema `portalFieldName`
 * 3. Input `name`/`id` attribute → fuzzy match against schema field IDs
 * 4. Page URL → determine which country's schema to use
 */

import type { FormField, CountryFormSchema } from '@/types/schema';

/** Attributes extracted from a webpage's input element */
export interface InputAttributes {
  autocomplete?: string;
  name?: string;
  id?: string;
  labelText?: string;
  placeholder?: string;
  type?: string;
}

/** Result of a field match attempt */
export interface FieldMatchResult {
  field: FormField;
  confidence: 'high' | 'medium' | 'low';
  strategy: 'autocomplete' | 'portalFieldName' | 'fieldId' | 'fuzzy';
}

/**
 * Standard HTML autocomplete tokens mapped to Borderly profile field IDs.
 * Multiple IDs per token handle schema variations (e.g., givenNames vs firstName).
 * See: https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill
 */
const AUTOCOMPLETE_TO_FIELD_IDS: Record<string, string[]> = {
  'given-name': ['givenNames', 'givenName', 'firstName'],
  'additional-name': ['middleName'],
  'family-name': ['surname', 'lastName', 'familyName'],
  'name': ['givenNames', 'givenName', 'firstName', 'fullName'],
  'bday': ['dateOfBirth'],
  'bday-day': ['dateOfBirth'],
  'bday-month': ['dateOfBirth'],
  'bday-year': ['dateOfBirth'],
  'sex': ['gender'],
  'email': ['email'],
  'tel': ['phoneNumber'],
  'tel-national': ['phoneNumber'],
  'street-address': ['homeAddress'],
  'address-line1': ['homeAddress'],
  'address-level2': ['city'],
  'address-level1': ['state'],
  'postal-code': ['postalCode'],
  'country': ['nationality'],
  'country-name': ['nationality'],
  'organization': ['occupation'],
};

/**
 * Known portal URL domains mapped to ISO alpha-3 country codes.
 * Extracted from `src/schemas/*.json` portalUrl values.
 */
const PORTAL_DOMAIN_TO_COUNTRY: Record<string, string> = {
  'vjw-lp.digital.go.jp': 'JPN',
  'vjw.digital.go.jp': 'JPN',
  'eservices.ica.gov.sg': 'SGP',
  'imigresen-online.imi.gov.my': 'MYS',
  'tp.consular.go.th': 'THA',
  'evisa.xuatnhapcanh.gov.vn': 'VNM',
  'cbpone.cbp.dhs.gov': 'USA',
  'online.abf.gov.au': 'AUS',
  'www.k-eta.go.kr': 'KOR',
  'www.gov.uk': 'GBR',
  'etravel.gov.ph': 'PHL',
  'ecd.beacukai.go.id': 'IDN',
  'www.nztravellerdeclaration.govt.nz': 'NZL',
  'www.newdelhiairport.in': 'IND',
  'www.canada.ca': 'CAN',
};

/**
 * Detects the country code from a page URL by matching the domain
 * against known government portal domains.
 */
export function detectCountryFromUrl(pageUrl: string): string | null {
  try {
    const url = new URL(pageUrl);
    const hostname = url.hostname;

    // Direct domain match
    if (PORTAL_DOMAIN_TO_COUNTRY[hostname]) {
      return PORTAL_DOMAIN_TO_COUNTRY[hostname];
    }

    // Try without 'www.' prefix
    const withoutWww = hostname.replace(/^www\./, '');
    if (PORTAL_DOMAIN_TO_COUNTRY[withoutWww]) {
      return PORTAL_DOMAIN_TO_COUNTRY[withoutWww];
    }

    // Try with 'www.' prefix
    const withWww = `www.${hostname}`;
    if (PORTAL_DOMAIN_TO_COUNTRY[withWww]) {
      return PORTAL_DOMAIN_TO_COUNTRY[withWww];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Collects all fields from a country schema into a flat array.
 */
function getAllFields(schema: CountryFormSchema): FormField[] {
  return schema.sections.flatMap(section => section.fields);
}

/**
 * Strategy 1: Match by HTML autocomplete attribute.
 * Highest confidence — browser-standard attribute.
 */
function matchByAutocomplete(
  autocomplete: string,
  fields: FormField[],
): FieldMatchResult | null {
  const normalized = autocomplete.trim().toLowerCase();

  // Strip section/contact prefixes (e.g., "shipping given-name" → "given-name")
  const tokens = normalized.split(/\s+/);
  const fieldToken = tokens[tokens.length - 1];

  const candidateIds = AUTOCOMPLETE_TO_FIELD_IDS[fieldToken];
  if (!candidateIds) return null;

  for (const candidateId of candidateIds) {
    const field = fields.find(f => f.id === candidateId);
    if (field) {
      return { field, confidence: 'high', strategy: 'autocomplete' };
    }
  }

  return null;
}

/**
 * Strategy 2: Match by label text against schema portalFieldName.
 * High confidence — exact text match with the government form label.
 */
function matchByPortalFieldName(
  labelText: string,
  fields: FormField[],
): FieldMatchResult | null {
  const normalized = labelText.trim().toLowerCase();
  if (!normalized) return null;

  const field = fields.find(
    f => f.portalFieldName && f.portalFieldName.toLowerCase() === normalized,
  );
  if (!field) return null;

  return { field, confidence: 'high', strategy: 'portalFieldName' };
}

/**
 * Strategy 3: Match by input name/id against schema field IDs.
 * Medium confidence — relies on the portal using predictable naming.
 */
function matchByFieldId(
  nameOrId: string,
  fields: FormField[],
): FieldMatchResult | null {
  const normalized = nameOrId.trim().toLowerCase();
  if (!normalized) return null;

  // Exact match (case-insensitive)
  const exact = fields.find(f => f.id.toLowerCase() === normalized);
  if (exact) {
    return { field: exact, confidence: 'medium', strategy: 'fieldId' };
  }

  // Check if the input name/id contains a field ID as a substring
  // e.g., "input_passportNumber_1" matches "passportNumber"
  const substring = fields.find(
    f => normalized.includes(f.id.toLowerCase()),
  );
  if (substring) {
    return { field: substring, confidence: 'medium', strategy: 'fieldId' };
  }

  return null;
}

/**
 * Strategy 4: Fuzzy match using label text or placeholder against schema labels.
 * Low confidence — partial text matching as a last resort.
 */
function matchFuzzy(
  attrs: InputAttributes,
  fields: FormField[],
): FieldMatchResult | null {
  const searchTexts = [
    attrs.labelText,
    attrs.placeholder,
    attrs.name,
    attrs.id,
  ].filter((t): t is string => !!t);

  if (searchTexts.length === 0) return null;

  for (const text of searchTexts) {
    const normalized = text.trim().toLowerCase();
    if (!normalized) continue;

    // Check if any field label is contained in the search text or vice versa
    const field = fields.find(f => {
      const fieldLabel = f.label.toLowerCase();
      return (
        fieldLabel === normalized ||
        normalized.includes(fieldLabel) ||
        fieldLabel.includes(normalized)
      );
    });

    if (field) {
      return { field, confidence: 'low', strategy: 'fuzzy' };
    }
  }

  return null;
}

/**
 * Main field matching function.
 *
 * Attempts to match an input element's attributes to a schema field
 * using strategies in priority order. Returns the best match or null.
 */
export function matchField(
  attrs: InputAttributes,
  schema: CountryFormSchema,
): FieldMatchResult | null {
  const fields = getAllFields(schema);

  // Strategy 1: autocomplete attribute (highest priority)
  if (attrs.autocomplete) {
    const result = matchByAutocomplete(attrs.autocomplete, fields);
    if (result) return result;
  }

  // Strategy 2: label text against portalFieldName
  if (attrs.labelText) {
    const result = matchByPortalFieldName(attrs.labelText, fields);
    if (result) return result;
  }

  // Strategy 3: name/id against field IDs
  if (attrs.name) {
    const result = matchByFieldId(attrs.name, fields);
    if (result) return result;
  }
  if (attrs.id) {
    const result = matchByFieldId(attrs.id, fields);
    if (result) return result;
  }

  // Strategy 4: fuzzy matching (lowest priority)
  return matchFuzzy(attrs, fields);
}

/**
 * Match all fields on a page at once.
 * Takes an array of input attributes and returns matches for each.
 */
export function matchAllFields(
  inputElements: InputAttributes[],
  schema: CountryFormSchema,
): Map<InputAttributes, FieldMatchResult> {
  const matches = new Map<InputAttributes, FieldMatchResult>();

  for (const attrs of inputElements) {
    const result = matchField(attrs, schema);
    if (result) {
      matches.set(attrs, result);
    }
  }

  return matches;
}
