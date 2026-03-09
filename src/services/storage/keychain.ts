import * as Keychain from 'react-native-keychain';
import { TravelerProfile } from '@/types/profile';
import 'react-native-get-random-values';

const LEGACY_PROFILE_KEY = 'borderly_traveler_profile';
const ENCRYPTION_KEY = 'borderly_encryption_key';

// New multi-profile constants
const PROFILE_KEY_PREFIX = 'borderly_profile_';
const PROFILE_ENCRYPTION_KEY_PREFIX = 'borderly_profile_enc_';

export interface KeychainService {
  // Legacy single-profile methods (for backward compatibility)
  storeProfile(profile: TravelerProfile): Promise<void>;
  getProfile(): Promise<TravelerProfile | null>;
  deleteProfile(): Promise<void>;

  // New multi-profile methods
  storeProfileById(profileId: string, profile: TravelerProfile): Promise<void>;
  getProfileById(profileId: string): Promise<TravelerProfile | null>;
  deleteProfileById(profileId: string): Promise<void>;
  getAllProfileIds(): Promise<string[]>;
  profileExists(profileId: string): Promise<boolean>;

  // Migration support
  migrateLegacyProfile(): Promise<string | null>; // Returns migrated profile ID if any

  // Encryption key management
  generateEncryptionKey(): Promise<string>;
  generateProfileEncryptionKey(profileId: string): Promise<string>;
  getEncryptionKey(): Promise<string | null>;
  getProfileEncryptionKey(profileId: string): Promise<string | null>;
  deleteProfileEncryptionKey(profileId: string): Promise<void>;

  // System utilities
  isAvailable(): Promise<boolean>;
  clearSensitiveMemory(): void;
  secureCleanup(): Promise<void>;
}

class KeychainServiceImpl implements KeychainService {
  // In-memory sensitive data tracking for cleanup
  private sensitiveDataRefs: WeakSet<object> = new WeakSet();
  private lastAccessTime: Record<string, number> = {};

  private get keychainSetOptions(): Keychain.SetOptions {
    return {
      service: 'borderly',
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    };
  }

  private get keychainGetOptions(): Keychain.GetOptions {
    return {
      service: 'borderly',
    };
  }

  // Helper methods for multi-profile support
  private getProfileKeychainKey(profileId: string): string {
    return `${PROFILE_KEY_PREFIX}${profileId}`;
  }

  private getProfileEncryptionKeychainKey(profileId: string): string {
    return `${PROFILE_ENCRYPTION_KEY_PREFIX}${profileId}`;
  }

  private async storeInKeychain(key: string, username: string, data: string): Promise<void> {
    await Keychain.setInternetCredentials(key, username, data, this.keychainSetOptions);
  }

  private async getFromKeychain(key: string): Promise<string | null> {
    try {
      this.lastAccessTime[key] = Date.now();
      const credentials = await Keychain.getInternetCredentials(key, this.keychainGetOptions);

      if (!credentials || typeof credentials === 'boolean') {
        return null;
      }

      return credentials.password;
    } catch (error) {
      console.error(`Failed to retrieve from keychain (${key}):`, error);
      return null;
    }
  }

  private async deleteFromKeychain(key: string): Promise<void> {
    try {
      await Keychain.resetInternetCredentials({ server: key });
    } catch (error) {
      console.error(`Failed to delete from keychain (${key}):`, error);
      throw new Error(`Failed to delete keychain data for ${key}`);
    }
  }

  async storeProfile(profile: TravelerProfile): Promise<void> {
    try {
      const profileJson = JSON.stringify(profile);
      await this.storeInKeychain(LEGACY_PROFILE_KEY, 'borderly_user', profileJson);
    } catch (error) {
      console.error('Failed to store profile in keychain:', error);
      throw new Error('Failed to securely store profile data');
    }
  }

  async getProfile(): Promise<TravelerProfile | null> {
    try {
      const profileJson = await this.getFromKeychain(LEGACY_PROFILE_KEY);

      if (!profileJson) {
        return null;
      }

      const profile = JSON.parse(profileJson) as TravelerProfile;

      // Track sensitive data for memory cleanup
      this.sensitiveDataRefs.add(profile);

      return profile;
    } catch (error) {
      console.error('Failed to retrieve profile from keychain:', error);
      // Return null instead of throwing to handle auth cancellation gracefully
      return null;
    }
  }

  async deleteProfile(): Promise<void> {
    try {
      await Keychain.resetInternetCredentials({ server: LEGACY_PROFILE_KEY });
    } catch (error) {
      console.error('Failed to delete profile from keychain:', error);
      throw new Error('Failed to delete profile data');
    }
  }

  async generateEncryptionKey(): Promise<string> {
    try {
      // Generate a cryptographically secure 256-bit key for WatermelonDB encryption
      const keyBytes = new Uint8Array(32); // 256 bits / 8 = 32 bytes
      crypto.getRandomValues(keyBytes);

      // Convert to hex string for storage
      const key = Array.from(keyBytes)
        .map((byte: number) => byte.toString(16).padStart(2, '0'))
        .join('');

      await this.storeInKeychain(ENCRYPTION_KEY, 'borderly_encryption', key);

      return key;
    } catch (error) {
      console.error('Failed to generate encryption key:', error);
      throw new Error('Failed to generate encryption key');
    }
  }

  async getEncryptionKey(): Promise<string | null> {
    try {
      const key = await this.getFromKeychain(ENCRYPTION_KEY);

      if (!key) {
        return null;
      }

      // Track access for cleanup scheduling
      setTimeout(() => {
        // Clear reference after use to help with garbage collection
        this.clearSensitiveMemory();
      }, 60000); // Clear after 1 minute

      return key;
    } catch (error) {
      console.error('Failed to retrieve encryption key:', error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Keychain is available on iOS/Android regardless of biometric enrollment
      return true;
    } catch (error) {
      console.error('Failed to check keychain availability:', error);
      return false;
    }
  }

  clearSensitiveMemory(): void {
    // Clear tracking of sensitive data references
    this.sensitiveDataRefs = new WeakSet();
    
    // Force garbage collection in development
    if (__DEV__ && (globalThis as any).gc) {
      (globalThis as any).gc();
    }
  }

  async secureCleanup(): Promise<void> {
    try {
      // Clear any cached credentials in the native keychain module
      // This is a precautionary measure
      await Keychain.resetGenericPassword({
        service: 'borderly',
      }).catch(() => {
        // Ignore errors - may not exist
      });
      
      // Clear memory references
      this.clearSensitiveMemory();
      this.lastAccessTime = {};
      
      console.log('Keychain secure cleanup completed');
    } catch (error) {
      console.error('Error during keychain secure cleanup:', error);
    }
  }

  // New multi-profile methods

  async storeProfileById(profileId: string, profile: TravelerProfile): Promise<void> {
    try {
      const profileJson = JSON.stringify(profile);
      const keychainKey = this.getProfileKeychainKey(profileId);
      await this.storeInKeychain(keychainKey, 'borderly_user', profileJson);
    } catch (error) {
      console.error(`Failed to store profile ${profileId}:`, error);
      throw new Error(`Failed to securely store profile data for ${profileId}`);
    }
  }

  async getProfileById(profileId: string): Promise<TravelerProfile | null> {
    try {
      const keychainKey = this.getProfileKeychainKey(profileId);
      const profileJson = await this.getFromKeychain(keychainKey);
      
      if (!profileJson) {
        return null;
      }

      const profile = JSON.parse(profileJson) as TravelerProfile;
      
      // Track sensitive data for memory cleanup
      this.sensitiveDataRefs.add(profile);
      
      return profile;
    } catch (error) {
      console.error(`Failed to retrieve profile ${profileId}:`, error);
      return null;
    }
  }

  async deleteProfileById(profileId: string): Promise<void> {
    try {
      const keychainKey = this.getProfileKeychainKey(profileId);
      await this.deleteFromKeychain(keychainKey);
      
      // Also delete the profile's encryption key
      await this.deleteProfileEncryptionKey(profileId);
    } catch (error) {
      console.error(`Failed to delete profile ${profileId}:`, error);
      throw new Error(`Failed to delete profile data for ${profileId}`);
    }
  }

  async getAllProfileIds(): Promise<string[]> {
    try {
      // Note: react-native-keychain doesn't provide a way to list all keys
      // We'll need to track profile IDs separately in MMKV
      // For now, return empty array - this will be handled by the profile store
      return [];
    } catch (error) {
      console.error('Failed to get all profile IDs:', error);
      return [];
    }
  }

  async profileExists(profileId: string): Promise<boolean> {
    try {
      const keychainKey = this.getProfileKeychainKey(profileId);
      const data = await this.getFromKeychain(keychainKey);
      return data !== null;
    } catch (error) {
      console.error(`Failed to check if profile ${profileId} exists:`, error);
      return false;
    }
  }

  async migrateLegacyProfile(): Promise<string | null> {
    try {
      // Check if legacy profile exists
      const legacyProfile = await this.getFromKeychain(LEGACY_PROFILE_KEY);
      if (!legacyProfile) {
        return null;
      }

      // Parse the legacy profile
      const profile = JSON.parse(legacyProfile) as TravelerProfile;
      
      // Use the profile's ID or generate a new one
      const profileId = profile.id;
      
      // Store using new multi-profile system
      await this.storeProfileById(profileId, profile);
      
      // Generate encryption key for this profile
      await this.generateProfileEncryptionKey(profileId);
      
      // Delete legacy profile
      await this.deleteFromKeychain(LEGACY_PROFILE_KEY);
      
      console.log(`Migrated legacy profile to multi-profile system: ${profileId}`);
      return profileId;
    } catch (error) {
      console.error('Failed to migrate legacy profile:', error);
      return null;
    }
  }

  async generateProfileEncryptionKey(profileId: string): Promise<string> {
    try {
      // Generate a cryptographically secure 256-bit key for this profile
      const keyBytes = new Uint8Array(32); // 256 bits / 8 = 32 bytes
      crypto.getRandomValues(keyBytes);

      // Convert to hex string for storage
      const key = Array.from(keyBytes)
        .map((byte: number) => byte.toString(16).padStart(2, '0'))
        .join('');

      const keychainKey = this.getProfileEncryptionKeychainKey(profileId);
      await this.storeInKeychain(keychainKey, 'borderly_encryption', key);

      return key;
    } catch (error) {
      console.error(`Failed to generate encryption key for profile ${profileId}:`, error);
      throw new Error(`Failed to generate encryption key for profile ${profileId}`);
    }
  }

  async getProfileEncryptionKey(profileId: string): Promise<string | null> {
    try {
      const keychainKey = this.getProfileEncryptionKeychainKey(profileId);
      const key = await this.getFromKeychain(keychainKey);
      
      if (key) {
        // Track access for cleanup scheduling
        setTimeout(() => {
          this.clearSensitiveMemory();
        }, 60000); // Clear after 1 minute
      }

      return key;
    } catch (error) {
      console.error(`Failed to retrieve encryption key for profile ${profileId}:`, error);
      return null;
    }
  }

  async deleteProfileEncryptionKey(profileId: string): Promise<void> {
    try {
      const keychainKey = this.getProfileEncryptionKeychainKey(profileId);
      await this.deleteFromKeychain(keychainKey);
    } catch (error) {
      console.error(`Failed to delete encryption key for profile ${profileId}:`, error);
      throw new Error(`Failed to delete encryption key for profile ${profileId}`);
    }
  }
}

// Singleton instance
export const keychainService: KeychainService = new KeychainServiceImpl();
