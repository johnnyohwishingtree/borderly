import { create } from 'zustand';
import { mmkvService, AppPreferences } from '@/services/storage';

interface AppStore {
  // App preferences
  preferences: AppPreferences;
  updatePreference: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => void;
  loadPreferences: () => void;
  resetPreferences: () => void;

  // Feature flags
  featureFlags: Record<string, boolean>;
  getFeatureFlag: (flag: string) => boolean;
  setFeatureFlag: (flag: string, value: boolean) => void;
  loadFeatureFlags: () => void;

  // App state
  isAppLocked: boolean;
  setAppLocked: (locked: boolean) => void;
  lastActiveTime: number;
  updateLastActiveTime: () => void;

  // Biometric availability
  isBiometricAvailable: boolean;
  setBiometricAvailable: (available: boolean) => void;

  // Network state
  isOnline: boolean;
  setOnline: (online: boolean) => void;

  // Cache management
  clearCache: () => void;
  
  // Error handling
  lastError: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  preferences: {
    theme: 'auto',
    language: 'en',
    onboardingComplete: false,
    biometricEnabled: false,
    lastSchemaUpdateCheck: '',
    analyticsEnabled: false,
    crashReportingEnabled: false,
  },
  featureFlags: {},
  isAppLocked: false,
  lastActiveTime: Date.now(),
  isBiometricAvailable: false,
  isOnline: true,
  lastError: null,

  // App preferences
  updatePreference: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    mmkvService.setPreference(key, value);
    set(state => ({
      preferences: { ...state.preferences, [key]: value }
    }));
  },

  loadPreferences: () => {
    const preferences = mmkvService.getPreferences();
    set({ preferences });
  },

  resetPreferences: () => {
    mmkvService.clearPreferences();
    const defaultPreferences = mmkvService.getPreferences();
    set({ preferences: defaultPreferences });
  },

  // Feature flags
  getFeatureFlag: (flag: string) => {
    const flags = get().featureFlags;
    return flags[flag] ?? mmkvService.getFeatureFlag(flag);
  },

  setFeatureFlag: (flag: string, value: boolean) => {
    mmkvService.setFeatureFlag(flag, value);
    set(state => ({
      featureFlags: { ...state.featureFlags, [flag]: value }
    }));
  },

  loadFeatureFlags: () => {
    // In a real app, this might fetch from a remote config service
    // For MVP, we'll use local storage only
    const commonFlags = ['enableDebugMode', 'enableBetaFeatures', 'enableAdvancedSettings'];
    const featureFlags: Record<string, boolean> = {};
    
    commonFlags.forEach(flag => {
      featureFlags[flag] = mmkvService.getFeatureFlag(flag);
    });
    
    set({ featureFlags });
  },

  // App state
  setAppLocked: (locked: boolean) => {
    set({ isAppLocked: locked });
  },

  updateLastActiveTime: () => {
    set({ lastActiveTime: Date.now() });
  },

  // Biometric availability
  setBiometricAvailable: (available: boolean) => {
    set({ isBiometricAvailable: available });
  },

  // Network state
  setOnline: (online: boolean) => {
    set({ isOnline: online });
  },

  // Cache management
  clearCache: () => {
    mmkvService.clearCache();
    set({ lastError: null });
  },

  // Error handling
  setError: (error: string | null) => {
    set({ lastError: error });
  },

  clearError: () => {
    set({ lastError: null });
  },
}));