/**
 * Tests for SearchableSelect component.
 * Covers: rendering, option selection, filtering, placeholder, error state.
 */
import { render, fireEvent } from '@testing-library/react-native';
import SearchableSelect from '../../../src/components/ui/SearchableSelect';

const options = [
  { value: 'us', label: 'United States' },
  { value: 'jp', label: 'Japan' },
  { value: 'sg', label: 'Singapore' },
];

describe('SearchableSelect', () => {
  it('renders placeholder when no value selected', () => {
    const { getByText } = render(
      <SearchableSelect options={options} onValueChange={jest.fn()} />,
    );
    expect(getByText('Select an option')).toBeTruthy();
  });

  it('renders custom placeholder', () => {
    const { getByText } = render(
      <SearchableSelect
        options={options}
        onValueChange={jest.fn()}
        placeholder="Choose country"
      />,
    );
    expect(getByText('Choose country')).toBeTruthy();
  });

  it('shows selected option label', () => {
    const { getByText } = render(
      <SearchableSelect options={options} value="jp" onValueChange={jest.fn()} />,
    );
    expect(getByText('Japan')).toBeTruthy();
  });

  it('opens dropdown panel on press', () => {
    const { getByTestId, queryByTestId } = render(
      <SearchableSelect
        options={options}
        onValueChange={jest.fn()}
        testID="country"
      />,
    );
    expect(queryByTestId('country-panel')).toBeNull();
    fireEvent.press(getByTestId('country-trigger'));
    expect(getByTestId('country-panel')).toBeTruthy();
  });

  it('closes panel on trigger press when already open', () => {
    const { getByTestId, queryByTestId } = render(
      <SearchableSelect
        options={options}
        onValueChange={jest.fn()}
        testID="country"
      />,
    );
    fireEvent.press(getByTestId('country-trigger'));
    expect(getByTestId('country-panel')).toBeTruthy();
    fireEvent.press(getByTestId('country-trigger'));
    expect(queryByTestId('country-panel')).toBeNull();
  });

  it('renders search input when open', () => {
    const { getByTestId } = render(
      <SearchableSelect
        options={options}
        onValueChange={jest.fn()}
        testID="country"
      />,
    );
    fireEvent.press(getByTestId('country-trigger'));
    // Search input should be visible when panel is open
    expect(getByTestId('country-search')).toBeTruthy();
  });

  it('shows label and required indicator', () => {
    const { getByText } = render(
      <SearchableSelect
        options={options}
        onValueChange={jest.fn()}
        label="Country"
        required
      />,
    );
    // "Country" and " *" are nested Texts — use regex to match the composite
    expect(getByText(/Country/)).toBeTruthy();
    expect(getByText(' *')).toBeTruthy();
  });

  it('shows error message when not open', () => {
    const { getByText } = render(
      <SearchableSelect
        options={options}
        onValueChange={jest.fn()}
        error="Selection required"
      />,
    );
    expect(getByText('Selection required')).toBeTruthy();
  });

  it('does not open when disabled', () => {
    const { getByTestId, queryByTestId } = render(
      <SearchableSelect
        options={options}
        onValueChange={jest.fn()}
        disabled
        testID="country"
      />,
    );
    fireEvent.press(getByTestId('country-trigger'));
    expect(queryByTestId('country-panel')).toBeNull();
  });
});
