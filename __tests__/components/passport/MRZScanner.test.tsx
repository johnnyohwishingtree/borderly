/**
 * Tests for MRZScanner Component
 */

import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import MRZScanner from '../../../src/components/passport/MRZScanner';

// Control whether the mock camera fires onCameraReady automatically
let autoFireCameraReady = true;

// Mock react-native-camera with controllable onCameraReady
jest.mock('react-native-camera', () => {
  const React = require('react');
  const RNCamera = ({ children, onCameraReady, ...props }: any) => {
    React.useEffect(() => {
      if (autoFireCameraReady && onCameraReady) {
        onCameraReady();
      }
    }, [onCameraReady]);
    return React.createElement('RNCamera', props, children);
  };
  RNCamera.Constants = {
    Type: { back: 'back', front: 'front' },
    FlashMode: { off: 'off', on: 'on', torch: 'torch', auto: 'auto' },
  };
  return { RNCamera };
});

// Mock MRZ scanner service
jest.mock('../../../src/services/passport/mrzScanner', () => ({
  MRZScanner: jest.fn().mockImplementation(() => ({
    processFrame: jest.fn().mockReturnValue({
      type: 'no_mrz',
      confidence: 0,
      guidance: 'Initializing scanner...'
    }),
    reset: jest.fn(),
    dispose: jest.fn(),
    isDisposedState: jest.fn(() => false),
    getStats: jest.fn(() => ({ attempts: 0, lastScan: null })),
    getPerformanceMetrics: jest.fn(() => ({
      successRate: 0,
      averageAttempts: 0,
      avgProcessingTime: 0,
      framesSkipped: 0,
      deviceTier: 'medium',
    }))
  })),
  createOptimizedMRZScanner: jest.fn().mockImplementation(() => ({
    processFrame: jest.fn().mockReturnValue({
      type: 'no_mrz',
      confidence: 0,
      guidance: 'Initializing scanner...'
    }),
    reset: jest.fn(),
    dispose: jest.fn(),
    isDisposedState: jest.fn(() => false),
    getStats: jest.fn(() => ({ attempts: 0, lastScan: null })),
    getPerformanceMetrics: jest.fn(() => ({
      successRate: 0,
      averageAttempts: 0,
      avgProcessingTime: 0,
      framesSkipped: 0,
      deviceTier: 'medium',
    }))
  }))
}));

describe('MRZScanner Component', () => {
  const mockProps = {
    onScanSuccess: jest.fn(),
    onScanCancel: jest.fn(),
    onManualEntry: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    autoFireCameraReady = true;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    const component = render(<MRZScanner {...mockProps} />);
    expect(component).toBeTruthy();
  });

  it('renders camera scanning UI when camera initializes immediately', () => {
    const { getByText } = render(<MRZScanner {...mockProps} />);
    // Camera mock fires onCameraReady immediately, so we see the scanning UI
    expect(getByText('Position passport MRZ in frame')).toBeTruthy();
  });

  it('shows loading overlay when camera has not initialized yet', () => {
    autoFireCameraReady = false;
    const { getByText } = render(<MRZScanner {...mockProps} />);
    // Camera hasn't called onCameraReady, so loading overlay should show
    expect(getByText('Initializing camera...')).toBeTruthy();
  });

  it('shows error state after camera initialization timeout', async () => {
    autoFireCameraReady = false;
    const { getByText } = render(<MRZScanner {...mockProps} />);

    // Initially shows loading
    expect(getByText('Initializing camera...')).toBeTruthy();

    // Advance past the 10-second timeout
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Should show camera unavailable screen (timeout = hardware issue, not permission)
    await waitFor(() => {
      expect(getByText('Camera Not Available')).toBeTruthy();
    });

    // Manual entry button should be available
    expect(getByText('Enter Manually Instead')).toBeTruthy();
  });

  it('calls onManualEntry when manual entry button is pressed after timeout', async () => {
    autoFireCameraReady = false;
    const { getByText } = render(<MRZScanner {...mockProps} />);

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect(getByText('Enter Manually Instead')).toBeTruthy();
    });

    fireEvent.press(getByText('Enter Manually Instead'));
    expect(mockProps.onManualEntry).toHaveBeenCalled();
  });

  it('cleans up on unmount', () => {
    const { unmount } = render(<MRZScanner {...mockProps} />);
    expect(() => unmount()).not.toThrow();
  });
});
