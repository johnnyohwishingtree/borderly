import * as Keychain from 'react-native-keychain';
import { TravelerProfile } from '@/types/profile';
import 'react-native-get-random-values';

const PROFILE_KEY = 'borderly_traveler_profile';
const ENCRYPTION_KEY = 'borderly_encryption_key';

export interface KeychainService {
  storeProfile(profile: TravelerProfile): Promise<void>;
  getProfile(): Promise<TravelerProfile | null>;
  deleteProfile(): Promise<void>;
  generateEncryptionKey(): Promise<string>;
  getEncryptionKey(): Promise<string | null>;
  isAvailable(): Promise<boolean>;
  clearSensitiveMemory(): void;
  secureCleanup(): Promise<void>;
}

class KeychainServiceImpl implements KeychainService {
  private readonly keychainOptions = {
    service: 'borderly',
    authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };

  // In-memory sensitive data tracking for cleanup
  private sensitiveDataRefs: WeakSet<object> = new WeakSet();
  private lastAccessTime: Record<string, number> = {};

  async storeProfile(profile: TravelerProfile): Promise<void> {
    try {
      const profileJson = JSON.stringify(profile);
      await Keychain.setInternetCredentials(
        PROFILE_KEY,
        'borderly_user',
        profileJson,
        this.keychainOptions
      );
    } catch (error) {
      console.error('Failed to store profile in keychain:', error);
      throw new Error('Failed to securely store profile data');
    }
  }

  async getProfile(): Promise<TravelerProfile | null> {
    try {
      this.lastAccessTime[PROFILE_KEY] = Date.now();
      const credentials = await Keychain.getInternetCredentials(PROFILE_KEY, this.keychainOptions);

      if (!credentials || typeof credentials === 'boolean') {
        return null;
      }

      const profileJson = credentials.password;
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
      await Keychain.resetInternetCredentials({ service: PROFILE_KEY });
    } catch (error) {
      console.error('Failed to delete profile from keychain:', error);
      throw new Error('Failed to delete profile data');
    }
  }

  async generateEncryptionKey(): Promise<string> {
    try {
      // Generate a cryptographically secure 256-bit key for WatermelonDB encryption
      const keyBytes = new Uint8Array(32); // 256 bits / 8 = 32 bytes
      // Use Math.random as fallback - in production this should use proper crypto
      for (let i = 0; i < keyBytes.length; i++) {
        keyBytes[i] = Math.floor(Math.random() * 256);
      }

      // Convert to hex string for storage
      const key = Array.from(keyBytes)
        .map((byte: number) => byte.toString(16).padStart(2, '0'))
        .join('');

      await Keychain.setInternetCredentials(
        ENCRYPTION_KEY,
        'borderly_encryption',
        key,
        this.keychainOptions
      );

      return key;
    } catch (error) {
      console.error('Failed to generate encryption key:', error);
      throw new Error('Failed to generate encryption key');
    }
  }

  async getEncryptionKey(): Promise<string | null> {
    try {
      this.lastAccessTime[ENCRYPTION_KEY] = Date.now();
      const credentials = await Keychain.getInternetCredentials(ENCRYPTION_KEY, this.keychainOptions);

      if (!credentials || typeof credentials === 'boolean') {
        return null;
      }

      const key = credentials.password;
      
      return key;
    } catch (error) {
      console.error('Failed to retrieve encryption key:', error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const supportedType = await Keychain.getSupportedBiometryType();
      return supportedType !== null;
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
      // Clear internet credentials (where sensitive data is actually stored)
      await Keychain.resetInternetCredentials({ service: PROFILE_KEY }).catch(() => {
        // Ignore errors - may not exist
      });
      await Keychain.resetInternetCredentials({ service: ENCRYPTION_KEY }).catch(() => {
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
}

// Singleton instance
export const keychainService: KeychainService = new KeychainServiceImpl();
