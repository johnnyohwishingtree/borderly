/**
 * Tests for SearchableHelp component.
 * Covers: visibility, search filtering, trending topics, result press navigation,
 * close button, no-results state.
 */
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import SearchableHelp from '../../../src/components/help/SearchableHelp';

jest.mock('lucide-react-native', () => ({
  X: 'X',
  Search: 'Search',
  SearchX: 'SearchX',
  TrendingUp: 'TrendingUp',
  CircleHelp: 'CircleHelp',
  BookOpen: 'BookOpen',
  Wrench: 'Wrench',
  Info: 'Info',
}));

jest.mock('@/constants/countries', () => ({
  formatSupportedCountryList: () => 'Japan, Malaysia, Singapore',
}));

jest.mock('@/components/ui', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    Button: ({ title, onPress }: any) => (
      <TouchableOpacity onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    Card: ({ children }: any) => <View>{children}</View>,
    StatusBadge: ({ text }: any) => <Text>{text}</Text>,
  };
});

describe('SearchableHelp', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── Visibility ───────────────────────────────────────────────────────────

  it('renders modal content when visible', () => {
    const { getByText } = render(
      <SearchableHelp isVisible={true} onClose={jest.fn()} />,
    );
    getByText('Search Help');
  });

  it('passes visible=false to Modal when not visible', () => {
    const { UNSAFE_getByType } = render(
      <SearchableHelp isVisible={false} onClose={jest.fn()} />,
    );
    const { Modal } = require('react-native');
    expect(UNSAFE_getByType(Modal).props.visible).toBe(false);
  });

  // ─── Close ────────────────────────────────────────────────────────────────

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <SearchableHelp isVisible={true} onClose={onClose} />,
    );
    fireEvent.press(getByLabelText('Close search'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ─── Trending / Popular topics ────────────────────────────────────────────

  it('displays popular topics when search is empty', () => {
    const { getByText } = render(
      <SearchableHelp isVisible={true} onClose={jest.fn()} />,
    );
    getByText('Popular Topics');
    getByText('How to scan passport');
    getByText('QR code wallet');
  });

  // ─── Search filtering ────────────────────────────────────────────────────

  it('filters results by search query', async () => {
    const { getByLabelText, getByText } = render(
      <SearchableHelp isVisible={true} onClose={jest.fn()} />,
    );

    const input = getByLabelText('Search help content');
    fireEvent.changeText(input, 'passport scan');

    // Advance past the 300ms debounce
    act(() => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      getByText('How do I scan my passport?');
    });
  });

  it('shows no results message for unmatched query', async () => {
    const { getByLabelText, getByText } = render(
      <SearchableHelp isVisible={true} onClose={jest.fn()} />,
    );

    const input = getByLabelText('Search help content');
    fireEvent.changeText(input, 'xyznonexistent');

    act(() => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      getByText('No results found');
    });
  });

  // ─── Result navigation ───────────────────────────────────────────────────

  it('calls onNavigate with type and id when result is pressed', async () => {
    const onNavigate = jest.fn();
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <SearchableHelp isVisible={true} onClose={onClose} onNavigate={onNavigate} />,
    );

    const input = getByLabelText('Search help content');
    fireEvent.changeText(input, 'passport scan');

    act(() => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      const result = getByLabelText('View How do I scan my passport?');
      fireEvent.press(result);
    });

    expect(onNavigate).toHaveBeenCalledWith('faq', 'faq-passport-scan');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ─── Popular topic tap triggers search ────────────────────────────────────

  it('populates search when a popular topic is tapped', async () => {
    const { getByText, getByLabelText } = render(
      <SearchableHelp isVisible={true} onClose={jest.fn()} />,
    );

    fireEvent.press(getByText('Japan Visit Japan Web'));

    act(() => {
      jest.advanceTimersByTime(350);
    });

    const input = getByLabelText('Search help content');
    expect(input.props.value).toBe('Japan Visit Japan Web');
  });

  // ─── Clear search ────────────────────────────────────────────────────────

  it('clears search and shows popular topics again', async () => {
    const { getByLabelText, getByText, queryByText } = render(
      <SearchableHelp isVisible={true} onClose={jest.fn()} />,
    );

    const input = getByLabelText('Search help content');
    fireEvent.changeText(input, 'passport');

    act(() => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(queryByText('Popular Topics')).toBeNull();
    });

    // Press clear button
    fireEvent.press(getByLabelText('Clear search'));

    act(() => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      getByText('Popular Topics');
    });
  });
});
