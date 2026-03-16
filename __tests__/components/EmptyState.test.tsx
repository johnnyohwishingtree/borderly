/**
 * Unit tests for EmptyState component.
 * Verifies icon, title, subtitle/description, and optional CTA button rendering.
 */
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

// Mock Button so tests don't need native module dependencies
jest.mock('../../src/components/ui/Button', () => {
  const MockReact = require('react');
  const { TouchableOpacity, Text: RNText } = require('react-native');
  return {
    __esModule: true,
    default: function MockButton({
      title,
      onPress,
      testID,
    }: {
      title: string;
      onPress: () => void;
      testID?: string;
    }) {
      return MockReact.createElement(
        TouchableOpacity,
        { onPress, testID: testID ?? 'mock-button' },
        MockReact.createElement(RNText, null, title),
      );
    },
  };
});

import EmptyState from '../../src/components/ui/EmptyState';

describe('EmptyState', () => {
  it('renders the title', () => {
    const { getByText } = render(<EmptyState title="No trips yet" />);
    expect(getByText('No trips yet')).toBeTruthy();
  });

  it('renders an icon when provided', () => {
    const { getByTestId } = render(
      <EmptyState
        title="No items"
        icon={<Text testID="empty-icon">✈️</Text>}
      />,
    );
    expect(getByTestId('empty-icon')).toBeTruthy();
  });

  it('renders description text when provided', () => {
    const { getByText } = render(
      <EmptyState
        title="No trips yet"
        description="Create your first trip to get started"
      />,
    );
    expect(getByText('Create your first trip to get started')).toBeTruthy();
  });

  it('renders subtitle text when provided', () => {
    const { getByText } = render(
      <EmptyState
        title="No QR codes"
        subtitle="Add QR codes for quick border access"
      />,
    );
    expect(getByText('Add QR codes for quick border access')).toBeTruthy();
  });

  it('subtitle takes precedence over description when both supplied', () => {
    const { getByText, queryByText } = render(
      <EmptyState
        title="Title"
        description="description text"
        subtitle="subtitle text"
      />,
    );
    expect(getByText('subtitle text')).toBeTruthy();
    expect(queryByText('description text')).toBeNull();
  });

  it('does not render body text when neither description nor subtitle provided', () => {
    const { queryByText } = render(<EmptyState title="Empty" />);
    // Only the title should be present — no stray body text
    expect(queryByText('description text')).toBeNull();
  });

  it('renders the CTA button with the supplied title', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <EmptyState
        title="No trips yet"
        buttonProps={{ title: 'Create Trip', onPress, variant: 'primary' }}
      />,
    );
    expect(getByText('Create Trip')).toBeTruthy();
  });

  it('calls onPress when the CTA button is pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <EmptyState
        title="No trips"
        buttonProps={{ title: 'Create Trip', onPress, variant: 'primary' }}
      />,
    );
    fireEvent.press(getByText('Create Trip'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render a button when buttonProps is not provided', () => {
    const { queryByText } = render(<EmptyState title="No items" />);
    expect(queryByText('Create Trip')).toBeNull();
  });

  it('renders with compact variant without crashing', () => {
    const { getByText } = render(
      <EmptyState title="Compact" variant="compact" />,
    );
    expect(getByText('Compact')).toBeTruthy();
  });

  it('renders with illustration variant without crashing', () => {
    const { getByText } = render(
      <EmptyState title="Illustration" variant="illustration" />,
    );
    expect(getByText('Illustration')).toBeTruthy();
  });
});
