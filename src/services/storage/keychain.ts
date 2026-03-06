import Keychain from 'react-native-keychain';
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
}

class KeychainServiceImpl implements KeychainService {
  private readonly keychainOptions: Keychain.Options = {
    service: 'borderly',
    accessGroup: undefined,
    authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    showPrompt: 'Authenticate to access your passport data',
    promptMessage: 'Use your biometric authentication to access sensitive travel data',
    fallbackPrompt: 'Enter your device passcode',
  };

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
      const credentials = await Keychain.getInternetCredentials(PROFILE_KEY, this.keychainOptions);

      if (!credentials || credentials === false) {
        return null;
      }

      const profileJson = credentials.password;
      return JSON.parse(profileJson) as TravelerProfile;
    } catch (error) {
      console.error('Failed to retrieve profile from keychain:', error);
      // Return null instead of throwing to handle auth cancellation gracefully
      return null;
    }
  }

  async deleteProfile(): Promise<void> {
    try {
      await Keychain.resetInternetCredentials(PROFILE_KEY);
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
      
      // Convert to base64 string for storage
      const key = Array.from(keyBytes)
        .map(byte => byte.toString(16).padStart(2, '0'))
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
      const credentials = await Keychain.getInternetCredentials(ENCRYPTION_KEY, this.keychainOptions);

      if (!credentials || credentials === false) {
        return null;
      }

      return credentials.password;
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
}

// Singleton instance
export const keychainService: KeychainService = new KeychainServiceImpl();
