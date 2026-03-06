import { MMKV } from 'react-native-mmkv';

export interface AppPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  onboardingComplete: boolean;
  biometricEnabled: boolean;
  lastSchemaUpdateCheck: string;
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
}

export interface MMKVService {
  // Preferences
  getPreferences(): AppPreferences;
  setPreference<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]): void;
  clearPreferences(): void;

  // Feature flags
  getFeatureFlag(flag: string): boolean;
  setFeatureFlag(flag: string, value: boolean): void;

  // Cache
  getCacheItem<T>(key: string): T | null;
  setCacheItem<T>(key: string, value: T): void;
  clearCache(): void;

  // Generic storage
  getString(key: string): string | undefined;
  setString(key: string, value: string): void;
  getBoolean(key: string): boolean | undefined;
  setBoolean(key: string, value: boolean): void;
  getNumber(key: string): number | undefined;
  setNumber(key: string, value: number): void;
  delete(key: string): void;
  getAllKeys(): string[];
  clearAll(): void;
}

class MMKVServiceImpl implements MMKVService {
  private storage: MMKV;

  constructor() {
    this.storage = new MMKV({
      id: 'borderly-app-storage',
      // MMKV storage is not encrypted (non-sensitive data only)
    });
  }

  // Preferences
  getPreferences(): AppPreferences {
    const defaultPrefs: AppPreferences = {
      theme: 'auto',
      language: 'en',
      onboardingComplete: false,
      biometricEnabled: false,
      lastSchemaUpdateCheck: '',
      analyticsEnabled: false,
      crashReportingEnabled: false,
    };

    try {
      const prefsJson = this.storage.getString('app_preferences');
      if (prefsJson) {
        return { ...defaultPrefs, ...JSON.parse(prefsJson) };
      }
    } catch (error) {
      console.warn('Failed to load preferences, using defaults:', error);
    }

    return defaultPrefs;
  }

  setPreference<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]): void {
    try {
      const currentPrefs = this.getPreferences();
      const updatedPrefs = { ...currentPrefs, [key]: value };
      this.storage.set('app_preferences', JSON.stringify(updatedPrefs));
    } catch (error) {
      console.error('Failed to save preference:', error);
    }
  }

  clearPreferences(): void {
    this.storage.delete('app_preferences');
  }

  // Feature flags
  getFeatureFlag(flag: string): boolean {
    return this.storage.getBoolean(`feature_flag_${flag}`) ?? false;
  }

  setFeatureFlag(flag: string, value: boolean): void {
    this.storage.set(`feature_flag_${flag}`, value);
  }

  // Cache
  getCacheItem<T>(key: string): T | null {
    try {
      const cacheJson = this.storage.getString(`cache_${key}`);
      return cacheJson ? JSON.parse(cacheJson) : null;
    } catch (error) {
      console.warn(`Failed to get cache item ${key}:`, error);
      return null;
    }
  }

  setCacheItem<T>(key: string, value: T): void {
    try {
      this.storage.set(`cache_${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to set cache item ${key}:`, error);
    }
  }

  clearCache(): void {
    const keys = this.getAllKeys().filter(key => key.startsWith('cache_'));
    keys.forEach(key => this.storage.delete(key));
  }

  // Generic storage
  getString(key: string): string | undefined {
    return this.storage.getString(key);
  }

  setString(key: string, value: string): void {
    this.storage.set(key, value);
  }

  getBoolean(key: string): boolean | undefined {
    return this.storage.getBoolean(key);
  }

  setBoolean(key: string, value: boolean): void {
    this.storage.set(key, value);
  }

  getNumber(key: string): number | undefined {
    return this.storage.getNumber(key);
  }

  setNumber(key: string, value: number): void {
    this.storage.set(key, value);
  }

  delete(key: string): void {
    this.storage.delete(key);
  }

  getAllKeys(): string[] {
    return this.storage.getAllKeys();
  }

  clearAll(): void {
    this.storage.clearAll();
  }
}

// Singleton instance
export const mmkvService: MMKVService = new MMKVServiceImpl();
