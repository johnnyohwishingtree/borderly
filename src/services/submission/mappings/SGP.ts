/**
 * Singapore (SGP) — SG Arrival Card field mappings and portal automation config.
 *
 * Placeholder — full field mappings will be added in a future sprint.
 * The AutomationScriptRegistry auto-discovers this file via the mappings barrel.
 */

import type { AutomationScript } from '@/types/submission';

const SGP_MAPPING: AutomationScript = {
  countryCode: 'SGP',
  portalUrl: 'https://eservices.ica.gov.sg/sgarrivalcard',
  version: '1.0.0',
  lastUpdated: '2026-03-14T00:00:00Z',
  prerequisites: {
    cookiesEnabled: true,
    javascriptEnabled: true,
  },
  steps: [
    {
      id: 'load_portal',
      name: 'Load SG Arrival Card Portal',
      description: 'Navigate to Singapore ICA portal',
      script: 'return { success: true, message: "Portal loaded" };',
      timing: { timeout: 15000, waitAfter: 2000 },
      critical: true,
    },
  ],
  fieldMappings: {},
  session: {
    maxDurationMs: 15 * 60 * 1000,
    keepAlive: true,
    clearCookiesOnStart: false,
  },
};

export default SGP_MAPPING;
