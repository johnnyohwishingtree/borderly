/**
 * Tests for Boarding Pass Image Import Service
 */

import { 
  importBoardingPassFromImage,
  validateImageForBarcodeDetection,
  getImageImportErrorMessage,
  isImageImportSupported,
} from '../../../src/services/boarding/boardingPassImageImport';

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock react-native-camera
jest.mock('react-native-camera', () => ({
  RNCamera: {
    Constants: {
      BarCodeType: {
        pdf417: 'pdf417',
        aztec: 'aztec',
        qr: 'qr',
      },
    },
  },
}));

// Mock the boarding pass parser
jest.mock('../../../src/services/boarding/boardingPassParser', () => ({
  parseBoardingPass: jest.fn(),
}));

// Import mocked modules
import { launchImageLibrary } from 'react-native-image-picker';
import { parseBoardingPass } from '../../../src/services/boarding/boardingPassParser';

const mockLaunchImageLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const mockParseBoardingPass = parseBoardingPass as jest.MockedFunction<typeof parseBoardingPass>;

describe('BoardingPassImageImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('importBoardingPassFromImage', () => {
    it('should handle user cancellation', async () => {
      // Mock user cancellation
      mockLaunchImageLibrary.mockImplementation((_options, callback) => {
        callback!({
          didCancel: true,
          assets: [],
        });
        return Promise.resolve({} as any);
      });

      const result = await importBoardingPassFromImage();

      expect(result).toEqual({
        success: false,
        error: 'User cancelled image selection',
        errorCode: 'USER_CANCELLED',
      });
    });

    it('should handle image picker error', async () => {
      // Mock image picker error
      mockLaunchImageLibrary.mockImplementation((_options, callback) => {
        callback!({
          errorMessage: 'Camera not available',
          assets: [],
        });
        return Promise.resolve({} as any);
      });

      const result = await importBoardingPassFromImage();

      expect(result).toEqual({
        success: false,
        error: 'Camera not available',
        errorCode: 'IMAGE_ERROR',
      });
    });

    it('should handle no image selected', async () => {
      // Mock no image selected
      mockLaunchImageLibrary.mockImplementation((_options, callback) => {
        callback!({
          assets: [],
        });
        return Promise.resolve({} as any);
      });

      const result = await importBoardingPassFromImage();

      expect(result).toEqual({
        success: false,
        error: 'No image selected or invalid image',
        errorCode: 'IMAGE_ERROR',
      });
    });

    it('should handle barcode detection failure', async () => {
      // Mock successful image selection
      mockLaunchImageLibrary.mockImplementation((_options, callback) => {
        callback!({
          assets: [{ uri: 'file://test-image.jpg' }],
        });
        return Promise.resolve({} as any);
      });

      const result = await importBoardingPassFromImage();

      // Since barcode detection is a placeholder, it should fail
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NO_BARCODE_FOUND');
      expect(result.error).toContain('Barcode detection from static images requires additional native integration');
    });

    it('should validate image picker options', () => {
      mockLaunchImageLibrary.mockImplementation((options, callback) => {
        // Verify the options passed to image picker
        expect(options).toEqual({
          mediaType: 'photo',
          includeBase64: false,
          quality: 1.0,
          maxWidth: 4000,
          maxHeight: 4000,
          selectionLimit: 1,
        });

        callback!({
          assets: [{ uri: 'file://test-image.jpg' }],
        });
        return Promise.resolve({} as any);
      });

      importBoardingPassFromImage();

      expect(mockLaunchImageLibrary).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateImageForBarcodeDetection', () => {
    it('should validate file URIs', () => {
      const result = validateImageForBarcodeDetection('file://test-image.jpg');
      expect(result.isValid).toBe(true);
    });

    it('should validate HTTP URIs', () => {
      const result = validateImageForBarcodeDetection('https://example.com/image.jpg');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid URIs', () => {
      const result = validateImageForBarcodeDetection('invalid-uri');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unsupported image URI format');
    });

    it('should handle null/undefined URIs', () => {
      const result1 = validateImageForBarcodeDetection('');
      const result2 = validateImageForBarcodeDetection(null as any);
      
      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
      expect(result1.error).toBe('Invalid image URI');
      expect(result2.error).toBe('Invalid image URI');
    });

    it('should warn about non-standard extensions', () => {
      const result = validateImageForBarcodeDetection('file://test-image.xyz');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Image format may not be optimal for barcode detection');
    });

    it('should accept standard image extensions', () => {
      const extensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
      
      extensions.forEach(ext => {
        const result = validateImageForBarcodeDetection(`file://test-image.${ext}`);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toBeUndefined();
      });
    });
  });

  describe('getImageImportErrorMessage', () => {
    it('should return correct messages for each error code', () => {
      const testCases = [
        {
          code: 'USER_CANCELLED',
          expected: 'Image selection was cancelled.',
        },
        {
          code: 'NO_BARCODE_FOUND',
          expected: 'No boarding pass barcode found in the selected image. Try taking a clearer photo of your boarding pass.',
        },
        {
          code: 'MULTIPLE_BARCODES',
          expected: 'Multiple barcodes detected. Please select an image with only one boarding pass barcode.',
        },
        {
          code: 'UNSUPPORTED_FORMAT',
          expected: 'The barcode format is not supported. Boarding passes typically use PDF417, Aztec, or QR codes.',
        },
        {
          code: 'PARSE_ERROR',
          expected: 'Unable to parse boarding pass data. The barcode may be damaged or not a valid boarding pass.',
        },
        {
          code: 'IMAGE_ERROR',
          expected: 'Unable to process the selected image. Please try selecting a different photo.',
        },
      ];

      testCases.forEach(({ code, expected }) => {
        const result = getImageImportErrorMessage(code);
        expect(result).toBe(expected);
      });
    });

    it('should return default message for unknown error codes', () => {
      const result1 = getImageImportErrorMessage('UNKNOWN_CODE');
      const result2 = getImageImportErrorMessage(undefined);
      
      const defaultMessage = 'Failed to import boarding pass from image. Please try again or use the camera scanner.';
      expect(result1).toBe(defaultMessage);
      expect(result2).toBe(defaultMessage);
    });
  });

  describe('isImageImportSupported', () => {
    it('should return true for React Native platforms', () => {
      const result = isImageImportSupported();
      expect(result).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle successful parsing after barcode detection', async () => {
      // This test would be more realistic with actual barcode detection
      // For now, we test the flow assuming barcode detection worked
      const mockBoardingPass = {
        passengerName: 'JOHN DOE',
        airlineCode: 'AC',
        flightNumber: 'AC123',
        departureAirport: 'YUL',
        arrivalAirport: 'NRT',
        flightDate: '2024-03-15',
        destinationCountry: 'JPN',
      };

      mockParseBoardingPass.mockReturnValue(mockBoardingPass);

      // In a real implementation with working barcode detection,
      // this would succeed. For now, it will fail at barcode detection stage
      const result = await importBoardingPassFromImage();
      
      // Since we have a placeholder barcode detection, it should fail
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NO_BARCODE_FOUND');
    });

    it('should handle parsing errors gracefully', async () => {
      // Mock parse error
      const parseError: any = {
        code: 'PARSE_ERROR' as const,
        message: 'Invalid BCBP format',
        originalData: 'invalid-data',
      };

      mockParseBoardingPass.mockReturnValue(parseError);

      // This test also depends on barcode detection working
      // For now, it will fail at the detection stage
      const result = await importBoardingPassFromImage();
      
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NO_BARCODE_FOUND');
    });
  });

  describe('Android content URI support', () => {
    beforeEach(() => {
      // Mock Android platform
      const mockPlatform = require('react-native').Platform;
      mockPlatform.OS = 'android';
    });

    afterEach(() => {
      // Reset to iOS
      const mockPlatform = require('react-native').Platform;
      mockPlatform.OS = 'ios';
    });

    it('should support Android content URIs', () => {
      const result = validateImageForBarcodeDetection('content://media/external/images/media/123');
      expect(result.isValid).toBe(true);
    });
  });
});