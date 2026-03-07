import { View, Text, Image, Pressable } from 'react-native';
import { Card } from '../ui';
import { SavedQRCode } from '../../services/storage/models';

interface QRCodeCardProps {
  qrCode: SavedQRCode;
  onPress?: (qrCode: SavedQRCode) => void;
  onLongPress?: (qrCode: SavedQRCode) => void;
  compact?: boolean;
}

export function QRCodeCard({ 
  qrCode, 
  onPress, 
  onLongPress, 
  compact = false 
}: QRCodeCardProps) {
  const getTypeColor = (type: SavedQRCode['type']) => {
    switch (type) {
      case 'immigration':
        return 'bg-blue-100 text-blue-800';
      case 'customs':
        return 'bg-green-100 text-green-800';
      case 'health':
        return 'bg-red-100 text-red-800';
      case 'combined':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      >
        <View className="bg-white rounded-lg p-3 border border-gray-200 mb-2">
          <View className="flex-row items-center space-x-3">
            {/* QR Code Thumbnail */}
            <View className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
              {qrCode.imageBase64 ? (
                <Image
                  source={{ uri: `data:image/png;base64,${qrCode.imageBase64}` }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full bg-gray-200 items-center justify-center">
                  <Text className="text-xs text-gray-500">QR</Text>
                </View>
              )}
            </View>

            {/* Content */}
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                {qrCode.label}
              </Text>
              <Text className="text-xs text-gray-500">
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
      >
        <View className="p-4">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900" numberOfLines={1}>
                {qrCode.label}
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                Saved {formatDate(qrCode.savedAt)}
              </Text>
            </View>
            
            {/* Type Badge */}
            <View className={`px-3 py-1 rounded-full ${getTypeColor(qrCode.type)}`}>
              <Text className="text-sm font-medium">
                {getTypeLabel(qrCode.type)}
              </Text>
            </View>
          </View>

          {/* QR Code Preview */}
          <View className="items-center py-4">
            <View className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
              {qrCode.imageBase64 ? (
                <Image
                  source={{ uri: `data:image/png;base64,${qrCode.imageBase64}` }}
                  className="w-full h-full"
                  resizeMode="contain"
                />
              ) : (
                <View className="w-full h-full bg-gray-200 items-center justify-center">
                  <Text className="text-sm text-gray-500">No Image</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Hint */}
          <View className="border-t border-gray-100 pt-3">
            <Text className="text-xs text-gray-500 text-center">
              Tap to view full screen • Long press for options
            </Text>
          </View>
        </View>
      </Pressable>
    </Card>
  );
}