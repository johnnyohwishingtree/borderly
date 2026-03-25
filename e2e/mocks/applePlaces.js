// Web mock for ApplePlacesModule — returns empty results
// On web (Playwright E2E), we don't have MapKit, so autocomplete is disabled.

module.exports = {
  search: async () => [],
};
