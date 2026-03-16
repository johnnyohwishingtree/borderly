import * as Keychain from 'react-native-keychain';
import { TravelerProfile } from '@/types/profile';
import { PortalCredential } from '@/types/submission';
import { mmkvService } from './mmkv';
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

  // Portal credential methods
  storePortalCredential(profileId: string, portalCode: string, username: string, password: string, email?: string): Promise<void>;
  getPortalCredential(profileId: string, portalCode: string): Promise<{ username: string; password: string } | null>;
  deletePortalCredential(profileId: string, portalCode: string): Promise<void>;
  getPortalCredentialsForProfile(profileId: string): Promise<PortalCredential[]>;
  deleteAllPortalCredentialsForProfile(profileId: string): Promise<void>;

  // System utilities
  isAvailable(): Promise<boolean>;
  clearSensitiveMemory(): void;
  secureCleanup(): Promise<void>;
}

class KeychainServiceImpl implements KeychainService {
  // In-memory sensitive data tracking for cleanup
  private sensitiveDataRefs: WeakSet<object> = new WeakSet();
  private lastAccessTime: Record<string, number> = {};

  private async getKeychainSetOptions(): Promise<Keychain.SetOptions> {
    const baseOptions: Keychain.SetOptions = {
      service: 'borderly',
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    };

    try {
      // Check if biometrics are available and enrolled
      const biometryType = await Keychain.getSupportedBiometryType();
      const canUseAuth = await Keychain.canImplyAuthentication({
        authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS
      });

      if (biometryType && canUseAuth) {
        // Use biometric authentication when available
        return {
          ...baseOptions,
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
        };
      } else {
        // Fall back to device passcode only
        return {
          ...baseOptions,
          accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        };
      }
    } catch (error) {
      console.warn('Failed to check biometric availability, using basic security:', error);
      // Fall back to basic security if checks fail
      return baseOptions;
    }
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
    const options = await this.getKeychainSetOptions();
    await Keychain.setInternetCredentials(key, username, data, options);
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

  // ---------------------------------------------------------------------------
  // Portal credential helpers
  // ---------------------------------------------------------------------------

  private getPortalCredentialKey(profileId: string, portalCode: string): string {
    return `borderly_portal_cred_${profileId}_${portalCode}`;
  }

  private getPortalCredentialIndexKey(profileId: string): string {
    return `borderly_portal_cred_index_${profileId}`;
  }

  private getPortalCredentialIndex(profileId: string): PortalCredential[] {
    try {
      const raw = mmkvService.getString(this.getPortalCredentialIndexKey(profileId));
      if (raw) {
        return JSON.parse(raw) as PortalCredential[];
      }
    } catch (error) {
      console.warn(`Failed to read portal credential index for ${profileId}:`, error);
    }
    return [];
  }

  private savePortalCredentialIndex(profileId: string, credentials: PortalCredential[]): void {
    try {
      mmkvService.setString(
        this.getPortalCredentialIndexKey(profileId),
        JSON.stringify(credentials),
      );
    } catch (error) {
      console.error(`Failed to save portal credential index for ${profileId}:`, error);
    }
  }

  // ---------------------------------------------------------------------------
  // Portal credential methods
  // ---------------------------------------------------------------------------

  async storePortalCredential(
    profileId: string,
    portalCode: string,
    username: string,
    password: string,
    email?: string,
  ): Promise<void> {
    try {
      const key = this.getPortalCredentialKey(profileId, portalCode);
      // Store password as the Keychain "password" field; username as the "username"
      await this.storeInKeychain(key, username, password);

      // Update MMKV metadata index (no password here)
      const now = new Date().toISOString();
      const index = this.getPortalCredentialIndex(profileId);
      const existingIdx = index.findIndex(c => c.portalCode === portalCode);
      const entry: PortalCredential = {
        portalCode,
        profileId,
        username,
        ...(email !== undefined && { email }),
        createdAt: existingIdx >= 0 ? index[existingIdx].createdAt : now,
        lastUsed: now,
      };

      if (existingIdx >= 0) {
        index[existingIdx] = entry;
      } else {
        index.push(entry);
      }
      this.savePortalCredentialIndex(profileId, index);
    } catch (error) {
      console.error(`Failed to store portal credential for ${profileId}/${portalCode}:`, error);
      throw new Error('Failed to securely store portal credential');
    }
  }

  async getPortalCredential(
    profileId: string,
    portalCode: string,
  ): Promise<{ username: string; password: string } | null> {
    try {
      const key = this.getPortalCredentialKey(profileId, portalCode);
      this.lastAccessTime[key] = Date.now();
      const credentials = await Keychain.getInternetCredentials(key, this.keychainGetOptions);

      if (!credentials || typeof credentials === 'boolean') {
        return null;
      }

      // Update lastUsed in MMKV index
      const index = this.getPortalCredentialIndex(profileId);
      const existingIdx = index.findIndex(c => c.portalCode === portalCode);
      if (existingIdx >= 0) {
        index[existingIdx] = {
          ...index[existingIdx],
          lastUsed: new Date().toISOString(),
        };
        this.savePortalCredentialIndex(profileId, index);
      }

      return { username: credentials.username, password: credentials.password };
    } catch (error) {
      console.error(`Failed to retrieve portal credential for ${profileId}/${portalCode}:`, error);
      return null;
    }
  }

  async deletePortalCredential(profileId: string, portalCode: string): Promise<void> {
    try {
      const key = this.getPortalCredentialKey(profileId, portalCode);
      await this.deleteFromKeychain(key);

      // Remove from MMKV index
      const index = this.getPortalCredentialIndex(profileId);
      const updated = index.filter(c => c.portalCode !== portalCode);
      this.savePortalCredentialIndex(profileId, updated);
    } catch (error) {
      console.error(`Failed to delete portal credential for ${profileId}/${portalCode}:`, error);
      throw new Error('Failed to delete portal credential');
    }
  }

  async getPortalCredentialsForProfile(profileId: string): Promise<PortalCredential[]> {
    return this.getPortalCredentialIndex(profileId);
  }

  async deleteAllPortalCredentialsForProfile(profileId: string): Promise<void> {
    try {
      const credentials = this.getPortalCredentialIndex(profileId);

      // Delete each credential from Keychain in parallel
      await Promise.all(
        credentials.map(cred =>
          this.deleteFromKeychain(
            this.getPortalCredentialKey(profileId, cred.portalCode),
          ).catch(err => {
            console.warn(
              `Failed to delete portal credential ${cred.portalCode} for ${profileId}:`,
              err,
            );
          }),
        ),
      );

      // Clear the MMKV index
      mmkvService.delete(this.getPortalCredentialIndexKey(profileId));
    } catch (error) {
      console.error(`Failed to delete all portal credentials for profile ${profileId}:`, error);
      throw new Error(`Failed to delete portal credentials for profile ${profileId}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if keychain is available by testing basic functionality
      const testKey = 'borderly_availability_test';
      const testData = 'test';
      
      // Try to store and retrieve a test value
      await Keychain.setInternetCredentials(testKey, 'test', testData, {
        service: 'borderly',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      
      const retrieved = await Keychain.getInternetCredentials(testKey, this.keychainGetOptions);
      
      // Clean up test data
      await Keychain.resetInternetCredentials({ server: testKey }).catch(() => {});
      
      return !!(retrieved && typeof retrieved !== 'boolean' && retrieved.password === testData);
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

      // Cascade: delete all portal credentials for this profile
      await this.deleteAllPortalCredentialsForProfile(profileId);
    } catch (error) {
      console.error(`Failed to delete profile ${profileId}:`, error);
      throw new Error(`Failed to delete profile data for ${profileId}`);
    }
  }

  async getAllProfileIds(): Promise<string[]> {
    // Note: react-native-keychain doesn't provide a way to list all keys
    // We'll need to track profile IDs separately in MMKV
    // For now, return empty array - this will be handled by the profile store
    return [];
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
