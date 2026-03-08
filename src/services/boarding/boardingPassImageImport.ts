/**
 * Boarding Pass Image Import Service
 * 
 * Handles importing and processing boarding pass barcodes from static images
 * (photos from gallery, screenshots, etc.) using image picker and barcode detection.
 */

import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { Platform } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { parseBoardingPass } from './boardingPassParser';
import type { ParsedBoardingPass, BCBPParseError } from '../../types/boarding';

export interface ImageImportResult {
  success: boolean;
  boardingPass?: ParsedBoardingPass;
  error?: string;
  errorCode?: 'USER_CANCELLED' | 'NO_BARCODE_FOUND' | 'MULTIPLE_BARCODES' | 'UNSUPPORTED_FORMAT' | 'PARSE_ERROR' | 'IMAGE_ERROR';
}

export interface BarcodeDetectionResult {
  success: boolean;
  barcodeData?: string;
  barcodeType?: string;
  error?: string;
  multipleFound?: boolean;
}

/**
 * Import boarding pass from image gallery/photos
 */
export async function importBoardingPassFromImage(): Promise<ImageImportResult> {
  try {
    // Launch image picker to select photo from gallery
    const imageResult = await selectImageFromLibrary();
    
    if (!imageResult.success) {
      return {
        success: false,
        error: imageResult.error || 'Failed to select image',
        errorCode: imageResult.cancelled ? 'USER_CANCELLED' : 'IMAGE_ERROR',
      };
    }

    if (!imageResult.imageUri) {
      return {
        success: false,
        error: 'No image selected',
        errorCode: 'IMAGE_ERROR',
      };
    }

    // Detect barcode in the selected image
    const barcodeResult = await detectBarcodeInImage(imageResult.imageUri);
    
    if (!barcodeResult.success) {
      return {
        success: false,
        error: barcodeResult.error || 'Failed to detect barcode',
        errorCode: barcodeResult.multipleFound ? 'MULTIPLE_BARCODES' : 'NO_BARCODE_FOUND',
      };
    }

    if (!barcodeResult.barcodeData) {
      return {
        success: false,
        error: 'No barcode data found in image',
        errorCode: 'NO_BARCODE_FOUND',
      };
    }

    // Check if barcode type is supported
    const supportedTypes = ['pdf417', 'aztec', 'qr'];
    if (barcodeResult.barcodeType && !supportedTypes.includes(barcodeResult.barcodeType.toLowerCase())) {
      return {
        success: false,
        error: `Unsupported barcode format: ${barcodeResult.barcodeType}. Supported formats: PDF417, Aztec, QR Code`,
        errorCode: 'UNSUPPORTED_FORMAT',
      };
    }

    // Parse the boarding pass data
    const parseResult = parseBoardingPass(barcodeResult.barcodeData);
    
    if ('code' in parseResult) {
      const error = parseResult as BCBPParseError;
      return {
        success: false,
        error: error.message,
        errorCode: 'PARSE_ERROR',
      };
    }

    return {
      success: true,
      boardingPass: parseResult as ParsedBoardingPass,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'IMAGE_ERROR',
    };
  }
}

/**
 * Select image from device photo library
 */
async function selectImageFromLibrary(): Promise<{ 
  success: boolean; 
  imageUri?: string; 
  error?: string; 
  cancelled?: boolean; 
}> {
  return new Promise((resolve) => {
    launchImageLibrary(
      {
        mediaType: 'photo' as MediaType,
        includeBase64: false, // We don't need base64 for barcode detection
        quality: 1.0, // Use highest quality for better barcode recognition
        maxWidth: 4000, // Higher resolution for better barcode detection
        maxHeight: 4000,
        selectionLimit: 1,
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel) {
          resolve({
            success: false,
            error: 'User cancelled image selection',
            cancelled: true,
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
        if (!asset || !asset.uri) {
          resolve({
            success: false,
            error: 'No image selected or invalid image',
          });
          return;
        }

        resolve({
          success: true,
          imageUri: asset.uri,
        });
      }
    );
  });
}

/**
 * Detect barcode in static image using ML Kit
 * This is a simplified implementation - in production you'd use
 * react-native-camera's barcode detection on static images or
 * a dedicated ML Kit image processing library
 */
async function detectBarcodeInImage(imageUri: string): Promise<BarcodeDetectionResult> {
  try {
    // Note: This is a placeholder implementation
    // In a real app, you would use ML Kit's static image barcode detection
    // or integrate with react-native-camera's image processing capabilities
    
    // For now, we'll simulate the detection process
    // In production, this would be replaced with actual ML Kit integration
    return new Promise((resolve) => {
      // Simulate processing delay
      setTimeout(() => {
        // This is where you'd integrate with ML Kit or similar
        // For demo purposes, we'll return a simulated failure that guides users to use the camera
        resolve({
          success: false,
          error: 'Barcode detection from static images requires additional native integration. Please use the camera scanner instead.',
        });
      }, 500);
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Barcode detection failed',
    };
  }
}

/**
 * Validate image for boarding pass barcode detection
 */
export function validateImageForBarcodeDetection(imageUri: string): { 
  isValid: boolean; 
  error?: string; 
  warnings?: string[]; 
} {
  try {
    if (!imageUri || typeof imageUri !== 'string') {
      return { isValid: false, error: 'Invalid image URI' };
    }

    const warnings: string[] = [];

    // Basic file extension and data URI validation
    const isFileUri = imageUri.startsWith('file://') || imageUri.startsWith('/');
    const isHttpUri = imageUri.startsWith('http://') || imageUri.startsWith('https://');
    const isContentUri = Platform.OS === 'android' && imageUri.startsWith('content://');
    
    if (!isFileUri && !isHttpUri && !isContentUri) {
      return { isValid: false, error: 'Unsupported image URI format' };
    }

    // Check file extension if it's a file URI
    if (isFileUri || isHttpUri) {
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
      const hasValidExtension = validExtensions.some(ext => 
        imageUri.toLowerCase().includes(ext)
      );
      
      if (!hasValidExtension) {
        warnings.push('Image format may not be optimal for barcode detection');
      }
    }

    return {
      isValid: true,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Unknown validation error' 
    };
  }
}

/**
 * Get user-friendly error message based on error code
 */
export function getImageImportErrorMessage(errorCode?: string): string {
  switch (errorCode) {
    case 'USER_CANCELLED':
      return 'Image selection was cancelled.';
    case 'NO_BARCODE_FOUND':
      return 'No boarding pass barcode found in the selected image. Try taking a clearer photo of your boarding pass.';
    case 'MULTIPLE_BARCODES':
      return 'Multiple barcodes detected. Please select an image with only one boarding pass barcode.';
    case 'UNSUPPORTED_FORMAT':
      return 'The barcode format is not supported. Boarding passes typically use PDF417, Aztec, or QR codes.';
    case 'PARSE_ERROR':
      return 'Unable to parse boarding pass data. The barcode may be damaged or not a valid boarding pass.';
    case 'IMAGE_ERROR':
      return 'Unable to process the selected image. Please try selecting a different photo.';
    default:
      return 'Failed to import boarding pass from image. Please try again or use the camera scanner.';
  }
}

/**
 * Check if image import is supported on the current platform
 */
export function isImageImportSupported(): boolean {
  // Image import is supported on all React Native platforms
  // but barcode detection may require additional native modules
  return true;
}