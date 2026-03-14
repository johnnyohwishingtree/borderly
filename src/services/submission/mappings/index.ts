/**
 * Country mappings barrel — auto-discovery of all per-country portal configs.
 *
 * To add a new country:
 *   1. Create `<ISO3>.ts` in this directory (see JPN.ts as a reference).
 *   2. Import it below and add it to ALL_COUNTRY_MAPPINGS.
 *   3. Add the corresponding JSON schema to `src/schemas/<ISO3>.json`.
 *   No changes to AutomationScriptRegistry or any other core file are needed.
 */

import type { AutomationScript } from '@/types/submission';

import JPN_MAPPING from './JPN';
import MYS_MAPPING from './MYS';
import SGP_MAPPING from './SGP';

/** Re-export the AutomationScript type under the CountryFieldMappings alias. */
export type CountryFieldMappings = AutomationScript;

/** All registered country mapping configs in priority order. */
export const ALL_COUNTRY_MAPPINGS: CountryFieldMappings[] = [
  JPN_MAPPING,
  MYS_MAPPING,
  SGP_MAPPING,
];
