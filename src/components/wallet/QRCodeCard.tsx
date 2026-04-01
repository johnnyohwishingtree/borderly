import { View, Text, Image, Pressable } from 'react-native';
import { Card } from '../ui';
import { SavedQRCode } from '../../services/storage/models';

interface QRCodeCardProps {
  qrCode: SavedQRCode;
  onPress?: (qrCode: SavedQRCode) => void;
  onLongPress?: (qrCode: SavedQRCode) => void;
  compact?: boolean;
  showTravelerInfo?: boolean; // Whether to show traveler information badge
  travelerName?: string; // Name of the traveler for this QR code
}

export function QRCodeCard({
  qrCode,
  onPress,
  onLongPress,
  compact = false,
  showTravelerInfo = false,
  travelerName
}: QRCodeCardProps) {
  const getTypeColor = (type: SavedQRCode['type']) => {
    switch (type) {
      case 'immigration':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'customs':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'health':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      case 'combined':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      default:
        return 'bg-surface-tertiary text-gray-800';
    }
  };

  const getTypeLabel = (type: SavedQRCode['type']) => {
    switch (type) {
      case 'immigration':
        return 'Immigration';
      case 'customs':
        return 'Customs';
      case 'health':
        return 'Health';
      case 'combined':
        return 'Combined';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (compact) {
    return (
      <Pressable
        onPress={() => onPress?.(qrCode)}
        onLongPress={() => onLongPress?.(qrCode)}
        className="active:opacity-70"
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={qrCode.label}
        accessibilityHint="Opens QR code full screen"
      >
        <View className="bg-surface rounded-lg p-3 border border-border-default mb-2">
          <View className="flex-row items-center gap-3">
            {/* QR Code Thumbnail */}
            <View className="w-12 h-12 bg-surface-tertiary rounded-lg overflow-hidden" accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
              {qrCode.imageBase64 ? (
                <Image
                  source={{ uri: `data:image/png;base64,${qrCode.imageBase64}` }}
                  className="w-full h-full"
                  resizeMode="cover"
                  accessible={false}
                />
              ) : (
                <View className="w-full h-full bg-gray-200 items-center justify-center">
                  <Text className="text-xs text-tertiary">QR</Text>
                </View>
              )}
            </View>

            {/* Content */}
            <View className="flex-1">
              <Text className="text-sm font-semibold text-primary" numberOfLines={1}>
                {qrCode.label}
              </Text>
              <Text className="text-xs text-tertiary">
                {formatDate(qrCode.savedAt)}
              </Text>
            </View>

            {/* Type Badge */}
            <View className={`px-2 py-1 rounded-full ${getTypeColor(qrCode.type)}`}>
              <Text className="text-xs font-medium">
                {getTypeLabel(qrCode.type)}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Card className="mb-4">
      <Pressable
        onPress={() => onPress?.(qrCode)}
        onLongPress={() => onLongPress?.(qrCode)}
        className="active:opacity-70"
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={qrCode.label}
        accessibilityHint="Tap to view full screen, long press for options"
      >
        <View className="p-4">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-primary" numberOfLines={1}>
                {qrCode.label}
              </Text>
              <View className="flex-row items-center mt-1">
                <Text className="text-sm text-tertiary">
                  Saved {formatDate(qrCode.savedAt)}
                </Text>
                {showTravelerInfo && travelerName && (
                  <>
                    <Text className="text-sm text-tertiary mx-2">•</Text>
                    <Text className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                      {travelerName}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Type Badge */}
            <View className={`px-3 py-1 rounded-full ${getTypeColor(qrCode.type)}`}>
              <Text className="text-sm font-medium">
                {getTypeLabel(qrCode.type)}
              </Text>
            </View>
          </View>

          {/* QR Code Preview */}
          <View className="items-center py-4" accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
            <View className="w-32 h-32 bg-surface-tertiary rounded-lg overflow-hidden">
              {qrCode.imageBase64 ? (
                <Image
                  source={{ uri: `data:image/png;base64,${qrCode.imageBase64}` }}
                  className="w-full h-full"
                  resizeMode="contain"
                  accessible={false}
                />
              ) : (
                <View className="w-full h-full bg-gray-200 items-center justify-center">
                  <Text className="text-sm text-tertiary">No Image</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Hint */}
          <View className="border-t border-border-default pt-3">
            <Text className="text-xs text-tertiary text-center">
              Tap to view full screen • Long press for options
            </Text>
          </View>
        </View>
      </Pressable>
    </Card>
  );
}
