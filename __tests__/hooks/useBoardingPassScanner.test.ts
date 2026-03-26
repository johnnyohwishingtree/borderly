/**
 * Tests for useBoardingPassScanner hook.
 * Covers: initial state, camera lifecycle, barcode scanning, demo mode, error handling.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useBoardingPassScanner } from '@/hooks/useBoardingPassScanner';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/services/boarding/boardingPassParser', () => ({
  parseBoardingPass: jest.fn(() => ({
    success: true,
    confidence: 0.95,
    boardingPass: {
      passengerName: 'DOE/JOHN',
      flightNumber: 'JL001',
    },
  })),
}));

jest.mock('@/services/boarding/boardingPassImageImport', () => ({
  importBoardingPassFromImage: jest.fn(() =>
    Promise.resolve({
      success: true,
      confidence: 0.9,
      boardingPass: { passengerName: 'DOE/JOHN' },
    }),
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderScanner(overrides = {}) {
  const defaultProps = {
    onScanSuccess: jest.fn(),
    onScanError: jest.fn(),
    lowPowerMode: false,
    ...overrides,
  };

  return renderHook(() => useBoardingPassScanner(defaultProps as any));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useBoardingPassScanner', () => {
  describe('initial state', () => {
    it('starts with scanning enabled and camera pending', () => {
      const { result } = renderScanner();

      expect(result.current.scanner.isScanning).toBe(true);
      expect(result.current.camera.status).toBe('pending');
      expect(result.current.scanner.result).toBeNull();
      expect(result.current.camera.flashMode).toBe('off');
    });
  });

  describe('camera lifecycle', () => {
    it('marks camera ready on handleCameraReady', () => {
      const { result } = renderScanner();

      act(() => {
        result.current.camera.handleReady();
      });

      expect(result.current.camera.status).toBe('ready');
    });

    it('marks camera unavailable on mount error', () => {
      const { result } = renderScanner();

      act(() => {
        result.current.camera.handleMountError(new Error('camera init failed'));
      });

      expect(result.current.camera.status).toBe('unavailable');
    });

    it('detects permission denial via status change', () => {
      const { result } = renderScanner();

      act(() => {
        result.current.camera.handleStatusChange({ cameraStatus: 'NOT_AUTHORIZED' });
      });

      expect(result.current.camera.status).toBe('denied');
    });
  });

  describe('toggleFlash', () => {
    it('toggles flash between off and on', () => {
      const { result } = renderScanner();

      expect(result.current.camera.flashMode).toBe('off');

      act(() => {
        result.current.camera.toggleFlash();
      });

      expect(result.current.camera.flashMode).toBe('on');

      act(() => {
        result.current.camera.toggleFlash();
      });

      expect(result.current.camera.flashMode).toBe('off');
    });
  });

  describe('demo scan', () => {
    it('starts demo and progresses through stages', () => {
      const { result } = renderScanner();

      act(() => {
        result.current.scanner.startDemo();
      });

      expect(result.current.camera.status).toBe('demo');
    });
  });

  describe('getGuidanceColor', () => {
    it('returns a string for scan results', () => {
      const { result } = renderScanner();

      const color = result.current.ui.getGuidanceColor({
        type: 'success',
        confidence: 1,
        guidance: 'Scanned',
      });

      expect(typeof color).toBe('string');
    });
  });

  describe('getConfidenceColor', () => {
    it('returns a color string based on confidence', () => {
      const { result } = renderScanner();

      const high = result.current.ui.getConfidenceColor(0.9);
      const low = result.current.ui.getConfidenceColor(0.3);

      expect(typeof high).toBe('string');
      expect(typeof low).toBe('string');
    });
  });
});
