jest.mock('@/services/submission/portalRegistry', () => ({
  getAllPortals: () => [
    { countryCode: 'JPN', portalName: 'Visit Japan Web' },
    { countryCode: 'SGP', portalName: 'SG Arrival Card' },
  ],
  getPortalName: (code: string) => {
    const map: Record<string, string> = {
      JPN: 'Visit Japan Web',
      SGP: 'SG Arrival Card',
    };
    return map[code] ?? code;
  },
}));

import { PORTAL_NAMES, getPortalName } from '../../src/utils/countryUtils';

describe('PORTAL_NAMES', () => {
  it('contains entries from the portal registry', () => {
    expect(PORTAL_NAMES['JPN']).toBe('Visit Japan Web');
    expect(PORTAL_NAMES['SGP']).toBe('SG Arrival Card');
  });
});

describe('getPortalName', () => {
  it('returns portal name for a known country', () => {
    expect(getPortalName('JPN')).toBe('Visit Japan Web');
  });

  it('falls back to the country code for an unknown country', () => {
    expect(getPortalName('ZZZ')).toBe('ZZZ');
  });
});
