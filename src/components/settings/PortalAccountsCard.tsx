import { ActivityIndicator, View, Text } from 'react-native';
import { Button, Card, StatusBadge } from '@/components/ui';
import { getPortalName } from '@/utils/countryUtils';
import type { PortalCredential } from '@/types/submission';

interface PortalAccountsCardProps {
  portalCredentials: PortalCredential[];
  isDeletingCredential: string | null;
  onDeleteCredential: (portalCode: string) => void;
  onDeleteAllCredentials: () => void;
}

export function PortalAccountsCard({
  portalCredentials,
  isDeletingCredential,
  onDeleteCredential,
  onDeleteAllCredentials,
}: PortalAccountsCardProps) {
  return (
    <Card testID="portal-accounts-card">
      <View className="flex-row items-center mb-4">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mr-3">Portal Accounts</Text>
        <StatusBadge
          status={portalCredentials.length > 0 ? 'success' : 'neutral'}
          size="small"
          text={portalCredentials.length > 0 ? `${portalCredentials.length} saved` : 'None saved'}
        />
      </View>

      <View className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4">
        <Text className="text-xs text-blue-800 dark:text-blue-200">
          🔒 Portal login credentials are stored securely on this device with biometric
          protection. Passwords are never displayed.
        </Text>
      </View>

      {portalCredentials.length === 0 ? (
        <View className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg items-center">
          <Text className="text-sm text-gray-500 dark:text-gray-400">No portal credentials saved yet.</Text>
          <Text className="text-xs text-gray-400 dark:text-gray-600 mt-1">
            Credentials are saved automatically when you log in to a portal.
          </Text>
        </View>
      ) : (
        <View className="space-y-2">
          {portalCredentials.map(cred => (
            <View
              key={cred.portalCode}
              testID={`portal-credential-row-${cred.portalCode}`}
              className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex-row items-center justify-between"
            >
              <View className="flex-1 mr-3">
                <Text className="text-sm font-medium text-gray-900 dark:text-white">
                  {getPortalName(cred.portalCode)}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cred.username}</Text>
              </View>
              {isDeletingCredential === cred.portalCode ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Button
                  title="Delete"
                  onPress={() => onDeleteCredential(cred.portalCode)}
                  variant="outline"
                  size="small"
                />
              )}
            </View>
          ))}

          <View className="mt-2">
            <Button
              title="Delete All Portal Credentials"
              onPress={onDeleteAllCredentials}
              variant="outline"
              fullWidth
            />
            <Text className="text-xs text-red-600 mt-1 text-center">
              ⚠️ Removes all saved portal logins
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}
