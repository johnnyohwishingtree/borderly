import { lazy, Suspense } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, View, ActivityIndicator } from 'react-native';

import {
  MainTabParamList,
  TripStackParamList,
  WalletStackParamList,
  ProfileStackParamList,
  SettingsStackParamList,
} from './types';

// Lazy load trip screens
const TripListScreen = lazy(() => import('../../screens/trips').then(m => ({ default: m.TripListScreen })));
const CreateTripScreen = lazy(() => import('../../screens/trips').then(m => ({ default: m.CreateTripScreen })));
const TripDetailScreen = lazy(() => import('../../screens/trips').then(m => ({ default: m.TripDetailScreen })));
const LegFormScreen = lazy(() => import('../../screens/trips').then(m => ({ default: m.LegFormScreen })));
const SubmissionGuideScreen = lazy(() => import('../../screens/trips').then(m => ({ default: m.SubmissionGuideScreen })));

// Lazy load wallet screens
const QRWalletScreen = lazy(() => import('../../screens/wallet').then(m => ({ default: m.QRWalletScreen })));
const QRDetailScreen = lazy(() => import('../../screens/wallet').then(m => ({ default: m.QRDetailScreen })));
const AddQRScreen = lazy(() => import('../../screens/wallet').then(m => ({ default: m.AddQRScreen })));

// Lazy load profile screens
const ProfileScreen = lazy(() => import('../../screens/profile').then(m => ({ default: m.ProfileScreen })));
const EditProfileScreen = lazy(() => import('../../screens/profile').then(m => ({ default: m.EditProfileScreen })));

// Lazy load settings screens
const SettingsScreen = lazy(() => import('../../screens/settings').then(m => ({ default: m.SettingsScreen })));

// Lazy load support screens
const FeedbackScreen = lazy(() => import('../../screens/support').then(m => ({ default: m.FeedbackScreen })));
const BugReportScreen = lazy(() => import('../../screens/support').then(m => ({ default: m.BugReportScreen })));
const HelpScreen = lazy(() => import('../../screens/support').then(m => ({ default: m.HelpScreen })));

// Loading component for lazy-loaded screens
const ScreenLoader = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#3b82f6" />
  </View>
);

const Tab = createBottomTabNavigator<MainTabParamList>();
const TripStack = createNativeStackNavigator<TripStackParamList>();
const WalletStack = createNativeStackNavigator<WalletStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

function TripNavigator() {
  return (
    <TripStack.Navigator>
      <TripStack.Screen
        name="TripList"
        options={{ title: 'My Trips' }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <TripListScreen />
          </Suspense>
        )}
      </TripStack.Screen>
      <TripStack.Screen
        name="CreateTrip"
        options={{ title: 'Create Trip' }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <CreateTripScreen />
          </Suspense>
        )}
      </TripStack.Screen>
      <TripStack.Screen
        name="TripDetail"
        options={{ title: 'Trip Details' }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <TripDetailScreen />
          </Suspense>
        )}
      </TripStack.Screen>
      <TripStack.Screen
        name="LegForm"
        options={{ title: 'Travel Form' }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <LegFormScreen />
          </Suspense>
        )}
      </TripStack.Screen>
      <TripStack.Screen
        name="SubmissionGuide"
        options={{ title: 'Submission Guide' }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <SubmissionGuideScreen />
          </Suspense>
        )}
      </TripStack.Screen>
    </TripStack.Navigator>
  );
}

function WalletNavigator() {
  return (
    <WalletStack.Navigator>
      <WalletStack.Screen
        name="QRWallet"
        options={{ title: 'QR Wallet' }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <QRWalletScreen />
          </Suspense>
        )}
      </WalletStack.Screen>
      <WalletStack.Screen
        name="QRDetail"
        options={{ title: 'QR Details' }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <QRDetailScreen />
          </Suspense>
        )}
      </WalletStack.Screen>
      <WalletStack.Screen
        name="AddQR"
        options={{ title: 'Add QR Code' }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <AddQRScreen />
          </Suspense>
        )}
      </WalletStack.Screen>
    </WalletStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="Profile"
        options={{ title: 'Profile' }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <ProfileScreen />
          </Suspense>
        )}
      </ProfileStack.Screen>
      <ProfileStack.Screen
        name="EditProfile"
        options={{ title: 'Edit Profile' }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <EditProfileScreen />
          </Suspense>
        )}
      </ProfileStack.Screen>
    </ProfileStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen
        name="Settings"
        options={{ title: 'Settings' }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <SettingsScreen />
          </Suspense>
        )}
      </SettingsStack.Screen>
      <SettingsStack.Screen
        name="Feedback"
        options={{ title: 'Send Feedback' }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <FeedbackScreen />
          </Suspense>
        )}
      </SettingsStack.Screen>
      <SettingsStack.Screen
        name="BugReport"
        options={{ title: 'Report Bug' }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <BugReportScreen />
          </Suspense>
        )}
      </SettingsStack.Screen>
      <SettingsStack.Screen
        name="Help"
        options={{ title: 'Help & Support' }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <HelpScreen />
          </Suspense>
        )}
      </SettingsStack.Screen>
    </SettingsStack.Navigator>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          minHeight: 60, // Ensure adequate touch target height
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarItemStyle: {
          minHeight: 44, // iOS Human Interface Guidelines minimum
        },
      }}
    >
      <Tab.Screen
        name="Trips"
        component={TripNavigator}
        options={{
          tabBarLabel: 'Trips',
          tabBarButton: (props: any) => (
            <TouchableOpacity
              {...props}
              accessibilityLabel="Trips tab"
              accessibilityHint="Navigate to trips and travel forms"
              style={[props.style, { minHeight: 44 }]}
            />
          ),
          // TODO: Add tab bar icon
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletNavigator}
        options={{
          tabBarLabel: 'Wallet',
          tabBarButton: (props: any) => (
            <TouchableOpacity
              {...props}
              accessibilityLabel="QR Wallet tab"
              accessibilityHint="Navigate to saved QR codes and travel documents"
              style={[props.style, { minHeight: 44 }]}
            />
          ),
          // TODO: Add tab bar icon
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarButton: (props: any) => (
            <TouchableOpacity
              {...props}
              accessibilityLabel="Profile tab"
              accessibilityHint="Navigate to profile and passport information"
              style={[props.style, { minHeight: 44 }]}
            />
          ),
          // TODO: Add tab bar icon
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{
          tabBarLabel: 'Settings',
          tabBarButton: (props: any) => (
            <TouchableOpacity
              {...props}
              accessibilityLabel="Settings tab"
              accessibilityHint="Navigate to app settings and preferences"
              style={[props.style, { minHeight: 44 }]}
            />
          ),
          // TODO: Add tab bar icon
        }}
      />
    </Tab.Navigator>
  );
}
