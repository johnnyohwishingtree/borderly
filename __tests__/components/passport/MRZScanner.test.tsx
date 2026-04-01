/**
 * Tests for MRZScanner — camera-only component.
 * Action sheet is handled by parent screen.
 */

import { render, waitFor, act } from '@testing-library/react-native';
import MRZScanner from '../../../src/components/passport/MRZScanner';

let autoFireCameraReady = true;

jest.mock('react-native-camera', () => {
  const React = require('react');
  const RNCamera = ({ children, onCameraReady, ...props }: any) => {
    React.useEffect(() => {
      if (autoFireCameraReady && onCameraReady) onCameraReady();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return React.createElement('RNCamera', props, children);
  };
  RNCamera.Constants = {
    Type: { back: 'back', front: 'front' },
    FlashMode: { off: 'off', on: 'on', torch: 'torch', auto: 'auto' },
  };
  return { RNCamera };
});

jest.mock('../../../src/services/passport/mrzScanner', () => ({
  MRZScanner: jest.fn().mockImplementation(() => ({
    processFrame: jest.fn().mockReturnValue({ type: 'no_mrz', confidence: 0, guidance: 'Initializing...' }),
    reset: jest.fn(),
    dispose: jest.fn(),
    isDisposedState: jest.fn(() => false),
    getStats: jest.fn(() => ({ attempts: 0, lastScan: null })),
    getPerformanceMetrics: jest.fn(() => ({ successRate: 0, averageAttempts: 0, avgProcessingTime: 0, framesSkipped: 0, deviceTier: 'medium' })),
  })),
  createOptimizedMRZScanner: jest.fn().mockImplementation(() => ({
    processFrame: jest.fn().mockReturnValue({ type: 'no_mrz', confidence: 0, guidance: 'Initializing...' }),
    reset: jest.fn(),
    dispose: jest.fn(),
    isDisposedState: jest.fn(() => false),
    getStats: jest.fn(() => ({ attempts: 0, lastScan: null })),
    getPerformanceMetrics: jest.fn(() => ({ successRate: 0, averageAttempts: 0, avgProcessingTime: 0, framesSkipped: 0, deviceTier: 'medium' })),
  })),
}));

describe('MRZScanner — camera only', () => {
  const mockProps = {
    onScanSuccess: jest.fn(),
    onScanCancel: jest.fn(),
    onManualEntry: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    autoFireCameraReady = true;
  });

  it('shows camera scanning UI immediately (no action sheet)', async () => {
    const { getByText } = render(<MRZScanner {...mockProps} />);
    await waitFor(() => {
      getByText('Position passport MRZ in frame');
    });
  });

  it('does NOT contain Import from Photo', () => {
    const { queryByText } = render(<MRZScanner {...mockProps} />);
    expect(queryByText('Import from Photo')).toBeNull();
  });

  it('shows fallback when camera unavailable', async () => {
    autoFireCameraReady = false;
    jest.useFakeTimers();
    const { getByText } = render(<MRZScanner {...mockProps} />);
    act(() => { jest.advanceTimersByTime(10000); });
    await waitFor(() => {
      getByText('Camera Not Available');
      getByText('Enter Manually');
    });
    jest.useRealTimers();
  });

  it('cleans up on unmount', () => {
    const { unmount } = render(<MRZScanner {...mockProps} />);
    expect(() => unmount()).not.toThrow();
  });
});
