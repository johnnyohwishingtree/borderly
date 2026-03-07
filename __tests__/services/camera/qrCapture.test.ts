import { QRCaptureService } from '../../../src/services/camera/qrCapture';

// Mock react-native modules
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  PermissionsAndroid: {
    request: jest.fn(),
    RESULTS: { GRANTED: 'granted' },
    PERMISSIONS: { CAMERA: 'android.permission.CAMERA' },
  },
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const mockLaunchCamera = launchCamera as jest.MockedFunction<typeof launchCamera>;
const mockLaunchImageLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;

describe('QRCaptureService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateImageUri', () => {
    it('should validate a valid data URI', async () => {
      const validDataUri = 'data:image/png;base64,' + 'A'.repeat(200); // Longer base64 to pass validation
      
      const result = await QRCaptureService.validateImageUri(validDataUri);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate a valid file URI', async () => {
      const validFileUri = 'file:///path/to/image.png';
      
      const result = await QRCaptureService.validateImageUri(validFileUri);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid URI format', async () => {
      const invalidUri = 'http://example.com/image.png';
      
      const result = await QRCaptureService.validateImageUri(invalidUri);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unsupported image format');
    });

    it('should reject empty or null URI', async () => {
      const result1 = await QRCaptureService.validateImageUri('');
      const result2 = await QRCaptureService.validateImageUri(null as any);
      
      expect(result1.isValid).toBe(false);
      expect(result1.error).toBe('Invalid image URI');
      expect(result2.isValid).toBe(false);
      expect(result2.error).toBe('Invalid image URI');
    });

    it('should reject data URI with insufficient base64 data', async () => {
      const shortDataUri = 'data:image/png;base64,ABC';
      
      const result = await QRCaptureService.validateImageUri(shortDataUri);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Image appears to be too small or corrupted');
    });
  });

  describe('validateImageQuality', () => {
    it('should validate normal sized base64 image', () => {
      // Create a base64 string representing ~100KB image
      const normalBase64 = 'A'.repeat(136533); // ~100KB when decoded
      
      const result = QRCaptureService.validateImageQuality(normalBase64);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeUndefined();
    });

    it('should reject empty base64', () => {
      const result = QRCaptureService.validateImageQuality('');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('No image data provided');
    });

    it('should reject very large images', () => {
      // Create a base64 string representing >10MB image
      const largeBase64 = 'A'.repeat(14000000); // ~10.5MB when decoded
      
      const result = QRCaptureService.validateImageQuality(largeBase64);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Image is too large (max 10MB)');
    });

    it('should warn about very small images', () => {
      const tinyBase64 = 'ABCD'; // Very small image
      
      const result = QRCaptureService.validateImageQuality(tinyBase64);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Image might be too small for good QR code recognition');
    });

    it('should warn about large images', () => {
      // Create a base64 string representing ~7MB image
      const largeBase64 = 'A'.repeat(9300000); // ~7MB when decoded
      
      const result = QRCaptureService.validateImageQuality(largeBase64);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Large image size may affect performance');
    });
  });

  describe('captureFromCamera', () => {
    it('should successfully capture image from camera', async () => {
      const mockImageData = {
        assets: [
          {
            uri: 'file:///path/to/image.jpg',
            base64: 'mockBase64Data',
          },
        ],
      };

      (mockLaunchCamera.mockImplementation as any)((_options: any, callback: any) => {
        callback(mockImageData as any);
      });

      const result = await QRCaptureService.captureFromCamera();

      expect(result.success).toBe(true);
      expect(result.imageUri).toBe('file:///path/to/image.jpg');
      expect(result.base64).toBe('mockBase64Data');
    });

    it('should handle user cancellation', async () => {
      (mockLaunchCamera.mockImplementation as any)((_options: any, callback: any) => {
        callback({ didCancel: true } as any);
      });

      const result = await QRCaptureService.captureFromCamera();

      expect(result.success).toBe(false);
      expect(result.error).toBe('User cancelled camera');
    });

    it('should handle camera errors', async () => {
      (mockLaunchCamera.mockImplementation as any)((_options: any, callback: any) => {
        callback({ errorMessage: 'Camera not available' } as any);
      });

      const result = await QRCaptureService.captureFromCamera();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Camera not available');
    });

    it('should handle missing assets', async () => {
      (mockLaunchCamera.mockImplementation as any)((_options: any, callback: any) => {
        callback({ assets: [] } as any);
      });

      const result = await QRCaptureService.captureFromCamera();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No image captured');
    });
  });

  describe('importFromLibrary', () => {
    it('should successfully import image from library', async () => {
      const mockImageData = {
        assets: [
          {
            uri: 'file:///path/to/imported.jpg',
            base64: 'importedBase64Data',
          },
        ],
      };

      (mockLaunchImageLibrary.mockImplementation as any)((_options: any, callback: any) => {
        callback(mockImageData as any);
      });

      const result = await QRCaptureService.importFromLibrary();

      expect(result.success).toBe(true);
      expect(result.imageUri).toBe('file:///path/to/imported.jpg');
      expect(result.base64).toBe('importedBase64Data');
    });

    it('should handle user cancellation', async () => {
      (mockLaunchImageLibrary.mockImplementation as any)((_options: any, callback: any) => {
        callback({ didCancel: true } as any);
      });

      const result = await QRCaptureService.importFromLibrary();

      expect(result.success).toBe(false);
      expect(result.error).toBe('User cancelled image selection');
    });

    it('should handle import errors', async () => {
      (mockLaunchImageLibrary.mockImplementation as any)((_options: any, callback: any) => {
        callback({ errorMessage: 'Library not available' } as any);
      });

      const result = await QRCaptureService.importFromLibrary();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Library not available');
    });
  });

  describe('createTestQRCode', () => {
    it('should create test QR code with default type', () => {
      const testQR = QRCaptureService.createTestQRCode();
      
      expect(testQR.type).toBe('combined');
      expect(testQR.label).toContain('Travel QR Code');
      expect(testQR.imageBase64).toBeDefined();
      expect(testQR.imageBase64.length).toBeGreaterThan(0);
    });

    it('should create test QR code with specific type', () => {
      const testQR = QRCaptureService.createTestQRCode('immigration');
      
      expect(testQR.type).toBe('immigration');
      expect(testQR.label).toContain('Immigration QR');
      expect(testQR.imageBase64).toBeDefined();
    });

    it('should create different labels for different types', () => {
      const immigrationQR = QRCaptureService.createTestQRCode('immigration');
      const customsQR = QRCaptureService.createTestQRCode('customs');
      const healthQR = QRCaptureService.createTestQRCode('health');
      const combinedQR = QRCaptureService.createTestQRCode('combined');
      
      expect(immigrationQR.label).toContain('Immigration');
      expect(customsQR.label).toContain('Customs');
      expect(healthQR.label).toContain('Health');
      expect(combinedQR.label).toContain('Travel');
      
      expect(immigrationQR.label).not.toBe(customsQR.label);
    });
  });
});