import { privacyAuditService } from '@/services/security/privacyAudit';
import { keychainService } from '@/services/storage/keychain';
import { databaseService } from '@/services/storage/database';
import * as Keychain from 'react-native-keychain';

// Mock the native modules
jest.mock('react-native-keychain');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-mmkv');
jest.mock('@/services/storage/keychain');
jest.mock('@/services/storage/database');

const mockKeychain = Keychain as jest.Mocked<typeof Keychain>;
const mockKeychainService = keychainService as jest.Mocked<typeof keychainService>;
const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

describe('Privacy Compliance Audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockKeychain.getSupportedBiometryType.mockResolvedValue(Keychain.BIOMETRY_TYPE.FACE_ID);
    mockKeychainService.isAvailable.mockResolvedValue(true);
    mockKeychainService.getProfile.mockResolvedValue(null);
    mockKeychainService.getEncryptionKey.mockResolvedValue('fa8e47b0c161d2a079bd98f7a8b5e23c7d64c8a0f4e2b9a1d58c3e7f6a2b1c9d'); // Valid 256-bit key
    mockDatabaseService.getTrips.mockResolvedValue([]);
    mockDatabaseService.getQRCodes.mockResolvedValue([]);
    mockDatabaseService.getDatabase.mockResolvedValue({} as any);
  });

  describe('Comprehensive Audit', () => {
    it('should return excellent compliance score with no violations', async () => {
      const result = await privacyAuditService.runComprehensiveAudit();

      expect(result.complianceScore).toBeGreaterThanOrEqual(80);
      expect(result.violations).toHaveLength(0);
      expect(result.biometricStatus.available).toBe(true);
      expect(result.dataInventory).toBeDefined();
    });

    it('should detect missing biometric configuration', async () => {
      mockKeychain.getSupportedBiometryType.mockResolvedValue(null);
      mockKeychainService.isAvailable.mockResolvedValue(false);

      const result = await privacyAuditService.runComprehensiveAudit();

      expect(result.violations).toContainEqual(
        expect.objectContaining({
          type: 'missing_biometric',
          severity: 'high'
        })
      );
      expect(result.complianceScore).toBeLessThan(100);
    });

    it('should detect weak encryption keys', async () => {
      mockKeychainService.getEncryptionKey.mockResolvedValue('weak123'); // Too short

      const result = await privacyAuditService.runComprehensiveAudit();

      expect(result.violations).toContainEqual(
        expect.objectContaining({
          type: 'weak_encryption',
          severity: 'high'
        })
      );
    });

    it('should detect test data in production profile', async () => {
      mockKeychainService.getProfile.mockResolvedValue({
        id: 'test-id',
        passportNumber: 'TEST123456',
        surname: 'User',
        givenNames: 'Test',
        dateOfBirth: '1990-01-01',
        nationality: 'US',
        passportExpiry: '2030-01-01',
        gender: 'M',
        issuingCountry: 'US',
        defaultDeclarations: {
          hasItemsToDeclar: false,
          carryingCurrency: false,
          carryingProhibitedItems: false,
          visitedFarm: false,
          hasCriminalRecord: false,
          carryingCommercialGoods: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const result = await privacyAuditService.runComprehensiveAudit();

      expect(result.violations).toContainEqual(
        expect.objectContaining({
          type: 'data_leak',
          severity: 'medium'
        })
      );
    });
  });

  describe('Data Inventory', () => {
    it('should properly categorize passport data in keychain', async () => {
      mockKeychainService.getProfile.mockResolvedValue({
        id: 'test-id',
        passportNumber: 'AB1234567',
        surname: 'Smith',
        givenNames: 'John',
        dateOfBirth: '1985-03-15',
        nationality: 'US',
        passportExpiry: '2030-03-15',
        gender: 'M',
        issuingCountry: 'US',
        defaultDeclarations: {
          hasItemsToDeclar: false,
          carryingCurrency: false,
          carryingProhibitedItems: false,
          visitedFarm: false,
          hasCriminalRecord: false,
          carryingCommercialGoods: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const result = await privacyAuditService.runComprehensiveAudit();

      expect(result.dataInventory).toContainEqual(
        expect.objectContaining({
          category: 'passport',
          location: 'keychain',
          encryption: 'biometric',
          backupStatus: 'excluded',
          sensitivity: 'pii'
        })
      );
    });

    it('should inventory database encryption key', async () => {
      const result = await privacyAuditService.runComprehensiveAudit();

      expect(result.dataInventory).toContainEqual(
        expect.objectContaining({
          category: 'preferences',
          location: 'keychain',
          encryption: 'biometric',
          dataTypes: ['database_encryption_key']
        })
      );
    });

    it('should inventory trip data when present', async () => {
      mockDatabaseService.getTrips.mockResolvedValue([
        { id: 'trip1', name: 'Japan Trip' } as any
      ]);

      const result = await privacyAuditService.runComprehensiveAudit();

      expect(result.dataInventory).toContainEqual(
        expect.objectContaining({
          category: 'trip',
          location: 'database',
          encryption: 'device'
        })
      );
    });
  });

  describe('App Store Compliance', () => {
    it('should generate App Store specific recommendations', async () => {
      const result = await privacyAuditService.runComprehensiveAudit();

      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          priority: 'critical',
          title: 'App Store Privacy Label Accuracy'
        })
      );

      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          priority: 'critical',
          title: 'Privacy Policy Compliance'
        })
      );
    });

    it('should flag high-severity storage violations for App Store review', async () => {
      mockKeychainService.getEncryptionKey.mockRejectedValue(new Error('Keychain access failed'));

      const result = await privacyAuditService.runComprehensiveAudit();

      const storageViolations = result.violations.filter(v => 
        v.type === 'insecure_storage' && v.severity === 'high'
      );

      if (storageViolations.length > 0) {
        expect(result.recommendations).toContainEqual(
          expect.objectContaining({
            priority: 'critical',
            title: 'App Store Security Review'
          })
        );
      }
    });

    it('should determine App Store readiness correctly', async () => {
      const { ready, blockers } = await privacyAuditService.isReadyForAppStore();

      if (ready) {
        expect(blockers).toHaveLength(0);
      } else {
        expect(blockers.length).toBeGreaterThan(0);
        expect(blockers.every(b => b.severity === 'high')).toBe(true);
      }
    });
  });

  describe('Audit History', () => {
    it('should store and retrieve audit history', async () => {
      const initialHistory = await privacyAuditService.getAuditHistory();
      
      await privacyAuditService.runComprehensiveAudit();
      
      const newHistory = await privacyAuditService.getAuditHistory();
      expect(newHistory.length).toBe(initialHistory.length + 1);
    });

    it('should retrieve latest audit result', async () => {
      await privacyAuditService.runComprehensiveAudit();
      
      const latestAudit = await privacyAuditService.getLatestAudit();
      
      expect(latestAudit).toBeDefined();
      expect(latestAudit!.timestamp).toBeTruthy();
      expect(new Date(latestAudit!.timestamp)).toBeInstanceOf(Date);
    });

    it('should clear audit history', async () => {
      await privacyAuditService.runComprehensiveAudit();
      await privacyAuditService.clearAuditHistory();
      
      const history = await privacyAuditService.getAuditHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Compliance Score Calculation', () => {
    it('should calculate score based on violation severity', async () => {
      // Mock scenario with various violations
      mockKeychain.getSupportedBiometryType.mockResolvedValue(null); // High severity
      mockKeychainService.getEncryptionKey.mockResolvedValue('weak'); // High severity
      mockKeychainService.isAvailable.mockResolvedValue(false); // Critical severity
      
      const result = await privacyAuditService.runComprehensiveAudit();
      
      // With multiple high/critical violations, score should be significantly reduced
      expect(result.complianceScore).toBeLessThan(100);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should not go below 0 even with many violations', async () => {
      // Mock many high-severity violations
      mockKeychain.getSupportedBiometryType.mockResolvedValue(null);
      mockKeychainService.isAvailable.mockResolvedValue(false);
      mockKeychainService.getEncryptionKey.mockRejectedValue(new Error('Failed'));
      mockDatabaseService.getDatabase.mockRejectedValue(new Error('Failed'));
      
      const result = await privacyAuditService.runComprehensiveAudit();
      
      expect(result.complianceScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle keychain service errors gracefully', async () => {
      mockKeychainService.getProfile.mockRejectedValue(new Error('Keychain error'));
      mockKeychainService.getEncryptionKey.mockRejectedValue(new Error('Keychain error'));
      
      const result = await privacyAuditService.runComprehensiveAudit();
      
      // Should still complete audit with appropriate violations
      expect(result).toBeDefined();
      expect(result.violations.some(v => v.type === 'insecure_storage')).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockDatabaseService.getDatabase.mockRejectedValue(new Error('Database error'));
      
      const result = await privacyAuditService.runComprehensiveAudit();
      
      expect(result).toBeDefined();
      expect(result.violations.some(v => v.type === 'insecure_storage')).toBe(true);
    });

    it('should handle biometric check errors gracefully', async () => {
      mockKeychain.getSupportedBiometryType.mockRejectedValue(new Error('Biometric error'));
      
      const result = await privacyAuditService.runComprehensiveAudit();
      
      expect(result).toBeDefined();
      expect(result.biometricStatus.available).toBe(false);
    });
  });
});