import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Platform, TouchableOpacity } from 'react-native';
import { FileText, QrCode, User, Settings } from 'lucide-react-native';

import { MainTabParamList } from './types';
import FormsNavigator from './FormsStack';

/** Screens in nested stacks that should hide the tab bar. */
const TAB_BAR_HIDDEN_SCREENS = new Set(['PortalSubmission']);
import WalletNavigator from './WalletStack';
import ProfileNavigator from './ProfileStack';
import SettingsNavigator from './SettingsStack';

// On web, React Navigation passes `href` to tab buttons, which causes
// TouchableOpacity to render as an <a> tag and trigger browser navigation
// instead of in-app navigation. Strip `href` on web to prevent this.
function stripWebHref(props: any) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { href, ...rest } = props;
    return rest;
  }
  return props;
}

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          minHeight: 60,
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
          minHeight: 44,
        },
      }}
    >
      <Tab.Screen
        name="Forms"
        component={FormsNavigator}
        options={({ route }) => ({
          tabBarLabel: 'Forms',
          tabBarStyle: TAB_BAR_HIDDEN_SCREENS.has(getFocusedRouteNameFromRoute(route) ?? '')
            ? { display: 'none' as const }
            : {
                backgroundColor: 'white',
                borderTopColor: '#e5e7eb',
                borderTopWidth: 1,
                minHeight: 60,
                paddingBottom: 8,
                paddingTop: 8,
              },
          tabBarButton: (props: any) => {
            const safeProps = stripWebHref(props);
            return (
              <TouchableOpacity
                {...safeProps}
                testID="tab-forms"
                accessibilityRole="tab"
                accessibilityLabel="Forms tab"
                accessibilityHint="Navigate to travel forms wizard"
                style={[safeProps.style, { minHeight: 44 }]}
              />
            );
          },
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
        })}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletNavigator}
        options={{
          tabBarLabel: 'Wallet',
          tabBarButton: (props: any) => {
            const safeProps = stripWebHref(props);
            return (
              <TouchableOpacity
                {...safeProps}
                testID="tab-wallet"
                accessibilityRole="tab"
                accessibilityLabel="QR Wallet tab"
                accessibilityHint="Navigate to saved QR codes and travel documents"
                style={[safeProps.style, { minHeight: 44 }]}
              />
            );
          },
          tabBarIcon: ({ color, size }) => <QrCode size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarButton: (props: any) => {
            const safeProps = stripWebHref(props);
            return (
              <TouchableOpacity
                {...safeProps}
                testID="tab-profile"
                accessibilityRole="tab"
                accessibilityLabel="Profile tab"
                accessibilityHint="Navigate to profile and passport information"
                style={[safeProps.style, { minHeight: 44 }]}
              />
            );
          },
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{
          tabBarLabel: 'Settings',
          tabBarButton: (props: any) => {
            const safeProps = stripWebHref(props);
            return (
              <TouchableOpacity
                {...safeProps}
                testID="tab-settings"
                accessibilityRole="tab"
                accessibilityLabel="Settings tab"
                accessibilityHint="Navigate to app settings and preferences"
                style={[safeProps.style, { minHeight: 44 }]}
              />
            );
          },
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
