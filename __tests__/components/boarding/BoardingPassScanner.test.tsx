/**
 * Tests for BoardingPassScanner Component
 * Tests the action sheet flow: Choose → Camera/Import/Cancel
 */

import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import BoardingPassScanner from '../../../src/components/boarding/BoardingPassScanner';

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
    BarCodeType: { pdf417: 'pdf417', aztec: 'aztec', qr: 'qr' },
  };
  return { RNCamera };
});

jest.mock('../../../src/services/boarding/boardingPassParser', () => ({
  parseBoardingPass: jest.fn(),
}));

jest.mock('../../../src/services/boarding/boardingPassImageImport', () => ({
  importBoardingPassFromImage: jest.fn(),
  getImageImportErrorMessage: jest.fn(() => 'Import failed'),
}));

describe('BoardingPassScanner — action sheet', () => {
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
    const { getByText } = render(<BoardingPassScanner {...mockProps} />);
    getByText('Camera Scan');
    getByText('Import from Photo');
    getByText('Cancel');
  });

  it('does NOT show camera immediately', () => {
    const { queryByText } = render(<BoardingPassScanner {...mockProps} />);
    expect(queryByText('Position boarding pass barcode in frame')).toBeNull();
  });

  it('Cancel calls onScanCancel', () => {
    const { getByText } = render(<BoardingPassScanner {...mockProps} />);
    fireEvent.press(getByText('Cancel'));
    expect(mockProps.onScanCancel).toHaveBeenCalled();
  });

  it('Camera Scan transitions to camera view', async () => {
    const { getByText } = render(<BoardingPassScanner {...mockProps} />);
    fireEvent.press(getByText('Camera Scan'));
    await waitFor(() => {
      getByText('Position boarding pass barcode in frame');
    });
  });

  it('camera view shows Cancel and Manual buttons', async () => {
    const { getByText } = render(<BoardingPassScanner {...mockProps} />);
    fireEvent.press(getByText('Camera Scan'));
    await waitFor(() => {
      getByText('Cancel');
      getByText('Manual');
    });
  });

  it('bounces back to action sheet when camera is unavailable', async () => {
    autoFireCameraReady = false;
    jest.useFakeTimers();
    const { getByText, queryByText } = render(<BoardingPassScanner {...mockProps} />);

    fireEvent.press(getByText('Camera Scan'));

    act(() => { jest.advanceTimersByTime(10000); });

    // Should bounce back to action sheet (no Camera option since it failed)
    await waitFor(() => {
      getByText('Import from Photo');
      getByText('Enter Manually');
    });
    // Camera Scan should be hidden since camera is unavailable
    expect(queryByText('Camera Scan')).toBeNull();
    jest.useRealTimers();
  });

  it('cleans up on unmount without errors', () => {
    const { unmount } = render(<BoardingPassScanner {...mockProps} />);
    expect(() => unmount()).not.toThrow();
  });
});
