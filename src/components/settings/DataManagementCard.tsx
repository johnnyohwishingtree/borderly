import { View, Text } from 'react-native';
import { Button, Card, StatusBadge, Divider } from '@/components/ui';

interface StorageStats {
  profileSize: string;
  tripsCount: number;
  qrCodesCount: number;
  cacheSize: string;
}

interface DataManagementCardProps {
  storageStats: StorageStats | null;
  onExportData: () => void;
  onRestoreBackup: () => void;
  onClearCache: () => void;
  onDeleteAllData: () => void;
}

export function DataManagementCard({
  storageStats,
  onExportData,
  onRestoreBackup,
  onClearCache,
  onDeleteAllData,
}: DataManagementCardProps) {
  return (
    <Card>
      <View className="flex-row items-center mb-4">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mr-3">Data Management</Text>
        <StatusBadge
          status="warning"
          size="small"
          text="Handle with Care"
        />
      </View>

      {/* Storage Usage */}
      {storageStats && (
        <View className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
          <Text className="text-sm font-semibold text-gray-900 dark:text-white mb-3">📊 Storage Usage</Text>
          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-xs text-gray-600 dark:text-gray-400">Profile Data:</Text>
              <Text className="text-xs text-gray-900 dark:text-white">{storageStats.profileSize}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-gray-600 dark:text-gray-400">Trips:</Text>
              <Text className="text-xs text-gray-900 dark:text-white">{storageStats.tripsCount} saved</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-gray-600 dark:text-gray-400">QR Codes:</Text>
              <Text className="text-xs text-gray-900 dark:text-white">{storageStats.qrCodesCount} stored</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-gray-600 dark:text-gray-400">Cache:</Text>
              <Text className="text-xs text-gray-900 dark:text-white">{storageStats.cacheSize}</Text>
            </View>
          </View>
        </View>
      )}

      <View className="space-y-3">
        <View>
          <Button
            title="Export Data"
            onPress={onExportData}
            variant="outline"
            fullWidth
          />
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
            Save your data as a secure backup file
          </Text>
        </View>

        <View>
          <Button
            title="Restore from Backup"
            onPress={onRestoreBackup}
            variant="outline"
            fullWidth
            testID="restore-backup-button"
            accessibilityRole="button"
            accessibilityLabel="Restore from backup"
            accessibilityHint="Opens the backup restore flow to import a .borderly backup file"
          />
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
            Import a .borderly backup file to restore your data
          </Text>
        </View>

        <View>
          <Button
            title={`Clear Cache (${storageStats?.cacheSize})`}
            onPress={onClearCache}
            variant="outline"
            fullWidth
          />
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
            Free up space by clearing temporary files
          </Text>
        </View>

        <Divider className="my-2" />

        <View>
          <Button
            title="Delete All Data"
            onPress={onDeleteAllData}
            variant="outline"
            fullWidth
          />
          <Text className="text-xs text-red-600 mt-1 text-center">
            ⚠️ Permanently removes all app data - cannot be undone
          </Text>
        </View>
      </View>
    </Card>
  );
}
