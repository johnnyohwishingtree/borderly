/**
 * Tests for MRZScanner Component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
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
  });

  it('renders without crashing', () => {
    const component = render(<MRZScanner {...mockProps} />);
    expect(component).toBeTruthy();
  });

  it('renders loading state initially', () => {
    const { getByText } = render(<MRZScanner {...mockProps} />);

    // Component starts in loading state while initializing camera
    expect(getByText('Initializing camera...')).toBeTruthy();
  });

  it('cleans up on unmount', () => {
    const { unmount } = render(<MRZScanner {...mockProps} />);
    expect(() => unmount()).not.toThrow();
  });
});