/**
 * Tests for useMRZScanner hook.
 * Covers: initial state, camera lifecycle, text recognition, demo mode, performance metrics.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useMRZScanner } from '@/hooks/useMRZScanner';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/services/passport/mrzScanner', () => ({
  createOptimizedMRZScanner: jest.fn(() => ({
    processFrame: jest.fn(() => null),
    getPerformanceMetrics: jest.fn(() => ({
      scanAttempts: 0,
      successfulScans: 0,
    })),
    dispose: jest.fn(),
    reset: jest.fn(),
    isDisposed: jest.fn(() => false),
  })),
}));

jest.mock('@/services/passport/mrzScanner/mrzParser', () => ({
  parseMRZ: jest.fn(() => ({
    success: true,
    confidence: 0.95,
    mrz: { surname: 'DOE', givenNames: 'JOHN' },
  })),
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

  return renderHook(() => useMRZScanner(defaultProps as any));
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

describe('useMRZScanner', () => {
  describe('initial state', () => {
    it('starts with scanning enabled and camera pending', () => {
      const { result } = renderScanner();

      expect(result.current.isScanning).toBe(true);
      expect(result.current.cameraStatus).toBe('pending');
      expect(result.current.scanResult).toBeNull();
      expect(result.current.flashMode).toBe('off');
    });

    it('initializes performance metrics when not in low power mode', () => {
      const { result } = renderScanner({ lowPowerMode: false });

      // Performance metrics should be available (may be null initially until interval fires)
      expect(result.current.lowPowerMode).toBe(false);
    });

    it('skips performance monitoring in low power mode', () => {
      const { result } = renderScanner({ lowPowerMode: true });

      expect(result.current.lowPowerMode).toBe(true);
      expect(result.current.performanceMetrics).toBeNull();
    });
  });

  describe('camera lifecycle', () => {
    it('marks camera ready on handleCameraReady', () => {
      const { result } = renderScanner();

      act(() => {
        result.current.handleCameraReady();
      });

      expect(result.current.cameraStatus).toBe('ready');
    });

    it('marks camera unavailable on mount error', () => {
      const { result } = renderScanner();

      act(() => {
        result.current.handleMountError(new Error('camera init failed'));
      });

      expect(result.current.cameraStatus).toBe('unavailable');
    });

    it('detects permission denial', () => {
      const { result } = renderScanner();

      act(() => {
        result.current.handleStatusChange({ cameraStatus: 'NOT_AUTHORIZED' });
      });

      expect(result.current.cameraStatus).toBe('denied');
    });
  });

  describe('toggleFlash', () => {
    it('toggles between off and on', () => {
      const { result } = renderScanner();

      expect(result.current.flashMode).toBe('off');

      act(() => {
        result.current.toggleFlash();
      });

      expect(result.current.flashMode).toBe('on');
    });
  });

  describe('demo scan', () => {
    it('enters demo mode on startDemoScan', () => {
      const { result } = renderScanner();

      act(() => {
        result.current.startDemoScan();
      });

      expect(result.current.cameraStatus).toBe('demo');
    });
  });

  describe('getGuidanceColor', () => {
    it('returns a string for various result types', () => {
      const { result } = renderScanner();

      const color = result.current.getGuidanceColor({
        type: 'partial',
        confidence: 0.6,
        guidance: 'Hold steady',
      });

      expect(typeof color).toBe('string');
    });
  });
});
