import React, { useEffect } from 'react';
import { LogBox, StatusBar, Platform, AppState as RNAppState } from 'react-native';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import './global.css';

import RootNavigator from './navigation/RootNavigator';
import { ErrorBoundary } from '@/components/ui';
import { useAppLock } from '@/hooks/useAppLock';
import { performanceMonitor } from '@/services/monitoring/performance';
import { errorTracker } from '@/services/monitoring/errorTracking';
import { initializeSchemaRegistry } from '@/services/schemas/schemaRegistry';
import { useAppStore } from '@/stores/useAppStore';
import { useTheme } from '@/utils/theme';
import {
  setNotificationProvider,
  requestNotificationPermission,
  scheduleAllProfilePassportExpiry,
} from '@/services/deadline';
import { pushNotificationProvider } from '@/services/deadline/pushNotificationProvider';
import { keychainService } from '@/services/storage';

// Suppress all LogBox overlays in dev builds so banners like
// "Fast Refresh disconnected" and "Open debugger to view warnings"
// don't overlay the UI and intercept taps during E2E testing.
// This only affects the visual overlay — warnings still go to console.
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

// Expose the app store on window in non-production builds so Playwright E2E
// tests can imperatively set state (e.g. lock the app) without going through
// the full UI flow. Mirrors the __navigationRef pattern in RootNavigator.
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__borderlyAppStore = useAppStore;
}

function AppContent(): React.JSX.Element {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <RootNavigator />
    </>
  );
}

function App(): React.JSX.Element {
  // Mount useAppLock at the root so inactivity detection and background-lock
  // logic runs for the entire app lifecycle, not just when a specific screen
  // is active. The actual lock gate is rendered inside RootNavigator.
  useAppLock();

  const triggerSchemaUpdateCheck = useAppStore(s => s.triggerSchemaUpdateCheck);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Initialize monitoring services
    try {
      // Gather device information using built-in Platform APIs
      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version.toString(),
        model: 'Unknown', // Would need native module to get actual model
        isEmulator: false, // Cannot determine without native module
      };

      // Gather app state information
      const appState = {
        version: '1.0.0', // Would come from app config or native module
        buildNumber: '1', // Would come from app config or native module  
        isDebug: __DEV__,
        activeScreen: 'App',
        hasProfile: false, // Will be updated by profile store
        tripCount: 0, // Will be updated by trip store
      };

      // Initialize error tracking
      errorTracker.initialize(deviceInfo, appState);

      // Initialize schema registry for country forms (prefers MMKV-cached schemas)
      initializeSchemaRegistry().catch(err =>
        console.warn('Failed to initialize schema registry:', err)
      );

      // Register the production push notification provider so the scheduler
      // uses real OS notifications instead of the default stub.
      setNotificationProvider(pushNotificationProvider);

      // Request OS permission for local notifications (non-blocking).
      // Result is intentionally ignored here — the scheduler already logs
      // a warning when permission is denied.
      requestNotificationPermission().catch(() => {
        /* non-critical — app continues without notifications */
      });

      // Schedule passport expiry reminders for all stored profiles (non-blocking).
      // Loads profile IDs from keychain and schedules up to 4 notifications per
      // profile (6mo, 3mo, 1mo, 1wk before expiry).
      keychainService.getAllProfileIds()
        .then(async (ids) => {
          const profiles = await Promise.all(
            ids.map(id => keychainService.getProfileById(id)),
          );
          const validProfiles = profiles.filter(
            (p): p is NonNullable<typeof p> => p !== null,
          );
          return scheduleAllProfilePassportExpiry(validProfiles);
        })
        .catch(() => {
          /* non-critical — app continues without passport expiry notifications */
        });

      // Fire background schema update check — non-blocking, never throws.
      // Uses void to explicitly discard the promise; errors are swallowed
      // inside triggerSchemaUpdateCheck so the app always stays running.
      void triggerSchemaUpdateCheck();

      // Record startup metrics (placeholder values until native implementation)
      performanceMonitor.recordStartupMetrics({
        appStartTime: 0, // Requires native measurement from app launch
        jsLoadTime: 0, // Requires native measurement
        splashScreenDuration: 0, // Requires native measurement
        timeToInteractive: 0, // Requires native measurement
      });

      // Track app state changes
      const handleAppStateChange = (nextAppState: string) => {
        errorTracker.addBreadcrumb({
          type: 'state_change',
          message: `App state changed to ${nextAppState}`,
          level: 'info',
        });
      };

      const appStateSubscription = RNAppState.addEventListener('change', handleAppStateChange);

      // Return cleanup function
      return () => {
        appStateSubscription?.remove();
      };
    } catch (error) {
      // Silently fail if monitoring setup fails - don't break the app
      console.warn('Failed to initialize monitoring:', error);
      return () => {}; // Return empty cleanup function
    }
  }, [triggerSchemaUpdateCheck]);

  return (
    <GluestackUIProvider mode={resolvedTheme}>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </GluestackUIProvider>
  );
}

export default App;
