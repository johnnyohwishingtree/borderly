import { lazy, Suspense } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LoadingStates from '@/components/ui/LoadingStates';
import { FormsStackParamList } from './types';

const SelectCountriesScreen = lazy(() => import('@/screens/forms').then(m => ({ default: m.SelectCountriesScreen })));
const SelectTravelersScreen = lazy(() => import('@/screens/forms').then(m => ({ default: m.SelectTravelersScreen })));
const SmartFormScreen = lazy(() => import('@/screens/forms').then(m => ({ default: m.SmartFormScreen })));
const PortalLinksScreen = lazy(() => import('@/screens/forms').then(m => ({ default: m.PortalLinksScreen })));

// Reuse portal submission from trips (it stays in the wizard)
const PortalSubmissionScreen = lazy(() => import('@/screens/trips').then(m => ({ default: m.PortalSubmissionScreen })));

const ScreenLoader = () => (
  <LoadingStates state="loading" variant="spinner" size="medium" text="Loading..." fullScreen={false} />
);

const Stack = createNativeStackNavigator<FormsStackParamList>();

export default function FormsNavigator() {
  return (
    <ErrorBoundary
      fallback={({ resetError }) => (
        <LoadingStates
          state="error"
          fullScreen={true}
          errorMessage="Failed to load form screens. Please try again."
          onRetry={resetError}
          showRetryButton={true}
        />
      )}
    >
      <Stack.Navigator screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="SelectCountries" options={{ title: 'Where are you going?' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><SelectCountriesScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="SelectTravelers" options={{ title: "Who's traveling?" }}>
          {() => (<Suspense fallback={<ScreenLoader />}><SelectTravelersScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="SmartForm" options={{ title: 'Fill Forms' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><SmartFormScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="PortalLinks" options={{ title: 'Submit Forms' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><PortalLinksScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="PortalSubmission" options={{ title: 'Submit to Portal', headerShown: false }}>
          {() => (<Suspense fallback={<ScreenLoader />}><PortalSubmissionScreen /></Suspense>)}
        </Stack.Screen>
      </Stack.Navigator>
    </ErrorBoundary>
  );
}
