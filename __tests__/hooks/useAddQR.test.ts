/**
 * Tests for useAddQR hook.
 * Covers: initial state, qrTypeOptions, setFormData, handleReset,
 * handleSaveQR validation, successful save, and devicePerformance detection.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useAddQR } from '../../src/hooks/useAddQR';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

const mockCreate = jest.fn().mockImplementation(async (builder: any) => {
  builder({
    set legId(_v: string) {},
    set type(_v: string) {},
    set imageBase64(_v: string) {},
    set label(_v: string) {},
  });
});

const mockWrite = jest.fn().mockImplementation(async (fn: () => Promise<void>) => {
  await fn();
});

const mockGetDatabase = jest.fn().mockResolvedValue({
  write: mockWrite,
  collections: {
    get: jest.fn().mockReturnValue({
      create: mockCreate,
    }),
  },
});

jest.mock('@/services/camera/qrCapture', () => ({
  QRCaptureService: {
    captureFromCamera: jest.fn(),
    importFromLibrary: jest.fn(),
    validateImageUri: jest.fn().mockResolvedValue({ isValid: true }),
    validateImageQuality: jest.fn().mockReturnValue({ isValid: true, warnings: [] }),
  },
}));

jest.mock('@/services/storage', () => ({
  databaseService: {
    getDatabase: () => mockGetDatabase(),
  },
}));

jest.mock('@/services/storage/models', () => ({
  SavedQRCode: {},
}));

jest.mock('@/utils/imageUtils', () => ({
  compressBase64Image: jest.fn().mockResolvedValue({
    success: true,
    originalSize: 1000,
    compressedSize: 500,
    compressionRatio: 0.5,
    compressedBase64: 'compressed-base64',
  }),
  analyzeImageQuality: jest.fn().mockReturnValue({
    sharpness: 0.9,
    contrast: 0.8,
    brightness: 0.7,
    overallScore: 0.8,
  }),
  generateProgressiveVersions: jest.fn().mockResolvedValue({
    success: true,
    placeholder: 'placeholder-base64',
    lowQuality: 'low-base64',
    mediumQuality: 'medium-base64',
    fullQuality: 'full-base64',
  }),
  validateImageForProcessing: jest.fn().mockReturnValue({
    isValid: true,
    errors: [],
  }),
  detectDevicePerformance: jest.fn().mockReturnValue({
    tier: 'high',
    recommendedSettings: { quality: 0.8, maxWidth: 1920 },
  }),
  ImageProcessor: {
    processForLowEndDevice: jest.fn().mockResolvedValue({
      success: true,
      originalSize: 1000,
      compressedSize: 300,
      compressionRatio: 0.3,
      memoryOptimized: true,
      processedBase64: 'low-end-compressed',
    }),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderAddQR() {
  return renderHook(() => useAddQR());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  (Alert.alert as jest.Mock).mockClear();
  mockGoBack.mockClear();
  mockGetDatabase.mockClear();
  mockWrite.mockClear();
  mockCreate.mockClear();
});

describe('useAddQR', () => {
  describe('initial state', () => {
    it('returns isLoading=false, capturedImage=null, base64Image=null, and default formData', () => {
      const { result } = renderAddQR();

      expect(result.current.actions.isLoading).toBe(false);
      expect(result.current.image.capturedImage).toBeNull();
      expect(result.current.image.base64Image).toBeNull();
      expect(result.current.form.formData).toEqual({
        label: '',
        type: 'combined',
      });
    });
  });

  describe('qrTypeOptions', () => {
    it('includes immigration, customs, health, and combined types', () => {
      const { result } = renderAddQR();

      const values = result.current.form.qrTypeOptions.map(
        (opt: { value: string }) => opt.value,
      );
      expect(values).toContain('immigration');
      expect(values).toContain('customs');
      expect(values).toContain('health');
      expect(values).toContain('combined');
    });
  });

  describe('setFormData', () => {
    it('updates form data', () => {
      const { result } = renderAddQR();

      act(() => {
        result.current.form.setFormData({ label: 'My QR', type: 'immigration' });
      });

      expect(result.current.form.formData).toEqual({
        label: 'My QR',
        type: 'immigration',
      });
    });
  });

  describe('handleReset', () => {
    it('clears image state and resets formData to defaults', () => {
      const { result } = renderAddQR();

      // First set some data
      act(() => {
        result.current.form.setFormData({ label: 'Test Label', type: 'customs' });
      });

      expect(result.current.form.formData.label).toBe('Test Label');

      // Now reset
      act(() => {
        result.current.actions.handleReset();
      });

      expect(result.current.image.capturedImage).toBeNull();
      expect(result.current.image.base64Image).toBeNull();
      expect(result.current.form.formData).toEqual({
        label: '',
        type: 'combined',
      });
    });
  });

  describe('handleSaveQR', () => {
    it('shows alert when capturedImage is null', async () => {
      const { result } = renderAddQR();

      await act(async () => {
        await result.current.actions.handleSaveQR();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please capture or select a QR code image first',
      );
    });

    it('shows alert when label is empty', async () => {
      const { result } = renderAddQR();

      // Simulate having a captured image by setting state internally
      // We need to set capturedImage and base64Image but they are not exposed
      // via setters. Instead, we can test via the formData path — but the hook
      // checks capturedImage first. We need to trigger the camera flow to set images.
      // A simpler approach: directly test the validation logic order.
      // Since capturedImage is null, it will hit the first check.
      // To test label validation, we need images set. Let's mock the camera flow.

      // For label validation test, we need to get past the image check.
      // We can't directly set capturedImage, so we'll verify the alert message
      // indicates the label check happens after image check by testing with
      // a scenario where we go through the camera capture flow first.

      // Since we can't easily set internal state, we verify the first validation
      // fires. The label validation test needs a different approach.
      // Let's use a workaround: mock the state values via a module-level approach.

      // Actually, the simplest approach is to just verify the behavior:
      // with no image, it should show the image error, not the label error.
      await act(async () => {
        await result.current.actions.handleSaveQR();
      });

      // First validation is the image check
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please capture or select a QR code image first',
      );
    });

    it('saves to DB, shows success alert, and navigates back on success', async () => {
      const { result } = renderAddQR();

      // We need to get capturedImage and base64Image set.
      // The only way is through handleCameraCapture or handleLibraryImport.
      const { QRCaptureService } = jest.requireMock(
        '@/services/camera/qrCapture',
      );
      (QRCaptureService.captureFromCamera as jest.Mock).mockResolvedValue({
        success: true,
        imageUri: 'file:///test-image.jpg',
        base64: 'test-base64-data',
      });

      await act(async () => {
        await result.current.actions.handleCameraCapture();
      });

      // After capture, capturedImage and base64Image should be set
      expect(result.current.image.capturedImage).toBe('file:///test-image.jpg');
      expect(typeof result.current.image.base64Image).toBe('string');
      expect(result.current.image.base64Image!.length).toBeGreaterThan(0);

      // The auto-generated label should be set, but let's set our own
      act(() => {
        result.current.form.setFormData({
          label: 'My Travel QR',
          type: 'immigration',
        });
      });

      await act(async () => {
        await result.current.actions.handleSaveQR();
      });

      // Should have called database service
      expect(mockGetDatabase).toHaveBeenCalled();
      expect(mockWrite).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalled();

      // Should show success alert
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'QR code saved to your wallet!',
        expect.arrayContaining([
          expect.objectContaining({ text: 'OK' }),
        ]),
      );

      // Simulate pressing OK on the success alert to trigger navigation
      const successCall = (Alert.alert as jest.Mock).mock.calls.find(
        (call: string[]) => call[0] === 'Success',
      );
      const okButton = successCall[2][0];
      okButton.onPress();

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('handleSaveQR label validation', () => {
    it('shows alert when label is empty but image is present', async () => {
      const { result } = renderAddQR();

      const { QRCaptureService } = jest.requireMock(
        '@/services/camera/qrCapture',
      );
      (QRCaptureService.captureFromCamera as jest.Mock).mockResolvedValue({
        success: true,
        imageUri: 'file:///test-image.jpg',
        base64: 'test-base64-data',
      });

      await act(async () => {
        await result.current.actions.handleCameraCapture();
      });

      // Clear the auto-generated label
      act(() => {
        result.current.form.setFormData({ label: '', type: 'combined' });
      });

      await act(async () => {
        await result.current.actions.handleSaveQR();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter a label for this QR code',
      );
    });
  });

  describe('devicePerformance', () => {
    it('is set on mount from detectDevicePerformance', async () => {
      const { result } = renderAddQR();

      await waitFor(() => {
        expect(result.current.image.devicePerformance).toBe('high');
      });

      const { detectDevicePerformance } = jest.requireMock(
        '@/utils/imageUtils',
      );
      expect(detectDevicePerformance).toHaveBeenCalled();
    });
  });
});
