/**
 * Tests for BoardingPassScanner Component
 * Now camera-only — action sheet is handled by parent screen.
 */

import { render, waitFor, act } from '@testing-library/react-native';
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

describe('BoardingPassScanner — camera only', () => {
  const mockProps = {
    onScanSuccess: jest.fn(),
    onScanCancel: jest.fn(),
    onManualEntry: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    autoFireCameraReady = true;
  });

  it('shows camera scanning UI when camera is ready', async () => {
    const { getByText } = render(<BoardingPassScanner {...mockProps} />);
    await waitFor(() => {
      getByText('Position boarding pass barcode in frame');
    });
  });

  it('shows Cancel and Manual buttons in camera view', async () => {
    const { getByText } = render(<BoardingPassScanner {...mockProps} />);
    await waitFor(() => {
      getByText('Cancel');
      getByText('Manual');
    });
  });

  it('shows fallback when camera is unavailable', async () => {
    autoFireCameraReady = false;
    jest.useFakeTimers();
    const { getByText } = render(<BoardingPassScanner {...mockProps} />);

    act(() => { jest.advanceTimersByTime(10000); });

    await waitFor(() => {
      getByText('Camera Not Available');
      getByText('Enter Manually');
    });
    jest.useRealTimers();
  });

  it('does NOT contain import from photo (handled by parent screen)', () => {
    const { queryByText } = render(<BoardingPassScanner {...mockProps} />);
    expect(queryByText('Import from Photo')).toBeNull();
  });

  it('cleans up on unmount', () => {
    const { unmount } = render(<BoardingPassScanner {...mockProps} />);
    expect(() => unmount()).not.toThrow();
  });
});
