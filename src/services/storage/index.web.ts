/**
 * Web Storage Barrel — browser-native implementations for all three tiers.
 *
 * Webpack resolves .web.ts before .ts, so this auto-replaces the native
 * barrel (index.ts) on web builds. The NormalModuleReplacementPlugin for
 * E2E mocks must be skipped for Vercel deployment builds.
 *
 * Tier 1 (PII):      IndexedDB + Web Crypto (AES-GCM)
 * Tier 2 (Trips):    IndexedDB
 * Tier 3 (Prefs):    localStorage (via MMKV web mock)
 */

// Tier 1: Web keychain (IndexedDB + Web Crypto)
export { webKeychainService as keychainService } from './keychain/keychainService.web';
export type { KeychainService } from './keychain/keychainTypes';

// Tier 2: Web database (IndexedDB)
export { webDatabaseService as databaseService } from './database.web';
export type { PaginationOptions, TripQueryOptions } from './database.web';

// Tier 3: MMKV (localStorage) — the native mmkv.ts works on web via the
// webpack alias to e2e/mocks/mmkv.js which uses localStorage.
// For Vercel builds, we use the same localStorage-based MMKV mock.
export { mmkvService } from './mmkv';
export type { MMKVService, AppPreferences } from './mmkv';

// Family profile storage works cross-platform (only depends on keychainService + mmkvService)
export { familyProfileStorage } from './familyProfileStorage';

// Data manager works cross-platform
export { exportUserData, deleteAllData, buildDataExport } from './dataManager';
export type { DataExport, ExportedProfile, ExportedTrip, ExportedLeg } from './dataManager';

// Stubs for WatermelonDB models (not used on web — trips are plain objects)
export class Trip {
  id = '';
}
export class TripLeg {
  id = '';
}
export class SavedQRCode {
  id = '';
}
export const schema = {};
export const migrations = {};
