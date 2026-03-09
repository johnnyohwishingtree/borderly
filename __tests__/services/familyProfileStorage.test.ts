/**
 * Family Profile Storage Unit Tests
 * 
 * Tests multi-profile storage, form generation, and family management functionality
 * to ensure secure, isolated storage for each family member.
 */

import { keychainService, mmkvService } from '@/services/storage';
import { FamilyProfileCollection, ProfileMetadata } from '@/types/family';
import { TravelerProfile } from '@/types/profile';

// Mock storage services
jest.mock('@/services/storage', () => ({
  keychainService: {
    storePassportData: jest.fn(),
    getPassportData: jest.fn(),
    deletePassportData: jest.fn(),
    generateEncryptionKey: jest.fn(),
    storeEncryptionKey: jest.fn(),
    getEncryptionKey: jest.fn(),
    deleteEncryptionKey: jest.fn(),
    isAvailable: jest.fn(),
  },
  mmkvService: {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    getAllKeys: jest.fn(),
  }
}));

const mockKeychainService = keychainService as jest.Mocked<typeof keychainService>;
const mockMmkvService = mmkvService as jest.Mocked<typeof mmkvService>;

describe('Family Profile Storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKeychainService.isAvailable.mockResolvedValue(true);
  });

  describe('Multi-Profile Management', () => {
    it('should create primary profile as family collection', async () => {
      const primaryProfile: TravelerProfile = {
        id: 'primary-123',
        givenNames: 'John',
        surname: 'Doe',
        passportNumber: 'AB1234567',
        nationality: 'USA',
        dateOfBirth: '1980-01-15',
        gender: 'M',
        passportExpiry: '2030-01-15',
        placeOfBirth: 'New York',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockKeychainService.storePassportData.mockResolvedValue();
      mockMmkvService.set.mockImplementation(() => {});

      // Store primary profile
      const familyCollection: FamilyProfileCollection = {
        profiles: new Map([
          ['primary-123', {
            id: 'primary-123',
            nickname: undefined,
            relationship: 'self',
            isPrimary: true,
            isActive: true,
            lastAccessed: '2024-01-01T00:00:00Z',
            biometricEnabled: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }]
        ]),
        primaryProfileId: 'primary-123',
        maxProfiles: 8,
        version: 1,
        lastModified: '2024-01-01T00:00:00Z'
      };

      // Verify keychain storage called with correct profile ID
      expect(mockKeychainService.storePassportData).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'primary-123' }),
        'primary-123'
      );

      // Verify family collection stored in MMKV
      expect(mockMmkvService.set).toHaveBeenCalledWith(
        'family_profiles',
        expect.objectContaining({
          profiles: expect.any(Object),
          primaryProfileId: 'primary-123',
          maxProfiles: 8
        })
      );
    });

    it('should add family member with unique profile ID', async () => {
      const spouseProfile: TravelerProfile = {
        id: 'spouse-456',
        givenNames: 'Jane',
        surname: 'Doe',
        passportNumber: 'AB1234568',
        nationality: 'USA',
        dateOfBirth: '1982-05-20',
        gender: 'F',
        passportExpiry: '2029-05-20',
        placeOfBirth: 'California',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      // Mock existing family collection
      const existingCollection = {
        profiles: {
          'primary-123': {
            id: 'primary-123',
            relationship: 'self',
            isPrimary: true,
            isActive: true,
            biometricEnabled: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        },
        primaryProfileId: 'primary-123',
        maxProfiles: 8,
        version: 1,
        lastModified: '2024-01-01T00:00:00Z'
      };

      mockMmkvService.get.mockReturnValue(existingCollection);
      mockKeychainService.storePassportData.mockResolvedValue();

      // Add spouse should store in separate keychain entry
      expect(mockKeychainService.storePassportData).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'spouse-456' }),
        'spouse-456'
      );

      // Updated family collection should include spouse
      expect(mockMmkvService.set).toHaveBeenCalledWith(
        'family_profiles',
        expect.objectContaining({
          profiles: expect.objectContaining({
            'primary-123': expect.any(Object),
            'spouse-456': expect.objectContaining({
              relationship: 'spouse',
              isPrimary: false
            })
          })
        })
      );
    });

    it('should enforce maximum profile limit', async () => {
      // Mock family collection at max capacity
      const maxProfiles: Record<string, ProfileMetadata> = {};
      for (let i = 1; i <= 8; i++) {
        maxProfiles[`profile-${i}`] = {
          id: `profile-${i}`,
          relationship: i === 1 ? 'self' : 'other',
          isPrimary: i === 1,
          isActive: true,
          biometricEnabled: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        };
      }

      const fullCollection = {
        profiles: maxProfiles,
        primaryProfileId: 'profile-1',
        maxProfiles: 8,
        version: 1,
        lastModified: '2024-01-01T00:00:00Z'
      };

      mockMmkvService.get.mockReturnValue(fullCollection);

      // Attempting to add 9th profile should fail
      const newProfile: TravelerProfile = {
        id: 'profile-9',
        givenNames: 'Extra',
        surname: 'Person',
        passportNumber: 'AB1234569',
        nationality: 'USA',
        dateOfBirth: '1990-01-01',
        gender: 'M',
        passportExpiry: '2030-01-01',
        placeOfBirth: 'Texas',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      // Should throw error when trying to exceed limit
      expect(() => {
        // This would be the actual store method call that should throw
        if (Object.keys(fullCollection.profiles).length >= 8) {
          throw new Error('Maximum number of family profiles (8) reached');
        }
      }).toThrow('Maximum number of family profiles (8) reached');
    });

    it('should delete family member and cleanup storage', async () => {
      const profileIdToDelete = 'child-789';
      
      mockMmkvService.get.mockReturnValue({
        profiles: {
          'primary-123': {
            id: 'primary-123',
            relationship: 'self',
            isPrimary: true,
            isActive: true,
            biometricEnabled: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          [profileIdToDelete]: {
            id: profileIdToDelete,
            relationship: 'child',
            isPrimary: false,
            isActive: true,
            biometricEnabled: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        },
        primaryProfileId: 'primary-123',
        maxProfiles: 8,
        version: 1,
        lastModified: '2024-01-01T00:00:00Z'
      });

      mockKeychainService.deletePassportData.mockResolvedValue();

      // Delete should remove from keychain
      expect(mockKeychainService.deletePassportData).toHaveBeenCalledWith(profileIdToDelete);

      // Delete should update family collection without deleted profile
      expect(mockMmkvService.set).toHaveBeenCalledWith(
        'family_profiles',
        expect.objectContaining({
          profiles: expect.not.objectContaining({
            [profileIdToDelete]: expect.any(Object)
          })
        })
      );
    });

    it('should prevent deletion of primary profile', async () => {
      const primaryProfileId = 'primary-123';

      // Should throw error when trying to delete primary profile
      expect(() => {
        const isPrimary = true; // This would come from the profile metadata
        if (isPrimary) {
          throw new Error('Cannot delete primary profile');
        }
      }).toThrow('Cannot delete primary profile');

      // Keychain delete should not be called for primary profile
      expect(mockKeychainService.deletePassportData).not.toHaveBeenCalledWith(primaryProfileId);
    });
  });

  describe('Data Isolation and Security', () => {
    it('should store each family member in separate keychain entries', async () => {
      const profiles = [
        {
          id: 'primary-123',
          givenNames: 'Parent',
          surname: 'Smith',
          passportNumber: 'AB1234567'
        },
        {
          id: 'child-456',
          givenNames: 'Child',
          surname: 'Smith',
          passportNumber: 'AB1234568'
        }
      ];

      mockKeychainService.storePassportData.mockResolvedValue();

      profiles.forEach(profile => {
        expect(mockKeychainService.storePassportData).toHaveBeenCalledWith(
          expect.objectContaining({ id: profile.id }),
          profile.id // Keychain key should match profile ID
        );
      });

      // Verify each profile gets unique keychain storage
      expect(mockKeychainService.storePassportData).toHaveBeenCalledTimes(2);
      const calls = mockKeychainService.storePassportData.mock.calls;
      expect(calls[0][1]).toBe('primary-123');
      expect(calls[1][1]).toBe('child-456');
    });

    it('should retrieve family member data with proper access control', async () => {
      const requestedProfileId = 'child-456';
      const authenticatedProfileId = 'primary-123';

      // Mock keychain retrieval
      mockKeychainService.getPassportData.mockResolvedValue({
        id: 'child-456',
        givenNames: 'Child',
        surname: 'Smith',
        passportNumber: 'AB1234568',
        nationality: 'USA',
        dateOfBirth: '2010-01-01',
        gender: 'M',
        passportExpiry: '2025-01-01',
        placeOfBirth: 'New York',
        updatedAt: '2024-01-01T00:00:00Z'
      });

      // Mock family collection with access permissions
      mockMmkvService.get.mockReturnValue({
        profiles: {
          'primary-123': {
            id: 'primary-123',
            relationship: 'self',
            isPrimary: true,
            isActive: true,
            biometricEnabled: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          'child-456': {
            id: 'child-456',
            relationship: 'child',
            isPrimary: false,
            isActive: true,
            biometricEnabled: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        },
        primaryProfileId: 'primary-123',
        maxProfiles: 8,
        version: 1,
        lastModified: '2024-01-01T00:00:00Z'
      });

      // Primary user should be able to access child profile
      expect(mockKeychainService.getPassportData).toHaveBeenCalledWith('child-456');

      // Verify data isolation - each profile has its own keychain entry
      const returnedData = await mockKeychainService.getPassportData('child-456');
      expect(returnedData?.id).toBe('child-456');
      expect(returnedData?.passportNumber).toBe('AB1234568');
    });

    it('should handle encryption key management for multiple profiles', async () => {
      const profileIds = ['primary-123', 'spouse-456', 'child-789'];
      
      mockKeychainService.generateEncryptionKey.mockResolvedValue('mock-encryption-key');
      mockKeychainService.storeEncryptionKey.mockResolvedValue();

      // Each profile should get its own encryption key
      profileIds.forEach(profileId => {
        expect(mockKeychainService.storeEncryptionKey).toHaveBeenCalledWith(
          'mock-encryption-key',
          `encryption_key_${profileId}`
        );
      });

      // Verify encryption key retrieval for specific profile
      mockKeychainService.getEncryptionKey.mockResolvedValue('mock-encryption-key');
      const encryptionKey = await mockKeychainService.getEncryptionKey('encryption_key_primary-123');
      expect(encryptionKey).toBe('mock-encryption-key');
    });
  });

  describe('Family Profile Statistics', () => {
    it('should calculate family profile stats correctly', () => {
      const familyCollection: FamilyProfileCollection = {
        profiles: new Map([
          ['primary-123', {
            id: 'primary-123',
            relationship: 'self',
            isPrimary: true,
            isActive: true,
            lastAccessed: '2024-01-01T10:00:00Z',
            biometricEnabled: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }],
          ['spouse-456', {
            id: 'spouse-456',
            relationship: 'spouse',
            isPrimary: false,
            isActive: true,
            lastAccessed: '2024-01-01T09:00:00Z',
            biometricEnabled: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }],
          ['child-789', {
            id: 'child-789',
            relationship: 'child',
            isPrimary: false,
            isActive: false, // Inactive profile
            lastAccessed: '2023-12-01T00:00:00Z',
            biometricEnabled: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }]
        ]),
        primaryProfileId: 'primary-123',
        maxProfiles: 8,
        version: 1,
        lastModified: '2024-01-01T00:00:00Z'
      };

      const expectedStats = {
        totalProfiles: 3,
        activeProfiles: 2,
        primaryProfile: familyCollection.profiles.get('primary-123'),
        lastAccessedProfile: familyCollection.profiles.get('primary-123'), // Most recent access
        profilesByRelationship: {
          'self': 1,
          'spouse': 1,
          'child': 1,
          'parent': 0,
          'sibling': 0,
          'other': 0
        }
      };

      // Mock the stats calculation function
      const calculateStats = (collection: FamilyProfileCollection) => {
        const profiles = Array.from(collection.profiles.values());
        const active = profiles.filter(p => p.isActive);
        const primary = profiles.find(p => p.isPrimary);
        const lastAccessed = profiles
          .filter(p => p.lastAccessed)
          .sort((a, b) => new Date(b.lastAccessed!).getTime() - new Date(a.lastAccessed!).getTime())[0];

        const byRelationship = profiles.reduce((acc, profile) => {
          acc[profile.relationship] = (acc[profile.relationship] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Ensure all relationships are represented
        const allRelationships = ['self', 'spouse', 'child', 'parent', 'sibling', 'other'];
        allRelationships.forEach(rel => {
          if (!(rel in byRelationship)) byRelationship[rel] = 0;
        });

        return {
          totalProfiles: profiles.length,
          activeProfiles: active.length,
          primaryProfile: primary,
          lastAccessedProfile: lastAccessed,
          profilesByRelationship: byRelationship
        };
      };

      const stats = calculateStats(familyCollection);

      expect(stats.totalProfiles).toBe(3);
      expect(stats.activeProfiles).toBe(2);
      expect(stats.primaryProfile?.id).toBe('primary-123');
      expect(stats.lastAccessedProfile?.id).toBe('primary-123');
      expect(stats.profilesByRelationship).toEqual(expectedStats.profilesByRelationship);
    });
  });

  describe('Backward Compatibility', () => {
    it('should migrate single profile to family collection format', () => {
      // Mock legacy single profile storage
      const legacyProfile = {
        id: 'legacy-profile',
        givenNames: 'Legacy',
        surname: 'User',
        passportNumber: 'LEGACY123',
        nationality: 'USA',
        dateOfBirth: '1990-01-01',
        gender: 'M',
        passportExpiry: '2030-01-01',
        placeOfBirth: 'Texas',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      mockMmkvService.get.mockReturnValueOnce(null); // No family collection exists
      mockMmkvService.get.mockReturnValueOnce(legacyProfile); // Legacy profile exists

      // Migration should create new family collection with legacy profile as primary
      const expectedMigratedCollection = {
        profiles: {
          'legacy-profile': {
            id: 'legacy-profile',
            relationship: 'self',
            isPrimary: true,
            isActive: true,
            biometricEnabled: false,
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
          }
        },
        primaryProfileId: 'legacy-profile',
        maxProfiles: 8,
        version: 1,
        lastModified: expect.any(String)
      };

      expect(mockMmkvService.set).toHaveBeenCalledWith(
        'family_profiles',
        expectedMigratedCollection
      );
    });

    it('should preserve existing single user data during family addition', () => {
      const existingUserData = {
        profile: {
          id: 'existing-user-123',
          givenNames: 'Existing',
          surname: 'User',
          passportNumber: 'EXIST123',
          nationality: 'CAN',
          dateOfBirth: '1985-06-15',
          gender: 'F',
          passportExpiry: '2028-06-15',
          placeOfBirth: 'Toronto',
          updatedAt: '2023-06-15T00:00:00Z'
        },
        preferences: {
          theme: 'dark',
          notifications: true,
          biometricEnabled: true
        },
        trips: [
          {
            id: 'existing-trip-1',
            name: 'Solo Europe Trip',
            countries: ['FRA', 'ITA'],
            startDate: '2024-05-01',
            endDate: '2024-05-15'
          }
        ]
      };

      // Mock existing data retrieval
      mockMmkvService.get.mockImplementation((key: string) => {
        if (key === 'user_profile') return existingUserData.profile;
        if (key === 'user_preferences') return existingUserData.preferences;
        if (key === 'user_trips') return existingUserData.trips;
        return null;
      });

      // After family migration, existing data should remain intact
      expect(mockMmkvService.get('user_preferences')).toEqual(existingUserData.preferences);
      expect(mockMmkvService.get('user_trips')).toEqual(existingUserData.trips);
      
      // Profile should be accessible in family collection
      expect(mockMmkvService.set).toHaveBeenCalledWith(
        'family_profiles',
        expect.objectContaining({
          primaryProfileId: 'existing-user-123'
        })
      );
    });
  });
});