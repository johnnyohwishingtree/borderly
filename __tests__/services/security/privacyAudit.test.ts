/**
 * Tests for privacyAuditService — inventories all storage tiers, detects
 * privacy violations, and generates compliance recommendations.
 */

import * as Keychain from 'react-native-keychain';
import { privacyAuditService } from '../../../src/services/security/privacyAudit';
import { keychainService } from '../../../src/services/storage/keychain/keychainService';
import { databaseService } from '../../../src/services/storage/database';

// Mock heavy dependencies directly (not barrels)
jest.mock('../../../src/services/storage/keychain/keychainService', () => ({
  keychainService: {
    isAvailable: jest.fn(),
    getProfile: jest.fn(),
    getEncryptionKey: jest.fn(),
  },
}));

jest.mock('../../../src/services/storage/database', () => ({
  databaseService: {
    getDatabase: jest.fn(),
    getTrips: jest.fn(),
    getQRCodes: jest.fn(),
  },
}));

// MMKV and Keychain are globally mocked in jest.setup.js

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupHealthyEnvironment() {
  jest.mocked(Keychain.getSupportedBiometryType).mockResolvedValue(Keychain.BIOMETRY_TYPE.FACE_ID);
  jest.mocked(keychainService.isAvailable).mockResolvedValue(true);
  jest.mocked(keychainService.getProfile).mockResolvedValue({
    passportNumber: 'AB7654321',
    surname: 'TANAKA',
    givenNames: 'Yuki',
  } as never);
  jest.mocked(keychainService.getEncryptionKey).mockResolvedValue('a1b2c3d4'.repeat(8)); // 64 chars
  jest.mocked(databaseService.getDatabase).mockResolvedValue({} as never);
  jest.mocked(databaseService.getTrips).mockResolvedValue([]);
  jest.mocked(databaseService.getQRCodes).mockResolvedValue([]);
}

// ---------------------------------------------------------------------------
// runComprehensiveAudit
// ---------------------------------------------------------------------------

describe('privacyAuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHealthyEnvironment();
  });

  describe('runComprehensiveAudit', () => {
    it('returns a complete audit result with all required fields', async () => {
      const result = await privacyAuditService.runComprehensiveAudit();

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(typeof result.complianceScore).toBe('number');
      expect(Array.isArray(result.violations)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(Array.isArray(result.dataInventory)).toBe(true);
      expect(typeof result.biometricStatus).toBe('object');
      expect(result.biometricStatus).not.toBeNull();
    });

    it('returns biometric status showing available and configured', async () => {
      const result = await privacyAuditService.runComprehensiveAudit();

      expect(result.biometricStatus.available).toBe(true);
      expect(result.biometricStatus.configured).toBe(true);
      expect(result.biometricStatus.keychainCompliance).toBe(true);
    });

    it('adds violation when biometric is not available', async () => {
      jest.mocked(keychainService.isAvailable).mockResolvedValue(false);

      const result = await privacyAuditService.runComprehensiveAudit();

      const bioViolation = result.violations.find(v => v.type === 'missing_biometric');
      expect(bioViolation).not.toBeUndefined();
      expect(bioViolation!.severity).toBe('high');
    });

    it('adds biometric violation when biometric check throws', async () => {
      jest.mocked(Keychain.getSupportedBiometryType).mockRejectedValue(new Error('hw fail'));
      jest.mocked(keychainService.isAvailable).mockRejectedValue(new Error('hw fail'));

      const result = await privacyAuditService.runComprehensiveAudit();

      expect(result.biometricStatus.available).toBe(false);
      expect(result.biometricStatus.configured).toBe(false);
    });

    // -----------------------------------------------------------------------
    // Data inventory
    // -----------------------------------------------------------------------

    it('inventories passport data in keychain', async () => {
      const result = await privacyAuditService.runComprehensiveAudit();

      const passportItem = result.dataInventory.find(d => d.category === 'passport');
      expect(passportItem).not.toBeUndefined();
      expect(passportItem!.location).toBe('keychain');
      expect(passportItem!.encryption).toBe('biometric');
      expect(passportItem!.sensitivity).toBe('pii');
    });

    it('inventories encryption key in keychain', async () => {
      const result = await privacyAuditService.runComprehensiveAudit();

      const keyItem = result.dataInventory.find(
        d => d.dataTypes.includes('database_encryption_key'),
      );
      expect(keyItem).not.toBeUndefined();
      expect(keyItem!.location).toBe('keychain');
    });

    it('inventories trip data when trips exist', async () => {
      jest.mocked(databaseService.getTrips).mockResolvedValue([{ id: 'trip-1' }] as never);

      const result = await privacyAuditService.runComprehensiveAudit();

      const tripItem = result.dataInventory.find(d => d.category === 'trip');
      expect(tripItem).not.toBeUndefined();
      expect(tripItem!.location).toBe('database');
    });

    it('inventories QR codes when they exist', async () => {
      jest.mocked(databaseService.getQRCodes).mockResolvedValue([{ id: 'qr-1' }] as never);

      const result = await privacyAuditService.runComprehensiveAudit();

      const qrItem = result.dataInventory.find(d => d.category === 'qr');
      expect(qrItem).not.toBeUndefined();
    });

    it('inventories MMKV preferences', async () => {
      const result = await privacyAuditService.runComprehensiveAudit();

      const prefsItem = result.dataInventory.find(
        d => d.category === 'preferences' && d.location === 'mmkv',
      );
      expect(prefsItem).not.toBeUndefined();
      expect(prefsItem!.encryption).toBe('none');
      expect(prefsItem!.sensitivity).toBe('public');
    });

    // -----------------------------------------------------------------------
    // Violations
    // -----------------------------------------------------------------------

    it('adds violation for test data in profile', async () => {
      jest.mocked(keychainService.getProfile).mockResolvedValue({
        passportNumber: 'test123',
        surname: 'Test',
      } as never);

      const result = await privacyAuditService.runComprehensiveAudit();

      const testDataViolation = result.violations.find(
        v => v.type === 'data_leak' && v.description.includes('Test'),
      );
      expect(testDataViolation).not.toBeUndefined();
    });

    it('adds violation for weak encryption key', async () => {
      jest.mocked(keychainService.getEncryptionKey).mockResolvedValue('short');

      const result = await privacyAuditService.runComprehensiveAudit();

      const weakKeyViolation = result.violations.find(v => v.type === 'weak_encryption');
      expect(weakKeyViolation).not.toBeUndefined();
      expect(weakKeyViolation!.severity).toBe('high');
    });

    it('adds violation when keychain profile is inaccessible', async () => {
      jest.mocked(keychainService.getProfile).mockRejectedValue(new Error('locked'));

      const result = await privacyAuditService.runComprehensiveAudit();

      const storageViolation = result.violations.find(
        v => v.type === 'insecure_storage' && v.location === 'keychain:profile',
      );
      expect(storageViolation).not.toBeUndefined();
    });

    it('adds violation when encryption key is inaccessible', async () => {
      jest.mocked(keychainService.getEncryptionKey).mockRejectedValue(new Error('denied'));

      const result = await privacyAuditService.runComprehensiveAudit();

      const keyViolation = result.violations.find(
        v => v.type === 'insecure_storage' && v.location === 'keychain:encryption_key',
      );
      expect(keyViolation).not.toBeUndefined();
    });

    it('adds violation when database is inaccessible', async () => {
      jest.mocked(databaseService.getDatabase).mockRejectedValue(new Error('db error'));

      const result = await privacyAuditService.runComprehensiveAudit();

      const dbViolation = result.violations.find(
        v => v.type === 'insecure_storage' && v.location === 'watermelondb',
      );
      expect(dbViolation).not.toBeUndefined();
    });

    // -----------------------------------------------------------------------
    // Compliance score
    // -----------------------------------------------------------------------

    it('returns 100 compliance score when no violations', async () => {
      // Default healthy setup has no violations (bio available + configured)
      const result = await privacyAuditService.runComprehensiveAudit();

      expect(result.complianceScore).toBe(100);
    });

    it('reduces score by 20 for each high-severity violation', async () => {
      jest.mocked(keychainService.isAvailable).mockResolvedValue(false);
      // missing_biometric is high severity → -20

      const result = await privacyAuditService.runComprehensiveAudit();

      expect(result.complianceScore).toBeLessThanOrEqual(80);
    });

    it('reduces score by 10 for each medium-severity violation', async () => {
      jest.mocked(keychainService.getProfile).mockResolvedValue({
        passportNumber: 'test123',
      } as never);
      // Test data is medium severity → -10

      const result = await privacyAuditService.runComprehensiveAudit();

      expect(result.complianceScore).toBeLessThanOrEqual(90);
    });

    it('clamps score at 0 minimum', async () => {
      // Create many violations to push score below 0
      jest.mocked(keychainService.isAvailable).mockResolvedValue(false);
      jest.mocked(keychainService.getProfile).mockRejectedValue(new Error('fail'));
      jest.mocked(keychainService.getEncryptionKey).mockRejectedValue(new Error('fail'));
      jest.mocked(databaseService.getDatabase).mockRejectedValue(new Error('fail'));

      const result = await privacyAuditService.runComprehensiveAudit();

      expect(result.complianceScore).toBeGreaterThanOrEqual(0);
    });

    // -----------------------------------------------------------------------
    // Recommendations
    // -----------------------------------------------------------------------

    it('always includes App Store compliance recommendations', async () => {
      const result = await privacyAuditService.runComprehensiveAudit();

      const appStoreRecs = result.recommendations.filter(
        r => r.title.includes('App Store') || r.title.includes('Privacy'),
      );
      expect(appStoreRecs.length).toBeGreaterThanOrEqual(2);
    });

    it('adds security review recommendation when high-severity storage violations exist', async () => {
      jest.mocked(databaseService.getDatabase).mockRejectedValue(new Error('fail'));

      const result = await privacyAuditService.runComprehensiveAudit();

      const secReviewRec = result.recommendations.find(
        r => r.title.includes('Security Review'),
      );
      expect(secReviewRec).not.toBeUndefined();
      expect(secReviewRec!.priority).toBe('critical');
    });
  });

  // -------------------------------------------------------------------------
  // isReadyForAppStore
  // -------------------------------------------------------------------------

  describe('isReadyForAppStore', () => {
    it('returns ready=true for healthy environment', async () => {
      const result = await privacyAuditService.isReadyForAppStore();

      expect(result.ready).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('returns ready=false with blockers for weak encryption key', async () => {
      jest.mocked(keychainService.getEncryptionKey).mockResolvedValue('short');

      const result = await privacyAuditService.isReadyForAppStore();

      expect(result.ready).toBe(false);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it('returns ready=false when compliance score is below 80', async () => {
      // Multiple high-severity violations
      jest.mocked(keychainService.isAvailable).mockResolvedValue(false);
      jest.mocked(keychainService.getEncryptionKey).mockRejectedValue(new Error('fail'));

      const result = await privacyAuditService.isReadyForAppStore();

      expect(result.ready).toBe(false);
    });
  });
});
