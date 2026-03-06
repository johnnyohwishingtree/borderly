import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  MainTabParamList,
  TripStackParamList,
  WalletStackParamList,
  ProfileStackParamList,
  SettingsStackParamList,
} from './types';

// Import screens
import {
  TripListScreen,
  CreateTripScreen,
  TripDetailScreen,
  LegFormScreen,
  SubmissionGuideScreen,
} from '../../screens/trips';

import {
  QRWalletScreen,
  QRDetailScreen,
  AddQRScreen,
} from '../../screens/wallet';

import {
  ProfileScreen,
  EditProfileScreen,
} from '../../screens/profile';

import { SettingsScreen } from '../../screens/settings';

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
        component={TripListScreen}
        options={{ title: 'My Trips' }}
      />
      <TripStack.Screen
        name="CreateTrip"
        component={CreateTripScreen}
        options={{ title: 'Create Trip' }}
      />
      <TripStack.Screen
        name="TripDetail"
        component={TripDetailScreen}
        options={{ title: 'Trip Details' }}
      />
      <TripStack.Screen
        name="LegForm"
        component={LegFormScreen}
        options={{ title: 'Travel Form' }}
      />
      <TripStack.Screen
        name="SubmissionGuide"
        component={SubmissionGuideScreen}
        options={{ title: 'Submission Guide' }}
      />
    </TripStack.Navigator>
  );
}

function WalletNavigator() {
  return (
    <WalletStack.Navigator>
      <WalletStack.Screen
        name="QRWallet"
        component={QRWalletScreen}
        options={{ title: 'QR Wallet' }}
      />
      <WalletStack.Screen
        name="QRDetail"
        component={QRDetailScreen}
        options={{ title: 'QR Details' }}
      />
      <WalletStack.Screen
        name="AddQR"
        component={AddQRScreen}
        options={{ title: 'Add QR Code' }}
      />
    </WalletStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
    </ProfileStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
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
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <Tab.Screen
        name="Trips"
        component={TripNavigator}
        options={{
          tabBarLabel: 'Trips',
          // TODO: Add tab bar icon
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletNavigator}
        options={{
          tabBarLabel: 'Wallet',
          // TODO: Add tab bar icon
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          // TODO: Add tab bar icon
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{
          tabBarLabel: 'Settings',
          // TODO: Add tab bar icon
        }}
      />
    </Tab.Navigator>
  );
}
