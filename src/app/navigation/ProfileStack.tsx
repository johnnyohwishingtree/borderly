import { lazy, Suspense } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LoadingStates from '@/components/ui/LoadingStates';
import { ProfileStackParamList } from './types';

const ProfileScreen = lazy(() => import('@/screens/profile').then(m => ({ default: m.ProfileScreen })));
const EditProfileScreen = lazy(() => import('@/screens/profile').then(m => ({ default: m.EditProfileScreen })));
const FamilyManagementScreen = lazy(() => import('@/screens/profile').then(m => ({ default: m.FamilyManagementScreen })));
const AddFamilyMemberScreen = lazy(() => import('@/screens/profile').then(m => ({ default: m.AddFamilyMemberScreen })));
const PassportScanScreen = lazy(() => import('@/screens/onboarding').then(m => ({ default: m.PassportScanScreen })));

const ScreenLoader = () => (
  <LoadingStates state="loading" variant="spinner" size="medium" text="Loading..." fullScreen={false} />
);

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileNavigator() {
  return (
    <ErrorBoundary
      fallback={({ resetError }) => (
        <LoadingStates
          state="error"
          fullScreen={true}
          errorMessage="Failed to load profile screens. Please try again."
          onRetry={resetError}
          showRetryButton={true}
        />
      )}
    >
      <Stack.Navigator>
        <Stack.Screen name="Profile" options={{ title: 'Profile' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><ProfileScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="EditProfile" options={{ title: 'Edit Profile' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><EditProfileScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="FamilyManagement" options={{ title: 'Family Members' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><FamilyManagementScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="AddFamilyMember" options={{ title: 'Add Family Member' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><AddFamilyMemberScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="PassportScan" options={{ title: 'Passport Information' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><PassportScanScreen /></Suspense>)}
        </Stack.Screen>
      </Stack.Navigator>
    </ErrorBoundary>
  );
}
