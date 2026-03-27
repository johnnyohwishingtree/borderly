/**
 * Tests for AddressAutocomplete component.
 * Covers: rendering fields, offline mode, field updates, testIDs.
 */
import { render, fireEvent } from '@testing-library/react-native';
import AddressAutocomplete from '../../../src/components/ui/AddressAutocomplete';
import { Address } from '../../../src/types/profile';

// Mock places service
jest.mock('../../../src/services/places/placesService', () => ({
  getAutocompleteSuggestions: jest.fn().mockResolvedValue([]),
  getPlaceDetails: jest.fn().mockResolvedValue(null),
  getPlacesApiKey: jest.fn().mockReturnValue(null),
}));

const emptyAddress: Address = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
};

describe('AddressAutocomplete', () => {
  it('renders all address fields', () => {
    const { getByTestId } = render(
      <AddressAutocomplete
        value={emptyAddress}
        onAddressChange={jest.fn()}
        testID="addr"
      />,
    );
    getByTestId('addr-line1');
    getByTestId('addr-line2');
    getByTestId('addr-city');
    getByTestId('addr-state');
    getByTestId('addr-postal-code');
    getByTestId('addr-country');
  });

  it('renders label text', () => {
    const { getByText } = render(
      <AddressAutocomplete
        value={emptyAddress}
        onAddressChange={jest.fn()}
        label="Home Address"
      />,
    );
    getByText('Home Address');
  });

  it('calls onAddressChange when line1 changes', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <AddressAutocomplete
        value={emptyAddress}
        onAddressChange={onChange}
        testID="addr"
      />,
    );
    fireEvent.changeText(getByTestId('addr-line1'), '123 Main St');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ line1: '123 Main St' }),
    );
  });

  it('calls onAddressChange when city changes', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <AddressAutocomplete
        value={emptyAddress}
        onAddressChange={onChange}
        testID="addr"
      />,
    );
    fireEvent.changeText(getByTestId('addr-city'), 'Tokyo');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'Tokyo' }),
    );
  });

  it('does not show suggestions in offline mode', () => {
    const { queryByTestId } = render(
      <AddressAutocomplete
        value={emptyAddress}
        onAddressChange={jest.fn()}
        forceOffline
      />,
    );
    expect(queryByTestId('address-suggestions')).toBeNull();
  });

  it('renders with existing address values', () => {
    const address: Address = {
      line1: '1 Chome',
      line2: 'Suite 200',
      city: 'Shibuya',
      state: 'Tokyo',
      postalCode: '150-0001',
      country: 'JPN',
    };
    const { getByTestId } = render(
      <AddressAutocomplete
        value={address}
        onAddressChange={jest.fn()}
        testID="addr"
      />,
    );
    expect(getByTestId('addr-line1').props.value).toBe('1 Chome');
  });
});
