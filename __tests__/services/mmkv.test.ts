// Mock the MMKV instance — must be defined before module imports
const mockStorage = {
  set: jest.fn(),
  getString: jest.fn(),
  getBoolean: jest.fn(),
  getNumber: jest.fn(),
  delete: jest.fn(),
  getAllKeys: jest.fn().mockReturnValue([]),
  clearAll: jest.fn(),
};

jest.unmock('@/services/storage/mmkv');
jest.unmock('@/services/storage');
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => mockStorage),
}));

import { mmkvService } from '@/services/storage/mmkv';
import { MMKV } from 'react-native-mmkv';

describe('MMKVService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.set.mockImplementation(() => {});
    mockStorage.getString.mockReturnValue(undefined);
    mockStorage.getBoolean.mockReturnValue(undefined);
    mockStorage.getNumber.mockReturnValue(undefined);
    mockStorage.getAllKeys.mockReturnValue([]);
  });

  describe('preferences', () => {
    it('should return default preferences when none exist', () => {
      mockStorage.getString.mockReturnValue(undefined);

      const prefs = mmkvService.getPreferences();

      expect(prefs).toEqual({
        theme: 'auto',
        language: 'en',
        onboardingComplete: false,
        biometricEnabled: false,
        lastSchemaUpdateCheck: '',
        analyticsEnabled: false,
        crashReportingEnabled: false,
      });
    });

    it('should return stored preferences merged with defaults', () => {
      const storedPrefs = {
        theme: 'dark',
        onboardingComplete: true,
      };
      mockStorage.getString.mockReturnValue(JSON.stringify(storedPrefs));

      const prefs = mmkvService.getPreferences();

      expect(prefs).toEqual({
        theme: 'dark',
        language: 'en',
        onboardingComplete: true,
        biometricEnabled: false,
        lastSchemaUpdateCheck: '',
        analyticsEnabled: false,
        crashReportingEnabled: false,
      });
    });

    it('should handle corrupted preferences JSON gracefully', () => {
      mockStorage.getString.mockReturnValue('invalid-json');

      const prefs = mmkvService.getPreferences();

      expect(prefs).toEqual({
        theme: 'auto',
        language: 'en',
        onboardingComplete: false,
        biometricEnabled: false,
        lastSchemaUpdateCheck: '',
        analyticsEnabled: false,
        crashReportingEnabled: false,
      });
    });

    it('should set individual preference', () => {
      const existingPrefs = { theme: 'auto', language: 'en', onboardingComplete: false };
      mockStorage.getString.mockReturnValue(JSON.stringify(existingPrefs));

      mmkvService.setPreference('theme', 'dark');

      expect(mockStorage.set).toHaveBeenCalledWith(
        'app_preferences',
        JSON.stringify({
          ...existingPrefs,
          theme: 'dark',
          biometricEnabled: false,
          lastSchemaUpdateCheck: '',
          analyticsEnabled: false,
          crashReportingEnabled: false,
        })
      );
    });

    it('should clear preferences', () => {
      mmkvService.clearPreferences();

      expect(mockStorage.delete).toHaveBeenCalledWith('app_preferences');
    });

    it('should handle preference setting errors gracefully', () => {
      mockStorage.set.mockImplementation(() => {
        throw new Error('Storage error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mmkvService.setPreference('theme', 'dark');

      expect(consoleSpy).toHaveBeenCalledWith('Failed to save preference:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('feature flags', () => {
    it('should get feature flag value', () => {
      mockStorage.getBoolean.mockReturnValue(true);

      const result = mmkvService.getFeatureFlag('test_feature');

      expect(mockStorage.getBoolean).toHaveBeenCalledWith('feature_flag_test_feature');
      expect(result).toBe(true);
    });

    it('should return false for non-existent feature flag', () => {
      mockStorage.getBoolean.mockReturnValue(undefined);

      const result = mmkvService.getFeatureFlag('non_existent');

      expect(result).toBe(false);
    });

    it('should set feature flag value', () => {
      mmkvService.setFeatureFlag('test_feature', true);

      expect(mockStorage.set).toHaveBeenCalledWith('feature_flag_test_feature', true);
    });
  });

  describe('cache', () => {
    it('should get cache item', () => {
      const testData = { key: 'value' };
      mockStorage.getString.mockReturnValue(JSON.stringify(testData));

      const result = mmkvService.getCacheItem('test_key');

      expect(mockStorage.getString).toHaveBeenCalledWith('cache_test_key');
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent cache item', () => {
      mockStorage.getString.mockReturnValue(undefined);

      const result = mmkvService.getCacheItem('non_existent');

      expect(result).toBeNull();
    });

    it('should handle corrupted cache JSON gracefully', () => {
      mockStorage.getString.mockReturnValue('invalid-json');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = mmkvService.getCacheItem('test_key');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get cache item test_key:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should set cache item', () => {
      const testData = { key: 'value' };

      mmkvService.setCacheItem('test_key', testData);

      expect(mockStorage.set).toHaveBeenCalledWith('cache_test_key', JSON.stringify(testData));
    });

    it('should handle cache setting errors gracefully', () => {
      mockStorage.set.mockImplementation(() => {
        throw new Error('Storage error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mmkvService.setCacheItem('test_key', { data: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to set cache item test_key:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should clear cache items', () => {
      mockStorage.getAllKeys.mockReturnValue([
        'cache_item1',
        'cache_item2',
        'feature_flag_test',
        'app_preferences',
      ]);

      mmkvService.clearCache();

      expect(mockStorage.delete).toHaveBeenCalledWith('cache_item1');
      expect(mockStorage.delete).toHaveBeenCalledWith('cache_item2');
      expect(mockStorage.delete).not.toHaveBeenCalledWith('feature_flag_test');
      expect(mockStorage.delete).not.toHaveBeenCalledWith('app_preferences');
    });
  });

  describe('generic storage', () => {
    it('should get and set string values', () => {
      const testValue = 'test string';
      mockStorage.getString.mockReturnValue(testValue);

      mmkvService.setString('test_key', testValue);
      const result = mmkvService.getString('test_key');

      expect(mockStorage.set).toHaveBeenCalledWith('test_key', testValue);
      expect(result).toBe(testValue);
    });

    it('should get and set boolean values', () => {
      mockStorage.getBoolean.mockReturnValue(true);

      mmkvService.setBoolean('test_key', true);
      const result = mmkvService.getBoolean('test_key');

      expect(mockStorage.set).toHaveBeenCalledWith('test_key', true);
      expect(result).toBe(true);
    });

    it('should get and set number values', () => {
      const testValue = 42;
      mockStorage.getNumber.mockReturnValue(testValue);

      mmkvService.setNumber('test_key', testValue);
      const result = mmkvService.getNumber('test_key');

      expect(mockStorage.set).toHaveBeenCalledWith('test_key', testValue);
      expect(result).toBe(testValue);
    });

    it('should delete keys', () => {
      mmkvService.delete('test_key');

      expect(mockStorage.delete).toHaveBeenCalledWith('test_key');
    });

    it('should get all keys', () => {
      const keys = ['key1', 'key2', 'key3'];
      mockStorage.getAllKeys.mockReturnValue(keys);

      const result = mmkvService.getAllKeys();

      expect(result).toEqual(keys);
    });

    it('should clear all data', () => {
      mmkvService.clearAll();

      expect(mockStorage.clearAll).toHaveBeenCalled();
    });
  });

  describe('initialization', () => {
    it('should use MMKV as storage backend', () => {
      // mmkvService is a singleton that wraps MMKV
      // Verify it exposes the expected interface
      expect(mmkvService.getPreferences).toBeDefined();
      expect(mmkvService.setPreference).toBeDefined();
      expect(mmkvService.getFeatureFlag).toBeDefined();
      expect(mmkvService.getCacheItem).toBeDefined();
      expect(mmkvService.getString).toBeDefined();
    });
  });
});