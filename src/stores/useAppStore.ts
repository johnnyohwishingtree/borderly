import { create } from 'zustand';
import { mmkvService, AppPreferences } from '@/services/storage';
import { schemaUpdateService } from '@/services/schemas/schemaUpdateService';
import { schemaRegistry } from '@/services/schemas/schemaRegistry';

const APP_THEME_KEY = 'app_theme';

export type ThemePreference = 'system' | 'light' | 'dark';

const HAS_SEEN_FIRST_RUN_PROMPT_KEY = 'has_seen_first_run_prompt';

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
  /** Convenience: lock the app (same as setAppLocked(true)) */
  lock: () => void;
  /** Convenience: unlock the app (same as setAppLocked(false)) */
  unlock: () => void;
  lastActiveTime: number;
  updateLastActiveTime: () => void;

  // App-lock configuration
  /** Whether the inactivity/background lock is enabled. Defaults to false. */
  isLockEnabled: boolean;
  setLockEnabled: (enabled: boolean) => void;
  /** Minutes of inactivity before the app auto-locks. Defaults to 5. */
  lockTimeoutMinutes: number;
  setLockTimeoutMinutes: (minutes: number) => void;

  // Biometric availability
  isBiometricAvailable: boolean;
  setBiometricAvailable: (available: boolean) => void;

  // Network state
  isOnline: boolean;
  setOnline: (online: boolean) => void;

  // Theme preference (persisted under app_theme MMKV key)
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;

  // Cache management
  clearCache: () => void;

  // Error handling
  lastError: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Schema update tracking
  lastSchemaCheck: number | null;
  schemasUpToDate: boolean;
  /**
   * Trigger a background schema-update check.  Never blocks the UI — the
   * returned Promise resolves after the check finishes but callers can safely
   * fire-and-forget without awaiting.
   * Returns `true` if the check completed successfully (even if no updates were
   * found), or `false` if the check itself failed.
   */
  triggerSchemaUpdateCheck: () => Promise<boolean>;

  // Schema freshness — for the TripList banner and Settings Form Data section
  /** Epoch ms when the most recent OTA schema refresh occurred; null = never updated (fresh install). */
  lastSchemaRefreshTime: number | null;
  /** Human-readable country names refreshed in the last OTA update. */
  schemaRefreshCountries: string[];
  /** Epoch ms when the user dismissed the "schemas updated" banner; null = not yet dismissed. */
  schemaBannerDismissedAt: number | null;
  /** Dismiss the "schemas updated" informational banner. */
  dismissSchemaBanner: () => void;
  /** Load all persisted app state from MMKV (call once at startup). */
  loadPersistedAppState: () => void;

  // First-run prompt — shown once after onboarding on the TripList screen
  /** Whether the user has already dismissed the post-onboarding "create your first trip" prompt. */
  hasSeenFirstRunPrompt: boolean;
  /** Mark the first-run prompt as seen; persists to MMKV so it never shows again. */
  dismissFirstRunPrompt: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  theme: 'system' as ThemePreference,
  preferences: {
    theme: 'system',
    language: 'en',
    onboardingComplete: false,
    biometricEnabled: false,
    lastSchemaUpdateCheck: '',
    analyticsEnabled: false,
    crashReportingEnabled: false,
    family_profiles: '',
    current_profile_id: '',
  },
  featureFlags: {},
  isAppLocked: false,
  lastActiveTime: Date.now(),
  isLockEnabled: false,
  lockTimeoutMinutes: 5,
  isBiometricAvailable: false,
  isOnline: true,
  lastError: null,
  lastSchemaCheck: null,
  schemasUpToDate: false,
  lastSchemaRefreshTime: null,
  schemaRefreshCountries: [],
  schemaBannerDismissedAt: null,
  hasSeenFirstRunPrompt: false,

  // App preferences
  updatePreference: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    mmkvService.setPreference(key, value);
    set(state => ({
      preferences: { ...state.preferences, [key]: value },
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
      featureFlags: { ...state.featureFlags, [flag]: value },
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

  lock: () => {
    set({ isAppLocked: true });
  },

  unlock: () => {
    set({ isAppLocked: false });
  },

  updateLastActiveTime: () => {
    set({ lastActiveTime: Date.now() });
  },

  // App-lock configuration
  setLockEnabled: (enabled: boolean) => {
    mmkvService.setBoolean('app_lock_enabled', enabled);
    set({ isLockEnabled: enabled });
  },

  setLockTimeoutMinutes: (minutes: number) => {
    mmkvService.setNumber('app_lock_timeout_minutes', minutes);
    set({ lockTimeoutMinutes: minutes });
  },

  // Biometric availability
  setBiometricAvailable: (available: boolean) => {
    set({ isBiometricAvailable: available });
  },

  // Network state
  setOnline: (online: boolean) => {
    set({ isOnline: online });
  },

  // Theme preference
  setTheme: (theme: ThemePreference) => {
    mmkvService.setString(APP_THEME_KEY, theme);
    set({ theme });
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

  // Schema update tracking
  triggerSchemaUpdateCheck: async () => {
    try {
      const result = await schemaUpdateService.checkForUpdates();

      // If any schemas were refreshed, reload the registry so the in-memory
      // cache reflects the newly-stored MMKV data.
      if (result.updated.length > 0) {
        schemaRegistry.reset();
        await schemaRegistry.initialize().catch(err =>
          console.warn('[useAppStore] Failed to reinitialize schema registry after update:', err),
        );

        // Resolve human-readable country names for the banner message.
        const refreshedNames = result.updated.map(code => {
          const schema = schemaRegistry.getSchema(code);
          return schema?.countryName ?? code;
        });

        const now = Date.now();
        mmkvService.setNumber('schema_refresh_time', now);
        mmkvService.setString('schema_refresh_countries', JSON.stringify(refreshedNames));
        // Reset banner dismissal so the new-refresh banner shows again.
        mmkvService.delete('schema_banner_dismissed_at');

        set({
          lastSchemaCheck: now,
          schemasUpToDate: result.failed.length === 0,
          lastSchemaRefreshTime: now,
          schemaRefreshCountries: refreshedNames,
          schemaBannerDismissedAt: null,
        });
      } else {
        set({
          lastSchemaCheck: Date.now(),
          schemasUpToDate: result.failed.length === 0,
        });
      }
      return true;
    } catch (err) {
      // Never throw — keep the app running even if the check fails.
      console.warn('[useAppStore] triggerSchemaUpdateCheck failed:', err);
      set({ lastSchemaCheck: Date.now(), schemasUpToDate: false });
      return false;
    }
  },

  // Schema freshness actions
  dismissSchemaBanner: () => {
    const now = Date.now();
    mmkvService.setNumber('schema_banner_dismissed_at', now);
    set({ schemaBannerDismissedAt: now });
  },

  loadPersistedAppState: () => {
    // Load theme preference from dedicated app_theme key.
    const storedTheme = mmkvService.getString(APP_THEME_KEY) as ThemePreference | undefined;
    if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
      set({ theme: storedTheme });
    }

    const refreshTime = mmkvService.getNumber('schema_refresh_time') ?? null;
    const countriesJson = mmkvService.getString('schema_refresh_countries');
    let refreshCountries: string[] = [];
    if (countriesJson) {
      try {
        const parsed = JSON.parse(countriesJson);
        if (Array.isArray(parsed)) {
          refreshCountries = parsed as string[];
        }
      } catch {
        console.warn('[useAppStore] Failed to parse schema_refresh_countries from storage');
      }
    }
    const dismissedAt = mmkvService.getNumber('schema_banner_dismissed_at') ?? null;
    const hasSeenFirstRunPrompt = mmkvService.getBoolean(HAS_SEEN_FIRST_RUN_PROMPT_KEY) ?? false;
    const isLockEnabled = mmkvService.getBoolean('app_lock_enabled') ?? false;
    const lockTimeoutMinutes = mmkvService.getNumber('app_lock_timeout_minutes') ?? 5;

    set({
      lastSchemaRefreshTime: refreshTime,
      schemaRefreshCountries: refreshCountries,
      schemaBannerDismissedAt: dismissedAt,
      hasSeenFirstRunPrompt,
      isLockEnabled,
      lockTimeoutMinutes,
    });
  },

  // First-run prompt actions
  dismissFirstRunPrompt: () => {
    mmkvService.setBoolean(HAS_SEEN_FIRST_RUN_PROMPT_KEY, true);
    set({ hasSeenFirstRunPrompt: true });
  },
}));
