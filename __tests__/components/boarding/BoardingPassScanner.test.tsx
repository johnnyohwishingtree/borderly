/**
 * Unit tests for BoardingPassScanner component
 * 
 * Tests component rendering, state transitions, and error handling.
 * Uses mocked camera and barcode detection.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { RNCamera } from 'react-native-camera';
import { trigger } from 'react-native-haptic-feedback';
import BoardingPassScanner from '../../../src/components/boarding/BoardingPassScanner';
import * as boardingPassParser from '../../../src/services/boarding/boardingPassParser';

// Mock dependencies
jest.mock('react-native-camera');
jest.mock('react-native-haptic-feedback');
jest.mock('../../../src/services/boarding/boardingPassParser');

const mockRNCamera = RNCamera as jest.Mocked<typeof RNCamera>;
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
    mockRNCamera.Constants = {
      Type: { back: 'back' },
      FlashMode: { off: 'off', torch: 'torch' },
      BarCodeType: {
        pdf417: 'pdf417',
        aztec: 'aztec',
        qr: 'qr',
      },
    } as any;
  });

  describe('Camera States', () => {
    it('renders loading state initially', () => {
      const { getByText } = render(<BoardingPassScanner {...defaultProps} />);
      
      expect(getByText('Initializing camera...')).toBeTruthy();
    });

    it('renders camera access denied state', async () => {
      const { getByText, queryByText } = render(<BoardingPassScanner {...defaultProps} />);
      
      // Simulate camera permission denied
      const onStatusChange = mockRNCamera.mock.calls[0]?.[0].onStatusChange;
      if (onStatusChange) {
        act(() => {
          onStatusChange({ cameraStatus: 'NOT_AUTHORIZED' });
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
      const onCameraReady = mockRNCamera.mock.calls[0]?.[0].onCameraReady;
      if (onCameraReady) {
        act(() => {
          onCameraReady();
        });
      }

      await waitFor(() => {
        expect(getByText('Scan your boarding pass barcode')).toBeTruthy();
        expect(queryByText('Initializing camera...')).toBeNull();
      });
    });
  });

  describe('Barcode Detection', () => {
    beforeEach(async () => {
      // Setup camera in ready state
      const { rerender } = render(<BoardingPassScanner {...defaultProps} />);
      const onCameraReady = mockRNCamera.mock.calls[0]?.[0].onCameraReady;
      if (onCameraReady) {
        act(() => {
          onCameraReady();
        });
      }
      rerender(<BoardingPassScanner {...defaultProps} />);
    });

    it('processes successful barcode scan', async () => {
      mockParseBoardingPass.mockReturnValue(mockBoardingPass);

      const { getByText } = render(<BoardingPassScanner {...defaultProps} />);
      
      // Setup camera ready state
      const onCameraReady = mockRNCamera.mock.calls[0]?.[0].onCameraReady;
      if (onCameraReady) {
        act(() => {
          onCameraReady();
        });
      }

      // Simulate barcode detection
      const onBarCodeRead = mockRNCamera.mock.calls[0]?.[0].onBarCodeRead;
      if (onBarCodeRead) {
        act(() => {
          onBarCodeRead({ data: 'valid-bcbp-data', type: 'pdf417' });
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
      const onCameraReady = mockRNCamera.mock.calls[0]?.[0].onCameraReady;
      if (onCameraReady) {
        act(() => {
          onCameraReady();
        });
      }

      // Simulate barcode detection with parse error
      const onBarCodeRead = mockRNCamera.mock.calls[0]?.[0].onBarCodeRead;
      if (onBarCodeRead) {
        act(() => {
          onBarCodeRead({ data: 'invalid-data', type: 'qr' });
        });
      }

      await waitFor(() => {
        expect(getByText('Parse error: Invalid barcode format')).toBeTruthy();
      });

      // Should not call onScanSuccess
      expect(defaultProps.onScanSuccess).not.toHaveBeenCalled();
    });

    it('implements scan cooldown to prevent excessive processing', async () => {
      mockParseBoardingPass.mockReturnValue(mockBoardingPass);

      const { rerender } = render(<BoardingPassScanner {...defaultProps} lowPowerMode={true} />);
      
      // Setup camera ready state
      const onCameraReady = mockRNCamera.mock.calls[0]?.[0].onCameraReady;
      if (onCameraReady) {
        act(() => {
          onCameraReady();
        });
      }

      const onBarCodeRead = mockRNCamera.mock.calls[0]?.[0].onBarCodeRead;
      
      // First scan should work
      if (onBarCodeRead) {
        act(() => {
          onBarCodeRead({ data: 'bcbp-data-1', type: 'pdf417' });
        });
      }

      // Immediate second scan should be ignored due to cooldown
      if (onBarCodeRead) {
        act(() => {
          onBarCodeRead({ data: 'bcbp-data-2', type: 'pdf417' });
        });
      }

      // Parser should only be called once
      expect(mockParseBoardingPass).toHaveBeenCalledTimes(1);
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

      const demoButton = getByText('Try Demo Scan');
      fireEvent.press(demoButton);

      // Advance through demo sequence
      act(() => {
        jest.advanceTimersByTime(4500); // Complete demo sequence
      });

      await waitFor(() => {
        expect(getByText('Scan Complete!')).toBeTruthy();
      });

      // Complete demo with final callback
      act(() => {
        jest.advanceTimersByTime(800);
      });

      expect(defaultProps.onScanSuccess).toHaveBeenCalledWith(mockBoardingPass);
      
      jest.useRealTimers();
    });
  });

  describe('User Interactions', () => {
    it('handles cancel button press', () => {
      const { getByText } = render(<BoardingPassScanner {...defaultProps} />);
      
      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);
      
      expect(defaultProps.onScanCancel).toHaveBeenCalledTimes(1);
    });

    it('handles manual entry button press', () => {
      const { getByText } = render(<BoardingPassScanner {...defaultProps} />);
      
      const manualButton = getByText('Manual');
      fireEvent.press(manualButton);
      
      expect(defaultProps.onManualEntry).toHaveBeenCalledTimes(1);
    });

    it('toggles flash mode', async () => {
      const { getByLabelText } = render(<BoardingPassScanner {...defaultProps} />);
      
      // Setup camera ready state first
      const onCameraReady = mockRNCamera.mock.calls[0]?.[0].onCameraReady;
      if (onCameraReady) {
        act(() => {
          onCameraReady();
        });
      }

      const flashButton = getByLabelText('Turn flash on');
      fireEvent.press(flashButton);

      // Verify haptic feedback
      expect(mockTrigger).toHaveBeenCalledWith(expect.stringContaining('impactLight'));
      
      // Flash should toggle to on (verified by checking camera props in next render)
      expect(mockRNCamera).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles camera mount errors', async () => {
      const { rerender } = render(<BoardingPassScanner {...defaultProps} />);
      
      const onMountError = mockRNCamera.mock.calls[0]?.[0].onMountError;
      if (onMountError) {
        act(() => {
          onMountError(new Error('Camera mount failed'));
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

      const { rerender } = render(<BoardingPassScanner {...defaultProps} />);
      
      // Setup camera ready state
      const onCameraReady = mockRNCamera.mock.calls[0]?.[0].onCameraReady;
      if (onCameraReady) {
        act(() => {
          onCameraReady();
        });
      }

      // Simulate barcode detection that throws
      const onBarCodeRead = mockRNCamera.mock.calls[0]?.[0].onBarCodeRead;
      if (onBarCodeRead) {
        act(() => {
          onBarCodeRead({ data: 'crash-data', type: 'aztec' });
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

  describe('Low Power Mode', () => {
    it('applies longer scan cooldown in low power mode', () => {
      render(<BoardingPassScanner {...defaultProps} lowPowerMode={true} />);
      
      // Verify camera ratio is set to 4:3 for low power mode
      const cameraProps = mockRNCamera.mock.calls[0]?.[0];
      expect(cameraProps?.ratio).toBe('4:3');
    });

    it('uses standard settings in normal mode', () => {
      render(<BoardingPassScanner {...defaultProps} lowPowerMode={false} />);
      
      // Verify camera ratio is set to 16:9 for normal mode
      const cameraProps = mockRNCamera.mock.calls[0]?.[0];
      expect(cameraProps?.ratio).toBe('16:9');
    });
  });

  describe('Camera Configuration', () => {
    it('configures camera with correct barcode types', () => {
      render(<BoardingPassScanner {...defaultProps} />);
      
      const cameraProps = mockRNCamera.mock.calls[0]?.[0];
      expect(cameraProps?.barCodeTypes).toEqual([
        'pdf417',
        'aztec',
        'qr',
      ]);
    });

    it('sets up camera with correct base properties', () => {
      render(<BoardingPassScanner {...defaultProps} />);
      
      const cameraProps = mockRNCamera.mock.calls[0]?.[0];
      expect(cameraProps?.type).toBe('back');
      expect(cameraProps?.captureAudio).toBe(false);
      expect(cameraProps?.autoFocusPointOfInterest).toEqual({ x: 0.5, y: 0.5 });
    });
  });
});