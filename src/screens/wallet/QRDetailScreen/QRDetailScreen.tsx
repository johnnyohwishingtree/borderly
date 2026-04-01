import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Card, Button, LoadingSpinner, ScreenContainer } from '@/components/ui';
import { QRFullScreen } from '@/components/wallet';
import { useQRDetail } from '@/hooks/useQRDetail';

type QRDetailRouteParams = {
  QRDetail: {
    qrCodeId: string;
  };
};

export default function QRDetailScreen() {
  const route = useRoute<RouteProp<QRDetailRouteParams, 'QRDetail'>>();
  const navigation = useNavigation();
  const { qrCodeId } = route.params;

  const {
    qrCode,
    isLoading,
    fullScreenVisible,
    handleViewFullScreen,
    handleCloseFullScreen,
    handleShare,
    handleDelete,
    getTypeColor,
    getTypeLabel,
    formatDate,
  } = useQRDetail({
    qrCodeId,
    onLoadError: () => navigation.goBack(),
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-surface-secondary items-center justify-center">
        <LoadingSpinner />
        <Text className="text-secondary mt-4">Loading QR code...</Text>
      </View>
    );
  }

  if (!qrCode) {
    return (
      <View className="flex-1 bg-surface-secondary items-center justify-center px-4">
        <Text className="text-xl font-semibold text-primary mb-2">
          QR Code Not Found
        </Text>
        <Text className="text-secondary text-center mb-6">
          The requested QR code could not be found.
        </Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="secondary"
        />
      </View>
    );
  }

  return (
    <ScreenContainer className="bg-surface-secondary">
      {/* Header */}
      <View className="bg-surface px-4 py-6 border-b border-border-default">
        <Text className="text-2xl font-bold text-primary" numberOfLines={1}>
          {qrCode.label}
        </Text>
        <View className={`inline-flex px-3 py-1 rounded-full border mt-2 ${getTypeColor(qrCode.type)}`}>
          <Text className="text-sm font-medium">
            {getTypeLabel(qrCode.type)}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="py-4 space-y-4">
          {/* QR Code Display */}
          <Card>
            <View className="p-6">
              <Text className="text-lg font-semibold text-primary mb-4 text-center">
                QR Code
              </Text>

              <TouchableOpacity
                onPress={handleViewFullScreen}
                className="items-center mb-4 active:opacity-70"
              >
                <View className="w-64 h-64 bg-surface-tertiary rounded-lg overflow-hidden border border-border-default">
                  {qrCode.imageBase64 ? (
                    <Image
                      source={{ uri: `data:image/png;base64,${qrCode.imageBase64}` }}
                      className="w-full h-full"
                      resizeMode="contain"
                    />
                  ) : (
                    <View className="w-full h-full bg-gray-200 items-center justify-center">
                      <Text className="text-tertiary text-lg">No Image</Text>
                    </View>
                  )}
                </View>

                <Text className="text-sm text-accent mt-3">
                  Tap for full screen view
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Details */}
          <Card>
            <View className="p-4">
              <Text className="text-lg font-semibold text-primary mb-4">
                Details
              </Text>

              <View className="space-y-3">
                <View className="flex-row justify-between">
                  <Text className="text-secondary">Type:</Text>
                  <Text className="text-primary font-medium">
                    {getTypeLabel(qrCode.type)}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-secondary">Saved:</Text>
                  <Text className="text-primary font-medium">
                    {formatDate(qrCode.savedAt)}
                  </Text>
                </View>

                {qrCode.legId && (
                  <View className="flex-row justify-between">
                    <Text className="text-secondary">Trip Leg:</Text>
                    <Text className="text-primary font-medium">
                      Associated
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Card>

          {/* Actions */}
          <Card>
            <View className="p-4 space-y-3">
              <Text className="text-lg font-semibold text-primary mb-2">
                Actions
              </Text>

              <Button
                title="Share QR Code"
                onPress={handleShare}
                variant="secondary"
              />

              <Button
                title="Delete QR Code"
                onPress={() => handleDelete(() => navigation.goBack())}
                variant="secondary"
              />
            </View>
          </Card>

          {/* Usage Instructions */}
          <Card>
            <View className="p-4">
              <Text className="text-lg font-semibold text-primary mb-3">
                How to Use
              </Text>

              <View className="space-y-3">
                <View className="flex-row items-start gap-3">
                  <Text className="text-accent font-bold">1.</Text>
                  <Text className="text-sm text-secondary flex-1">
                    Show this QR code to immigration or customs officers at the airport
                  </Text>
                </View>

                <View className="flex-row items-start gap-3">
                  <Text className="text-accent font-bold">2.</Text>
                  <Text className="text-sm text-secondary flex-1">
                    Use full-screen view for better scanning
                  </Text>
                </View>

                <View className="flex-row items-start gap-3">
                  <Text className="text-accent font-bold">3.</Text>
                  <Text className="text-sm text-secondary flex-1">
                    Keep your phone charged and ensure screen brightness is at maximum
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Bottom spacing */}
        <View className="h-20" />
      </ScrollView>

      {/* Full Screen QR Display */}
      <QRFullScreen
        qrCode={qrCode}
        visible={fullScreenVisible}
        onClose={handleCloseFullScreen}
        onDelete={() => handleDelete(() => navigation.goBack())}
      />
    </ScreenContainer>
  );
}
