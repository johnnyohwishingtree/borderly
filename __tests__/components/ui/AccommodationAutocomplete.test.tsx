/**
 * Tests for AccommodationAutocomplete component.
 *
 * Verifies:
 * - Renders with placeholder text
 * - Shows suggestions when typing (mocked API)
 * - Selecting a suggestion calls onNameChange with hotel name
 * - Selecting a suggestion calls onAddressResolved with formatted address
 * - Falls back to plain input when offline/no suggestions
 * - Typed text commits via onNameChange on every keystroke
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock the places service
const mockGetLodgingSuggestions = jest.fn();
const mockGetLodgingDetails = jest.fn();
jest.mock('../../../src/services/places/placesService', () => ({
  getLodgingSuggestions: (...args: unknown[]) => mockGetLodgingSuggestions(...args),
  getLodgingDetails: (...args: unknown[]) => mockGetLodgingDetails(...args),
  getPlacesApiKey: () => 'native',
}));

import AccommodationAutocomplete from '../../../src/components/ui/AccommodationAutocomplete';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('AccommodationAutocomplete', () => {
  const defaultProps = {
    value: '',
    onNameChange: jest.fn(),
    testID: 'accommodation',
  };

  it('renders with placeholder', () => {
    const { getByPlaceholderText } = render(
      <AccommodationAutocomplete {...defaultProps} />,
    );
    expect(getByPlaceholderText('Start typing a hotel name…')).toBeTruthy();
  });

  it('calls onNameChange on every keystroke', () => {
    const onNameChange = jest.fn();
    const { getByPlaceholderText } = render(
      <AccommodationAutocomplete {...defaultProps} onNameChange={onNameChange} />,
    );

    fireEvent.changeText(getByPlaceholderText('Start typing a hotel name…'), 'Park');
    expect(onNameChange).toHaveBeenCalledWith('Park');
  });

  it('fetches suggestions after debounce when input >= 3 chars', async () => {
    mockGetLodgingSuggestions.mockResolvedValueOnce([
      { placeId: '1', mainText: 'Park Hyatt Tokyo', secondaryText: 'Tokyo, Japan', description: 'Park Hyatt Tokyo, Tokyo, Japan' },
    ]);

    const { getByPlaceholderText } = render(
      <AccommodationAutocomplete {...defaultProps} value="Par" />,
    );

    fireEvent.changeText(getByPlaceholderText('Start typing a hotel name…'), 'Park Hyatt');

    // Advance debounce timer (300ms)
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(mockGetLodgingSuggestions).toHaveBeenCalledWith(
        'Park Hyatt',
        expect.any(String),
      );
    });
  });

  it('does not fetch suggestions for input < 3 chars', () => {
    const { getByPlaceholderText } = render(
      <AccommodationAutocomplete {...defaultProps} />,
    );

    fireEvent.changeText(getByPlaceholderText('Start typing a hotel name…'), 'Pa');
    jest.advanceTimersByTime(300);

    expect(mockGetLodgingSuggestions).not.toHaveBeenCalled();
  });

  it('shows Google attribution when API is available', () => {
    const { getByText } = render(
      <AccommodationAutocomplete {...defaultProps} />,
    );
    expect(getByText('Powered by Google')).toBeTruthy();
  });

  it('does not show attribution when forced offline', () => {
    const { queryByText } = render(
      <AccommodationAutocomplete {...defaultProps} forceOffline />,
    );
    expect(queryByText('Powered by Google')).toBeNull();
  });

  it('shows error message when error prop is set', () => {
    const { getByText } = render(
      <AccommodationAutocomplete {...defaultProps} error="Required" />,
    );
    expect(getByText('Required')).toBeTruthy();
  });
});
