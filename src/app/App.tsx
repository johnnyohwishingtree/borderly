import React, { useEffect } from 'react';
import { StatusBar, Platform, AppState as RNAppState } from 'react-native';

import RootNavigator from './navigation/RootNavigator';
import { ErrorBoundary } from '../components/ui';
import { performanceMonitor } from '../services/monitoring/performance';
import { errorTracker } from '../services/monitoring/errorTracking';

function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize monitoring services
    try {
      // Record app startup time
      const startTime = Date.now();
      
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

      // Record startup metrics
      performanceMonitor.recordStartupMetrics({
        appStartTime: Date.now() - startTime,
        jsLoadTime: 0, // Would be measured from native side
        splashScreenDuration: 0, // Would be measured from native side
        timeToInteractive: Date.now() - startTime,
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
    }
  }, []);

  return (
    <ErrorBoundary>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <RootNavigator />
    </ErrorBoundary>
  );
}

export default App;
