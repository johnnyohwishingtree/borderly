/**
 * Unit tests for BoardingPassScanner component
 * 
 * Tests component rendering, state transitions, and error handling.
 * Uses mocked camera and barcode detection.
 */

import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { RNCamera } from 'react-native-camera';
import { trigger } from 'react-native-haptic-feedback';
import BoardingPassScanner from '../../../src/components/boarding/BoardingPassScanner';
import * as boardingPassParser from '../../../src/services/boarding/boardingPassParser';

// Mock dependencies  
jest.mock('react-native-camera', () => {
  const React = require('react');
  const RNCamera = React.forwardRef((props: any, ref: any) => {
    // Store props for test access
    (globalThis as any).lastCameraProps = props;
    
    // Only trigger camera ready if test hasn't disabled it
    React.useEffect(() => {
      if (props.onCameraReady && !(globalThis as any).disableCameraReady) {
        setTimeout(() => props.onCameraReady(), 100);
      }
    }, [props.onCameraReady]);
    
    return React.createElement('RNCamera', props, props.children);
  });
  
  RNCamera.Constants = {
    Type: { back: 'back', front: 'front' },
    FlashMode: { off: 'off', on: 'on', torch: 'torch', auto: 'auto' },
    BarCodeType: {
      pdf417: 'pdf417',
      aztec: 'aztec', 
      qr: 'qr',
    },
  };
  
  return { RNCamera };
});

jest.mock('react-native-haptic-feedback');
jest.mock('../../../src/services/boarding/boardingPassParser', () => ({
  parseBoardingPass: jest.fn(),
}));

// Mock UI components
jest.mock('../../../src/components/ui/Button', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return jest.fn().mockImplementation(({ title, onPress, ...props }) => 
    React.createElement(TouchableOpacity, { 
      onPress,
      accessibilityRole: 'button',
      accessibilityLabel: title,
      ...props
    }, React.createElement(Text, {}, title))
  );
});

jest.mock('../../../src/components/ui/LoadingSpinner', () => {
  const React = require('react');
  const { ActivityIndicator } = require('react-native');
  return jest.fn().mockImplementation(() => 
    React.createElement(ActivityIndicator, { accessibilityLabel: 'Loading' })
  );
});

const mockTrigger = trigger as jest.MockedFunction<typeof trigger>;
const mockParseBoardingPass = boardingPassParser.parseBoardingPass as jest.MockedFunction<typeof boardingPassParser.parseBoardingPass>;

// Mock successful boarding pass parse result
const mockBoardingPass = {
  passengerName: 'JANE DOE',
  airlineCode: 'JL',
  flightNumber: 'JL123',
  departureAirport: 'NRT',
  arrivalAirport: 'HAN',
  flightDate: '2024-01-15',
  destinationCountry: 'JPN',
};

// Mock parse error result
const mockParseError = {
  code: 'PARSE_ERROR' as const,
  message: 'Invalid barcode format',
  originalData: 'invalid-data',
};

describe('BoardingPassScanner', () => {
  const defaultProps = {
    onScanSuccess: jest.fn(),
    onScanCancel: jest.fn(),
    onManualEntry: jest.fn(),
    onScanError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset test flags
    (globalThis as any).disableCameraReady = false;
    
    // Mock RNCamera.Constants
    (RNCamera as any).Constants = {
      Type: { back: 'back' },
      FlashMode: { off: 'off', torch: 'torch' },
      BarCodeType: {
        pdf417: 'pdf417',
        aztec: 'aztec',
        qr: 'qr',
      },
    };
  });

  describe('Camera States', () => {
    it('renders loading state initially', () => {
      const { getByText } = render(<BoardingPassScanner {...defaultProps} />);
      
      expect(getByText('Initializing camera...')).toBeTruthy();
    });

    it('renders camera access denied state', async () => {
      const { getByText, queryByText } = render(<BoardingPassScanner {...defaultProps} />);
      
      // Simulate camera permission denied
      const lastProps = (globalThis as any).lastCameraProps;
      if (lastProps?.onStatusChange) {
        act(() => {
          lastProps.onStatusChange({ cameraStatus: 'NOT_AUTHORIZED' });
        });
      }

      await waitFor(() => {
        expect(getByText('Camera Access Required')).toBeTruthy();
        expect(getByText('Enter Manually Instead')).toBeTruthy();
        expect(queryByText('Initializing camera...')).toBeNull();
      });
    });

    it('renders camera unavailable state', async () => {
      jest.useFakeTimers();
      
      // Disable camera ready callback to allow timeout
      (globalThis as any).disableCameraReady = true;
      
      const { getByText } = render(<BoardingPassScanner {...defaultProps} />);
      
      // Fast-forward past camera timeout
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(getByText('Camera Not Available')).toBeTruthy();
        expect(getByText('Try Demo Scan')).toBeTruthy();
      });

      jest.useRealTimers();
    });

    it('renders ready state when camera initializes', async () => {
      const { getByText, queryByText } = render(<BoardingPassScanner {...defaultProps} />);
      
      // Simulate camera ready
      const lastProps = (globalThis as any).lastCameraProps;
      if (lastProps?.onCameraReady) {
        act(() => {
          lastProps.onCameraReady();
        });
      }

      await waitFor(() => {
        expect(getByText('Scan your boarding pass barcode')).toBeTruthy();
        expect(queryByText('Initializing camera...')).toBeNull();
      });
    });
  });

  describe('Barcode Detection', () => {
    it('processes successful barcode scan', async () => {
      mockParseBoardingPass.mockReturnValue(mockBoardingPass);

      const { getByText } = render(<BoardingPassScanner {...defaultProps} />);
      
      // Setup camera ready state
      const lastProps = (globalThis as any).lastCameraProps;
      if (lastProps?.onCameraReady) {
        act(() => {
          lastProps.onCameraReady();
        });
      }

      // Simulate barcode detection
      if (lastProps?.onBarCodeRead) {
        act(() => {
          lastProps.onBarCodeRead({ data: 'valid-bcbp-data', type: 'pdf417' });
        });
      }

      await waitFor(() => {
        expect(getByText('Scan Complete!')).toBeTruthy();
      });

      // Verify haptic feedback
      expect(mockTrigger).toHaveBeenCalledWith(
        expect.stringContaining('notificationSuccess'),
        { enableVibrateFallback: true }
      );

      // Verify callback after delay
      await waitFor(() => {
        expect(defaultProps.onScanSuccess).toHaveBeenCalledWith(mockBoardingPass);
      });
    });

    it('handles barcode parse errors', async () => {
      mockParseBoardingPass.mockReturnValue(mockParseError);

      const { getByText } = render(<BoardingPassScanner {...defaultProps} />);
      
      // Setup camera ready state
      const lastProps = (globalThis as any).lastCameraProps;
      if (lastProps?.onCameraReady) {
        act(() => {
          lastProps.onCameraReady();
        });
      }

      // Simulate barcode detection with parse error
      if (lastProps?.onBarCodeRead) {
        act(() => {
          lastProps.onBarCodeRead({ data: 'invalid-data', type: 'qr' });
        });
      }

      await waitFor(() => {
        expect(getByText('Parse error: Invalid barcode format')).toBeTruthy();
      });

      // Should not call onScanSuccess
      expect(defaultProps.onScanSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Demo Mode', () => {
    it('starts demo scan when camera unavailable', async () => {
      jest.useFakeTimers();
      
      const { getByText } = render(<BoardingPassScanner {...defaultProps} />);
      
      // Trigger camera unavailable state
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(getByText('Try Demo Scan')).toBeTruthy();
      });

      // Press demo button
      const demoButton = getByText('Try Demo Scan');
      fireEvent.press(demoButton);

      expect(getByText('Demo: Scanning sample boarding pass')).toBeTruthy();
      
      jest.useRealTimers();
    });

    it('completes demo scan sequence', async () => {
      jest.useFakeTimers();
      mockParseBoardingPass.mockReturnValue(mockBoardingPass);

      const { getByText } = render(<BoardingPassScanner {...defaultProps} />);
      
      // Trigger demo mode
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(getByText('Try Demo Scan')).toBeTruthy();
      });

      const demoButton = getByText('Try Demo Scan');
      fireEvent.press(demoButton);

      // Advance through demo sequence: 1.5s + 1s + 1s = 3.5s to reach success state
      act(() => {
        jest.advanceTimersByTime(3500);
      });

      await waitFor(() => {
        expect(getByText('Scan Complete!')).toBeTruthy();
      });

      // Complete demo with final callback (additional 0.8s)
      act(() => {
        jest.advanceTimersByTime(800);
      });

      expect(defaultProps.onScanSuccess).toHaveBeenCalledWith(mockBoardingPass);
      
      jest.useRealTimers();
    });
  });

  describe('User Interactions', () => {
    it('handles cancel button press', async () => {
      const { getByText } = render(<BoardingPassScanner {...defaultProps} />);
      
      // Wait for camera to initialize
      await waitFor(() => {
        expect(getByText('Scan the barcode on your boarding pass')).toBeTruthy();
      });
      
      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);
      
      expect(defaultProps.onScanCancel).toHaveBeenCalledTimes(1);
    });

    it('handles manual entry button press', async () => {
      const { getByText } = render(<BoardingPassScanner {...defaultProps} />);
      
      // Wait for camera to initialize
      await waitFor(() => {
        expect(getByText('Scan the barcode on your boarding pass')).toBeTruthy();
      });
      
      const manualButton = getByText('Manual');
      fireEvent.press(manualButton);
      
      expect(defaultProps.onManualEntry).toHaveBeenCalledTimes(1);
    });

    it('toggles flash mode', async () => {
      const { getByLabelText, getByText } = render(<BoardingPassScanner {...defaultProps} />);
      
      // Wait for camera to initialize
      await waitFor(() => {
        expect(getByText('Scan the barcode on your boarding pass')).toBeTruthy();
      });

      await waitFor(() => {
        expect(getByLabelText('Turn flash on')).toBeTruthy();
      });

      const flashButton = getByLabelText('Turn flash on');
      fireEvent.press(flashButton);

      // Verify haptic feedback
      expect(mockTrigger).toHaveBeenCalledWith(expect.stringContaining('impactLight'));
      
      // Verify flash mode was toggled by checking props
      const lastProps = (globalThis as any).lastCameraProps;
      expect(lastProps?.flashMode).toBe(2); // torch mode
    });
  });

  describe('Error Handling', () => {
    it('handles camera mount errors', async () => {
      render(<BoardingPassScanner {...defaultProps} />);
      
      const lastProps = (globalThis as any).lastCameraProps;
      if (lastProps?.onMountError) {
        act(() => {
          lastProps.onMountError(new Error('Camera mount failed'));
        });
      }

      await waitFor(() => {
        expect(defaultProps.onScanError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Camera mount failed',
          })
        );
      });
    });

    it('handles barcode detection exceptions', async () => {
      mockParseBoardingPass.mockImplementation(() => {
        throw new Error('Parser crashed');
      });

      render(<BoardingPassScanner {...defaultProps} />);
      
      // Setup camera ready state
      const lastProps = (globalThis as any).lastCameraProps;
      if (lastProps?.onCameraReady) {
        act(() => {
          lastProps.onCameraReady();
        });
      }

      // Simulate barcode detection that throws
      if (lastProps?.onBarCodeRead) {
        act(() => {
          lastProps.onBarCodeRead({ data: 'crash-data', type: 'aztec' });
        });
      }

      await waitFor(() => {
        expect(defaultProps.onScanError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Parser crashed',
          })
        );
      });
    });
  });

  describe('Configuration', () => {
    it('applies low power mode settings', () => {
      render(<BoardingPassScanner {...defaultProps} lowPowerMode={true} />);
      
      // Verify camera ratio is set to 4:3 for low power mode
      const lastProps = (globalThis as any).lastCameraProps;
      expect(lastProps?.ratio).toBe('4:3');
    });

    it('uses standard settings in normal mode', () => {
      render(<BoardingPassScanner {...defaultProps} lowPowerMode={false} />);
      
      // Verify camera ratio is set to 16:9 for normal mode
      const lastProps = (globalThis as any).lastCameraProps;
      expect(lastProps?.ratio).toBe('16:9');
    });

    it('configures camera with correct barcode types', () => {
      render(<BoardingPassScanner {...defaultProps} />);
      
      const lastProps = (globalThis as any).lastCameraProps;
      expect(lastProps?.barCodeTypes).toEqual([
        'pdf417',
        'aztec',
        'qr',
      ]);
    });

    it('sets up camera with correct base properties', () => {
      render(<BoardingPassScanner {...defaultProps} />);
      
      const lastProps = (globalThis as any).lastCameraProps;
      expect(lastProps?.type).toBe('back');
      expect(lastProps?.captureAudio).toBe(false);
      expect(lastProps?.autoFocusPointOfInterest).toEqual({ x: 0.5, y: 0.5 });
    });
  });
});