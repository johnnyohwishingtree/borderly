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
const TripListScreen = lazy(() => import('../../screens/trips/TripListScreen'));
const CreateTripScreen = lazy(() => import('../../screens/trips/CreateTripScreen'));
const TripDetailScreen = lazy(() => import('../../screens/trips/TripDetailScreen'));
const LegFormScreen = lazy(() => import('../../screens/trips/LegFormScreen'));
const SubmissionGuideScreen = lazy(() => import('../../screens/trips/SubmissionGuideScreen'));

// Lazy load wallet screens
const QRWalletScreen = lazy(() => import('../../screens/wallet/QRWalletScreen'));
const QRDetailScreen = lazy(() => import('../../screens/wallet/QRDetailScreen'));
const AddQRScreen = lazy(() => import('../../screens/wallet/AddQRScreen'));

// Lazy load profile screens
const ProfileScreen = lazy(() => import('../../screens/profile/ProfileScreen'));
const EditProfileScreen = lazy(() => import('../../screens/profile/EditProfileScreen'));

// Lazy load settings screens
const SettingsScreen = lazy(() => import('../../screens/settings/SettingsScreen'));

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
        {(props) => (
          <Suspense fallback={<ScreenLoader />}>
            <TripListScreen {...props} />
          </Suspense>
        )}
      </TripStack.Screen>
      <TripStack.Screen
        name="CreateTrip"
        options={{ title: 'Create Trip' }}
      >
        {(props) => (
          <Suspense fallback={<ScreenLoader />}>
            <CreateTripScreen {...props} />
          </Suspense>
        )}
      </TripStack.Screen>
      <TripStack.Screen
        name="TripDetail"
        options={{ title: 'Trip Details' }}
      >
        {(props) => (
          <Suspense fallback={<ScreenLoader />}>
            <TripDetailScreen {...props} />
          </Suspense>
        )}
      </TripStack.Screen>
      <TripStack.Screen
        name="LegForm"
        options={{ title: 'Travel Form' }}
      >
        {(props) => (
          <Suspense fallback={<ScreenLoader />}>
            <LegFormScreen {...props} />
          </Suspense>
        )}
      </TripStack.Screen>
      <TripStack.Screen
        name="SubmissionGuide"
        options={{ title: 'Submission Guide' }}
      >
        {(props) => (
          <Suspense fallback={<ScreenLoader />}>
            <SubmissionGuideScreen {...props} />
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
        {(props) => (
          <Suspense fallback={<ScreenLoader />}>
            <QRWalletScreen {...props} />
          </Suspense>
        )}
      </WalletStack.Screen>
      <WalletStack.Screen
        name="QRDetail"
        options={{ title: 'QR Details' }}
      >
        {(props) => (
          <Suspense fallback={<ScreenLoader />}>
            <QRDetailScreen {...props} />
          </Suspense>
        )}
      </WalletStack.Screen>
      <WalletStack.Screen
        name="AddQR"
        options={{ title: 'Add QR Code' }}
      >
        {(props) => (
          <Suspense fallback={<ScreenLoader />}>
            <AddQRScreen {...props} />
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
        {(props) => (
          <Suspense fallback={<ScreenLoader />}>
            <ProfileScreen {...props} />
          </Suspense>
        )}
      </ProfileStack.Screen>
      <ProfileStack.Screen
        name="EditProfile"
        options={{ title: 'Edit Profile' }}
      >
        {(props) => (
          <Suspense fallback={<ScreenLoader />}>
            <EditProfileScreen {...props} />
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
        {(props) => (
          <Suspense fallback={<ScreenLoader />}>
            <SettingsScreen {...props} />
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
