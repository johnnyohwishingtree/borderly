/**
 * Malaysia (MYS) — MDAC portal field mappings and portal automation config.
 *
 * Placeholder — full field mappings will be added in a future sprint.
 * The AutomationScriptRegistry auto-discovers this file via the mappings barrel.
 */

import type { AutomationScript } from '@/types/submission';

const MYS_MAPPING: AutomationScript = {
  countryCode: 'MYS',
  portalUrl: 'https://imigresen-online.imi.gov.my/mdac/main',
  version: '1.0.0',
  lastUpdated: '2026-03-07T00:00:00Z',
  prerequisites: {
    cookiesEnabled: true,
    javascriptEnabled: true,
  },
  steps: [
    {
      id: 'load_portal',
      name: 'Load MDAC Portal',
      description: 'Navigate to Malaysia Digital Arrival Card portal',
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

export default MYS_MAPPING;
