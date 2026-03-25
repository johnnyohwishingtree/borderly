import { lazy, Suspense } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LoadingStates from '@/components/ui/LoadingStates';
import { SettingsStackParamList } from './types';

const SettingsScreen = lazy(() => import('@/screens/settings').then(m => ({ default: m.SettingsScreen })));
const NotificationPreferencesScreen = lazy(() => import('@/screens/settings').then(m => ({ default: m.NotificationPreferencesScreen })));
const PrivacyPolicyScreen = lazy(() => import('@/screens/settings').then(m => ({ default: m.PrivacyPolicyScreen })));
const RestoreBackupModal = lazy(() => import('@/screens/settings').then(m => ({ default: m.RestoreBackupModal })));

const FeedbackScreen = lazy(() => import('@/screens/support').then(m => ({ default: m.FeedbackScreen })));
const BugReportScreen = lazy(() => import('@/screens/support').then(m => ({ default: m.BugReportScreen })));
const HelpScreen = lazy(() => import('@/screens/support').then(m => ({ default: m.HelpScreen })));

const FAQScreen = lazy(() => import('@/screens/help').then(m => ({ default: m.FAQScreen })));
const TroubleshootingScreen = lazy(() => import('@/screens/help').then(m => ({ default: m.TroubleshootingScreen })));

const ScreenLoader = () => (
  <LoadingStates state="loading" variant="spinner" size="medium" text="Loading..." fullScreen={false} />
);

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsNavigator() {
  return (
    <ErrorBoundary
      fallback={({ resetError }) => (
        <LoadingStates
          state="error"
          fullScreen={true}
          errorMessage="Failed to load settings screens. Please try again."
          onRetry={resetError}
          showRetryButton={true}
        />
      )}
    >
      <Stack.Navigator>
        <Stack.Screen name="Settings" options={{ title: 'Settings' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><SettingsScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="NotificationPreferences" options={{ title: 'Notifications' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><NotificationPreferencesScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="Feedback" options={{ title: 'Send Feedback' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><FeedbackScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="BugReport" options={{ title: 'Report Bug' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><BugReportScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="Help" options={{ title: 'Help & Support' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><HelpScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="FAQ" options={{ title: 'Frequently Asked Questions' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><FAQScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="Troubleshooting" options={{ title: 'Troubleshooting Guide' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><TroubleshootingScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="PrivacyPolicy" options={{ title: 'Privacy Policy' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><PrivacyPolicyScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="RestoreBackup" options={{ title: 'Restore from Backup' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><RestoreBackupModal /></Suspense>)}
        </Stack.Screen>
      </Stack.Navigator>
    </ErrorBoundary>
  );
}
