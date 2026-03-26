import { lazy, Suspense } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LoadingStates from '@/components/ui/LoadingStates';
import { TripStackParamList } from './types';

const TripListScreen = lazy(() => import('@/screens/trips').then(m => ({ default: m.TripListScreen })));
const CreateTripScreen = lazy(() => import('@/screens/trips').then(m => ({ default: m.CreateTripScreen })));
const TripDetailScreen = lazy(() => import('@/screens/trips').then(m => ({ default: m.TripDetailScreen })));
const LegFormScreen = lazy(() => import('@/screens/trips').then(m => ({ default: m.LegFormScreen })));
const SubmissionGuideScreen = lazy(() => import('@/screens/trips').then(m => ({ default: m.SubmissionGuideScreen })));
const PortalSubmissionScreen = lazy(() => import('@/screens/trips').then(m => ({ default: m.PortalSubmissionScreen })));
const TripChecklistScreen = lazy(() => import('@/screens/trips').then(m => ({ default: m.TripChecklistScreen })));
const TemplatesScreen = lazy(() => import('@/screens/trips').then(m => ({ default: m.TemplatesScreen })));
const ImportTripScreen = lazy(() => import('@/screens/trips').then(m => ({ default: m.ImportTripScreen })));

const ScreenLoader = () => (
  <LoadingStates state="loading" variant="spinner" size="medium" text="Loading..." fullScreen={false} />
);

const Stack = createNativeStackNavigator<TripStackParamList>();

export default function TripNavigator() {
  return (
    <ErrorBoundary
      fallback={({ resetError }) => (
        <LoadingStates
          state="error"
          fullScreen={true}
          errorMessage="Failed to load trip screens. Please try again."
          onRetry={resetError}
          showRetryButton={true}
        />
      )}
    >
      <Stack.Navigator>
        <Stack.Screen name="TripList" options={{ title: 'My Trips' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><TripListScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="CreateTrip" options={{ title: 'Create Trip' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><CreateTripScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="TripDetail" options={{ title: 'Trip Details' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><TripDetailScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="LegForm" options={{ title: 'Travel Form' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><LegFormScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="SubmissionGuide" options={{ title: 'Submission Guide' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><SubmissionGuideScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="PortalSubmission" options={{ title: 'Submit to Portal', headerShown: false }}>
          {() => (<Suspense fallback={<ScreenLoader />}><PortalSubmissionScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="TripChecklist" options={{ title: 'Pre-Departure Checklist' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><TripChecklistScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="Templates" options={{ title: 'Trip Templates' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><TemplatesScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="ImportTrip" options={{ title: 'Import Trip' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><ImportTripScreen /></Suspense>)}
        </Stack.Screen>
      </Stack.Navigator>
    </ErrorBoundary>
  );
}
