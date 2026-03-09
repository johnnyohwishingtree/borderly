/**
 * Family Profile Storage Service
 * 
 * Manages secure storage and retrieval of multiple family member profiles
 * using the OS Keychain for sensitive data and MMKV for metadata.
 */

import { keychainService } from './keychain';
import { mmkvService } from './mmkv';
import { TravelerProfile } from '@/types/profile';
import { FamilyProfileCollection, ProfileMetadata, SerializableFamilyProfileCollection, FamilyRelationship } from '@/types/family';

const FAMILY_COLLECTION_KEY = 'family_profiles';

class FamilyProfileStorageService {
  /**
   * Creates initial family collection with primary profile
   */
  async createPrimaryProfile(profile: TravelerProfile): Promise<void> {
    const metadata: ProfileMetadata = {
      id: profile.id,
      relationship: 'self',
      isPrimary: true,
      isActive: true,
      biometricEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const collection: SerializableFamilyProfileCollection = {
      profiles: { [profile.id]: metadata },
      primaryProfileId: profile.id,
      maxProfiles: 8,
      version: 1,
      lastModified: new Date().toISOString(),
    };

    // Store passport data securely in keychain
    await keychainService.storeProfileById(profile.id, profile);
    
    // Store family collection metadata
    mmkvService.setString(FAMILY_COLLECTION_KEY, JSON.stringify(collection));
  }

  /**
   * Adds a new family member profile
   */
  async addFamilyMember(profile: TravelerProfile, relationship: FamilyRelationship): Promise<void> {
    const collection = await this.getFamilyCollection();
    if (!collection) {
      throw new Error('No family collection found. Create primary profile first.');
    }

    if (collection.profiles.size >= collection.maxProfiles) {
      throw new Error('Maximum family members limit reached');
    }

    const metadata: ProfileMetadata = {
      id: profile.id,
      relationship,
      isPrimary: false,
      isActive: true,
      biometricEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store passport data securely
    await keychainService.storeProfileById(profile.id, profile);
    
    // Update collection
    collection.profiles.set(profile.id, metadata);
    collection.lastModified = new Date().toISOString();
    
    await this.saveFamilyCollection(collection);
  }

  /**
   * Retrieves family collection from storage
   */
  async getFamilyCollection(): Promise<FamilyProfileCollection | null> {
    const serialized = mmkvService.getString(FAMILY_COLLECTION_KEY);
    if (!serialized) {
      return null;
    }

    try {
      const data: SerializableFamilyProfileCollection = JSON.parse(serialized);
      return {
        profiles: new Map(Object.entries(data.profiles)),
        primaryProfileId: data.primaryProfileId,
        maxProfiles: data.maxProfiles,
        version: data.version,
        lastModified: data.lastModified,
      };
    } catch (error) {
      console.error('Failed to parse family collection:', error);
      return null;
    }
  }

  /**
   * Retrieves a specific family member's profile
   */
  async getFamilyMemberProfile(profileId: string): Promise<TravelerProfile | null> {
    return await keychainService.getProfileById(profileId);
  }

  /**
   * Removes a family member (except primary profile)
   */
  async removeFamilyMember(profileId: string): Promise<void> {
    const collection = await this.getFamilyCollection();
    if (!collection) {
      throw new Error('No family collection found');
    }

    const profile = collection.profiles.get(profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    if (profile.isPrimary) {
      throw new Error('Cannot remove primary profile');
    }

    // Remove from keychain
    await keychainService.deleteProfileById(profileId);
    
    // Remove from collection
    collection.profiles.delete(profileId);
    collection.lastModified = new Date().toISOString();
    
    await this.saveFamilyCollection(collection);
  }

  /**
   * Saves family collection to storage
   */
  private async saveFamilyCollection(collection: FamilyProfileCollection): Promise<void> {
    const serializable: SerializableFamilyProfileCollection = {
      profiles: Object.fromEntries(collection.profiles),
      primaryProfileId: collection.primaryProfileId,
      maxProfiles: collection.maxProfiles,
      version: collection.version,
      lastModified: collection.lastModified,
    };

    mmkvService.setString(FAMILY_COLLECTION_KEY, JSON.stringify(serializable));
  }

  /**
   * Gets all family member profiles
   */
  async getAllProfiles(): Promise<{ metadata: ProfileMetadata; profile: TravelerProfile }[]> {
    const collection = await this.getFamilyCollection();
    if (!collection) {
      return [];
    }

    const results = [];
    for (const [profileId, metadata] of collection.profiles) {
      const profile = await keychainService.getProfileById(profileId);
      if (profile) {
        results.push({ metadata, profile });
      }
    }

    return results;
  }
}

export const familyProfileStorage = new FamilyProfileStorageService();