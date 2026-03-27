/**
 * Tests for Card component.
 * Covers: rendering, variants, onPress, accessibility.
 */
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import Card from '../../../src/components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Card>
        <Text>Card Content</Text>
      </Card>,
    );
    getByText('Card Content');
  });

  it('calls onPress when interactive and pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Card onPress={onPress}>
        <Text>Tap me</Text>
      </Card>,
    );
    fireEvent.press(getByText('Tap me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders without onPress as non-interactive', () => {
    const { getByText } = render(
      <Card>
        <Text>Static card</Text>
      </Card>,
    );
    getByText('Static card');
  });

  it('renders with outlined variant', () => {
    const { getByText } = render(
      <Card variant="outlined">
        <Text>Outlined</Text>
      </Card>,
    );
    getByText('Outlined');
  });

  it('renders with elevated variant', () => {
    const { getByText } = render(
      <Card variant="elevated">
        <Text>Elevated</Text>
      </Card>,
    );
    getByText('Elevated');
  });

  it('renders with ghost variant', () => {
    const { getByText } = render(
      <Card variant="ghost">
        <Text>Ghost</Text>
      </Card>,
    );
    getByText('Ghost');
  });

  it('applies accessibility label', () => {
    const { getByLabelText } = render(
      <Card accessibilityLabel="Trip card">
        <Text>Content</Text>
      </Card>,
    );
    getByLabelText('Trip card');
  });

  it('has button role when onPress is provided', () => {
    const { getByRole } = render(
      <Card onPress={jest.fn()}>
        <Text>Interactive</Text>
      </Card>,
    );
    getByRole('button');
  });
});
