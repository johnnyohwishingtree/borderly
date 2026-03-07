import { launchCamera, launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

export interface QRCaptureResult {
  success: boolean;
  imageUri?: string;
  base64?: string;
  error?: string;
}

export interface QRScanResult {
  success: boolean;
  data?: string;
  type?: string;
  error?: string;
}

/**
 * QR Capture Service
 * Handles camera integration for QR code capture and image import
 */
export class QRCaptureService {
  /**
   * Request camera permissions
   */
  static async requestCameraPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Borderly needs camera access to capture QR codes',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Error requesting camera permission:', err);
        return false;
      }
    }
    return true; // iOS handles permissions through Info.plist
  }

  /**
   * Capture QR code using camera
   */
  static async captureFromCamera(): Promise<QRCaptureResult> {
    try {
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) {
        return {
          success: false,
          error: 'Camera permission denied',
        };
      }

      return new Promise((resolve) => {
        launchCamera(
          {
            mediaType: 'photo' as MediaType,
            includeBase64: true,
            quality: 0.8,
            maxWidth: 2000,
            maxHeight: 2000,
          },
          (response: ImagePickerResponse) => {
            if (response.didCancel) {
              resolve({
                success: false,
                error: 'User cancelled camera',
              });
              return;
            }

            if (response.errorMessage) {
              resolve({
                success: false,
                error: response.errorMessage,
              });
              return;
            }

            const asset = response.assets?.[0];
            if (!asset) {
              resolve({
                success: false,
                error: 'No image captured',
              });
              return;
            }

            resolve({
              success: true,
              imageUri: asset.uri,
              base64: asset.base64,
            });
          }
        );
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Import QR code from photo library
   */
  static async importFromLibrary(): Promise<QRCaptureResult> {
    try {
      return new Promise((resolve) => {
        launchImageLibrary(
          {
            mediaType: 'photo' as MediaType,
            includeBase64: true,
            quality: 0.8,
            maxWidth: 2000,
            maxHeight: 2000,
            selectionLimit: 1,
          },
          (response: ImagePickerResponse) => {
            if (response.didCancel) {
              resolve({
                success: false,
                error: 'User cancelled image selection',
              });
              return;
            }

            if (response.errorMessage) {
              resolve({
                success: false,
                error: response.errorMessage,
              });
              return;
            }

            const asset = response.assets?.[0];
            if (!asset) {
              resolve({
                success: false,
                error: 'No image selected',
              });
              return;
            }

            resolve({
              success: true,
              imageUri: asset.uri,
              base64: asset.base64,
            });
          }
        );
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Show action sheet for QR capture options
   */
  static showQRCaptureOptions(): Promise<QRCaptureResult> {
    return new Promise((resolve) => {
      Alert.alert(
        'Add QR Code',
        'Choose how you want to add your QR code',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const result = await this.captureFromCamera();
              resolve(result);
            },
          },
          {
            text: 'Choose from Library',
            onPress: async () => {
              const result = await this.importFromLibrary();
              resolve(result);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve({ success: false, error: 'Cancelled' }),
          },
        ],
        { cancelable: true }
      );
    });
  }

  /**
   * Validate if an image contains a QR code
   * This is a basic implementation - can be enhanced with actual QR detection
   */
  static async validateQRCode(imageUri: string): Promise<boolean> {
    // For now, we'll assume the image is valid
    // In a production app, you'd use ML Kit or similar to detect QR codes
    return Promise.resolve(!!imageUri);
  }

  /**
   * Generate a sample QR code for testing
   */
  static generateTestQRCode(): string {
    // Generate a base64 encoded test QR code image
    // This is a minimal QR code placeholder
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}