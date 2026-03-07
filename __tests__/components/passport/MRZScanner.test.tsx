/**
 * Tests for MRZScanner Component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import MRZScanner from '../../../src/components/passport/MRZScanner';

// Mock MRZ scanner service
jest.mock('../../../src/services/passport/mrzScanner', () => ({
  MRZScanner: jest.fn().mockImplementation(() => ({
    processFrame: jest.fn().mockReturnValue({
      type: 'no_mrz',
      confidence: 0,
      guidance: 'Initializing scanner...'
    }),
    reset: jest.fn(),
    getStats: jest.fn(() => ({ attempts: 0, lastScan: null }))
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
    Alert.alert = jest.fn();
  });

  it('renders camera interface when ready', () => {
    const { getByText } = render(<MRZScanner {...mockProps} />);

    expect(getByText('Position passport MRZ in frame')).toBeTruthy();
    expect(getByText('Align the two lines at the bottom of your passport')).toBeTruthy();
  });

  it('renders scanning interface elements', () => {
    const { getByText } = render(<MRZScanner {...mockProps} />);

    expect(getByText('MRZ SCANNING AREA')).toBeTruthy();
  });

  it('shows control buttons', () => {
    const { getByText } = render(<MRZScanner {...mockProps} />);

    expect(getByText('Cancel')).toBeTruthy();
    expect(getByText('Manual')).toBeTruthy();
  });

  it('handles cancel button press', () => {
    const { getByText } = render(<MRZScanner {...mockProps} />);

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockProps.onScanCancel).toHaveBeenCalledTimes(1);
  });

  it('handles manual entry button press', () => {
    const { getByText } = render(<MRZScanner {...mockProps} />);

    const manualButton = getByText('Manual');
    fireEvent.press(manualButton);

    expect(mockProps.onManualEntry).toHaveBeenCalledTimes(1);
  });

  it('shows guidance text', () => {
    const { getByText } = render(<MRZScanner {...mockProps} />);

    expect(getByText('Initializing scanner...')).toBeTruthy();
  });

  it('shows flash toggle button', () => {
    const { getByLabelText } = render(<MRZScanner {...mockProps} />);

    const flashButton = getByLabelText('Turn flash on');
    expect(flashButton).toBeTruthy();
  });

  it('handles flash toggle', () => {
    const { getByLabelText } = render(<MRZScanner {...mockProps} />);

    const flashButton = getByLabelText('Turn flash on');
    fireEvent.press(flashButton);
    
    // Flash should toggle
    const flashOffButton = getByLabelText('Turn flash off');
    expect(flashOffButton).toBeTruthy();
  });

  it('renders successfully without crashing', () => {
    const component = render(<MRZScanner {...mockProps} />);
    expect(component).toBeTruthy();
  });

  it('cleans up on unmount', () => {
    const { unmount } = render(<MRZScanner {...mockProps} />);
    expect(() => unmount()).not.toThrow();
  });
});