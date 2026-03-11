import React, { useEffect } from 'react';
import { LogBox, StatusBar, Platform, AppState as RNAppState } from 'react-native';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import './global.css';

import RootNavigator from './navigation/RootNavigator';
import { ErrorBoundary } from '@/components/ui';
import { performanceMonitor } from '@/services/monitoring/performance';
import { errorTracker } from '@/services/monitoring/errorTracking';
import { initializeSchemaRegistry } from '@/services/schemas/schemaRegistry';

// Suppress all LogBox overlays in dev builds so banners like
// "Fast Refresh disconnected" and "Open debugger to view warnings"
// don't overlay the UI and intercept taps during E2E testing.
// This only affects the visual overlay — warnings still go to console.
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

function App(): React.JSX.Element {
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

      // Initialize schema registry for country forms
      initializeSchemaRegistry().catch(err =>
        console.warn('Failed to initialize schema registry:', err)
      );

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
  }, []);

  return (
    <GluestackUIProvider mode="light">
      <ErrorBoundary>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <RootNavigator />
      </ErrorBoundary>
    </GluestackUIProvider>
  );
}

export default App;
