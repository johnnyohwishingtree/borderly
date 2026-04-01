/**
 * Tests for MRZScanner Component
 * Tests the action sheet flow: Choose → Camera/Import/Cancel
 */

import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
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

describe('MRZScanner — action sheet', () => {
  const mockProps = {
    onScanSuccess: jest.fn(),
    onScanCancel: jest.fn(),
    onManualEntry: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    autoFireCameraReady = true;
  });

  it('shows action sheet with Camera, Import, Cancel on mount', () => {
    const { getByText } = render(<MRZScanner {...mockProps} />);
    getByText('Camera Scan');
    getByText('Import from Photo');
    getByText('Cancel');
  });

  it('does NOT show camera immediately', () => {
    const { queryByText } = render(<MRZScanner {...mockProps} />);
    expect(queryByText('Position passport MRZ in frame')).toBeNull();
  });

  it('Cancel calls onScanCancel', () => {
    const { getByText } = render(<MRZScanner {...mockProps} />);
    fireEvent.press(getByText('Cancel'));
    expect(mockProps.onScanCancel).toHaveBeenCalled();
  });

  it('Camera Scan transitions to camera view', async () => {
    const { getByText } = render(<MRZScanner {...mockProps} />);
    fireEvent.press(getByText('Camera Scan'));
    await waitFor(() => {
      getByText('Position passport MRZ in frame');
    });
  });

  it('shows unavailable screen when camera fails after selecting Camera Scan', async () => {
    autoFireCameraReady = false;
    jest.useFakeTimers();
    const { getByText } = render(<MRZScanner {...mockProps} />);

    fireEvent.press(getByText('Camera Scan'));

    act(() => { jest.advanceTimersByTime(10000); });

    await waitFor(() => {
      getByText('Camera Not Available');
    });
    getByText('Enter Manually');
    jest.useRealTimers();
  });

  it('cleans up on unmount without errors', () => {
    const { unmount } = render(<MRZScanner {...mockProps} />);
    expect(() => unmount()).not.toThrow();
  });
});
