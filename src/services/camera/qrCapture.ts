import { launchCamera, launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { PermissionsAndroid, Platform } from 'react-native';

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
              imageUri: asset.uri || '',
              base64: asset.base64 || '',
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
              imageUri: asset.uri || '',
              base64: asset.base64 || '',
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
   * Validate if an image URI is properly formatted
   * This is a basic implementation - can be enhanced with actual QR detection
   */
  static async validateImageUri(imageUri: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      if (!imageUri || typeof imageUri !== 'string') {
        return { isValid: false, error: 'Invalid image URI' };
      }

      // Basic file extension and data URI validation
      const isDataUri = imageUri.startsWith('data:image/');
      const isFileUri = imageUri.startsWith('file://') || imageUri.startsWith('/');
      
      if (!isDataUri && !isFileUri) {
        return { isValid: false, error: 'Unsupported image format' };
      }

      // Check if it's a base64 data URI
      if (isDataUri) {
        const base64Part = imageUri.split(',')[1];
        if (!base64Part || base64Part.length < 100) {
          return { isValid: false, error: 'Image appears to be too small or corrupted' };
        }
      }

      // For now, we'll assume the image is valid if it passes basic checks
      // In a production app, you'd use ML Kit or similar to detect QR codes
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      };
    }
  }

  /**
   * Validate QR code image size and quality
   */
  static validateImageQuality(base64Image: string): { isValid: boolean; error?: string; warnings?: string[] } {
    try {
      if (!base64Image || typeof base64Image !== 'string') {
        return { isValid: false, error: 'No image data provided' };
      }

      const warnings: string[] = [];

      // Estimate image size from base64 length
      const imageSizeBytes = (base64Image.length * 3) / 4;
      const imageSizeMB = imageSizeBytes / (1024 * 1024);

      // Check if image is too large (> 10MB)
      if (imageSizeMB > 10) {
        return { isValid: false, error: 'Image is too large (max 10MB)' };
      }

      // Check if image might be too small
      if (imageSizeMB < 0.01) {
        warnings.push('Image might be too small for good QR code recognition');
      }

      // Check if image is very large (might be slow to process)
      if (imageSizeMB > 5) {
        warnings.push('Large image size may affect performance');
      }

      return {
        isValid: true,
        ...(warnings.length > 0 ? { warnings } : {}),
      };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Unknown quality check error' 
      };
    }
  }

  /**
   * Generate a sample QR code for testing
   */
  static generateTestQRCode(): string {
    // Generate a base64 encoded test QR code image
    // This is a minimal QR code placeholder - in production would be a real QR
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  /**
   * Create a test QR code for development
   */
  static createTestQRCode(type: 'immigration' | 'customs' | 'health' | 'combined' = 'combined'): {
    imageBase64: string;
    label: string;
    type: 'immigration' | 'customs' | 'health' | 'combined';
  } {
    const now = new Date();
    const labels = {
      immigration: `Immigration QR - ${now.toLocaleDateString()}`,
      customs: `Customs Declaration - ${now.toLocaleDateString()}`,
      health: `Health Check QR - ${now.toLocaleDateString()}`,
      combined: `Travel QR Code - ${now.toLocaleDateString()}`,
    };

    return {
      imageBase64: this.generateTestQRCode().split(',')[1] || '',
      label: labels[type],
      type,
    };
  }
}