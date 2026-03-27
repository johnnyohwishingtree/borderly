/**
 * Keychain Service — Core implementation
 *
 * Coordinates OS Keychain access for profile data, encryption keys,
 * and portal credentials. Delegates multi-profile, encryption, and
 * portal credential operations to focused helper modules.
 */

import * as Keychain from 'react-native-keychain';
import { TravelerProfile } from '@/types/profile';
import { PortalCredential } from '@/types/submission';
import 'react-native-get-random-values';
import type { KeychainService } from './keychainTypes';
import type { KeychainOps } from './keychainEncryption';
import { getPortalCredentialIndex } from './keychainPortalCredentials';
import {
  SHARED_KEYCHAIN_ACCESS_GROUP,
  USE_SHARED_ACCESS_GROUP,
  KEYCHAIN_SERVICE,
} from './sharedAccessConfig';
import {
  generateEncryptionKey as genEncKey,
  getEncryptionKey as getEncKey,
  generateProfileEncryptionKey as genProfileEncKey,
  getProfileEncryptionKey as getProfileEncKey,
  deleteProfileEncryptionKey as delProfileEncKey,
} from './keychainEncryption';
import {
  storeProfileById as storeById,
  getProfileById as getById,
  deleteProfileById as deleteById,
  profileExists as checkExists,
  migrateLegacyProfile as migrateLegacy,
} from './keychainMultiProfile';
import {
  storePortalCredential as storePortalCred,
  getPortalCredential as getPortalCred,
  deletePortalCredential as deletePortalCred,
  deleteAllPortalCredentialsForProfile as deleteAllPortalCreds,
} from './keychainPortalOps';

export type { KeychainService } from './keychainTypes';

const LEGACY_PROFILE_KEY = 'borderly_traveler_profile';

class KeychainServiceImpl implements KeychainService {
  private sensitiveDataRefs: WeakSet<object> = new WeakSet();
  private lastAccessTime: Record<string, number> = {};

  private get ops(): KeychainOps {
    return {
      storeInKeychain: (key, username, data) => this.storeInKeychain(key, username, data),
      getFromKeychain: (key) => this.getFromKeychain(key),
      deleteFromKeychain: (key) => this.deleteFromKeychain(key),
      clearSensitiveMemory: () => this.clearSensitiveMemory(),
    };
  }

  private async getKeychainSetOptions(): Promise<Keychain.SetOptions> {
    const baseOptions: Keychain.SetOptions = {
      service: KEYCHAIN_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      ...(USE_SHARED_ACCESS_GROUP ? { accessGroup: SHARED_KEYCHAIN_ACCESS_GROUP } : {}),
    };

    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      const canUseAuth = await Keychain.canImplyAuthentication({
        authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
      });

      if (biometryType && canUseAuth) {
        return {
          ...baseOptions,
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
        };
      } else {
        return {
          ...baseOptions,
          accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        };
      }
    } catch (error) {
      console.warn('Failed to check biometric availability, using basic security:', error);
      return baseOptions;
    }
  }

  private get keychainGetOptions(): Keychain.GetOptions {
    return {
      service: KEYCHAIN_SERVICE,
      ...(USE_SHARED_ACCESS_GROUP ? { accessGroup: SHARED_KEYCHAIN_ACCESS_GROUP } : {}),
    };
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

  // Legacy single-profile methods

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
      if (!profileJson) return null;

      const profile = JSON.parse(profileJson) as TravelerProfile;
      this.sensitiveDataRefs.add(profile);
      return profile;
    } catch (error) {
      console.error('Failed to retrieve profile from keychain:', error);
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

  // Delegated portal credential methods

  async storePortalCredential(
    profileId: string,
    portalCode: string,
    username: string,
    password: string,
    email?: string,
  ): Promise<void> {
    return storePortalCred(this.ops, profileId, portalCode, username, password, email);
  }

  async getPortalCredential(
    profileId: string,
    portalCode: string,
  ): Promise<{ username: string; password: string } | null> {
    return getPortalCred(profileId, portalCode, this.keychainGetOptions);
  }

  async deletePortalCredential(profileId: string, portalCode: string): Promise<void> {
    return deletePortalCred(this.ops, profileId, portalCode);
  }

  async getPortalCredentialsForProfile(profileId: string): Promise<PortalCredential[]> {
    return getPortalCredentialIndex(profileId);
  }

  async deleteAllPortalCredentialsForProfile(profileId: string): Promise<void> {
    return deleteAllPortalCreds(this.ops, profileId);
  }

  // Biometric authentication

  async authenticateWithBiometric(
    service: string,
    prompt: { title: string; subtitle: string; cancel: string },
  ): Promise<boolean> {
    try {
      const result = await Keychain.getGenericPassword({
        service,
        authenticationPrompt: prompt,
      });
      return result !== false;
    } catch {
      return false;
    }
  }

  // Utility methods

  async isAvailable(): Promise<boolean> {
    try {
      const testKey = 'borderly_availability_test';
      const testData = 'test';

      await Keychain.setInternetCredentials(testKey, 'test', testData, {
        service: KEYCHAIN_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        ...(USE_SHARED_ACCESS_GROUP ? { accessGroup: SHARED_KEYCHAIN_ACCESS_GROUP } : {}),
      });

      const retrieved = await Keychain.getInternetCredentials(testKey, this.keychainGetOptions);
      await Keychain.resetInternetCredentials({ server: testKey }).catch(() => {});

      return !!(retrieved && typeof retrieved !== 'boolean' && retrieved.password === testData);
    } catch (error) {
      console.error('Failed to check keychain availability:', error);
      return false;
    }
  }

  clearSensitiveMemory(): void {
    this.sensitiveDataRefs = new WeakSet();

    if (__DEV__ && (globalThis as { gc?: () => void }).gc) {
      (globalThis as { gc?: () => void }).gc!();
    }
  }

  async secureCleanup(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE }).catch(() => {});
      this.clearSensitiveMemory();
      this.lastAccessTime = {};
      console.log('Keychain secure cleanup completed');
    } catch (error) {
      console.error('Error during keychain secure cleanup:', error);
    }
  }

  // Delegated multi-profile methods

  async storeProfileById(profileId: string, profile: TravelerProfile): Promise<void> {
    return storeById(this.ops, profileId, profile);
  }

  async getProfileById(profileId: string): Promise<TravelerProfile | null> {
    return getById(this.ops, this.sensitiveDataRefs, profileId);
  }

  async deleteProfileById(profileId: string): Promise<void> {
    return deleteById(
      this.ops,
      profileId,
      (id) => this.deleteProfileEncryptionKey(id),
      (id) => this.deleteAllPortalCredentialsForProfile(id),
    );
  }

  async getAllProfileIds(): Promise<string[]> {
    return [];
  }

  async profileExists(profileId: string): Promise<boolean> {
    return checkExists(this.ops, profileId);
  }

  async migrateLegacyProfile(): Promise<string | null> {
    return migrateLegacy(
      this.ops,
      (id, profile) => this.storeProfileById(id, profile),
      (id) => this.generateProfileEncryptionKey(id),
    );
  }

  // Delegated encryption methods

  async generateEncryptionKey(): Promise<string> {
    return genEncKey(this.ops);
  }

  async getEncryptionKey(): Promise<string | null> {
    return getEncKey(this.ops);
  }

  async generateProfileEncryptionKey(profileId: string): Promise<string> {
    return genProfileEncKey(this.ops, profileId);
  }

  async getProfileEncryptionKey(profileId: string): Promise<string | null> {
    return getProfileEncKey(this.ops, profileId);
  }

  async deleteProfileEncryptionKey(profileId: string): Promise<void> {
    return delProfileEncKey(this.ops, profileId);
  }
}

export const keychainService: KeychainService = new KeychainServiceImpl();
