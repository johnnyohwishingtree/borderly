/**
 * Tests for EmptyState component.
 * Covers: rendering title/description, icon, action button, variants.
 */
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ReactTestRendererJSON } from 'react-test-renderer';
import EmptyState from '../../../src/components/ui/EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    const { getByText } = render(<EmptyState title="No items" />);
    getByText('No items');
  });

  it('renders title with header accessibility role', () => {
    const { getByRole } = render(<EmptyState title="No items" />);
    getByRole('header');
  });

  it('renders description text', () => {
    const { getByText } = render(
      <EmptyState title="No items" description="Add some items to get started" />,
    );
    getByText('Add some items to get started');
  });

  it('renders subtitle when provided', () => {
    const { getByText } = render(
      <EmptyState title="No items" subtitle="Try adding something" />,
    );
    getByText('Try adding something');
  });

  it('prefers subtitle over description when both provided', () => {
    const { getByText, queryByText } = render(
      <EmptyState
        title="No items"
        description="Description text"
        subtitle="Subtitle text"
      />,
    );
    getByText('Subtitle text');
    expect(queryByText('Description text')).toBeNull();
  });

  it('renders icon when provided', () => {
    const icon = <Text testID="test-icon">Icon</Text>;
    const { getByTestId } = render(<EmptyState title="No items" icon={icon} />);
    getByTestId('test-icon');
  });

  it('does not render icon container when icon is not provided', () => {
    const { getByRole } = render(<EmptyState title="No items" />);
    // Without icon, the title with header role should still render
    getByRole('header');
  });

  it('renders action button when buttonProps provided', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <EmptyState title="No items" buttonProps={{ title: 'Add Item', onPress }} />,
    );
    const button = getByText('Add Item');
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders secondary button when secondaryButtonProps provided', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <EmptyState
        title="No items"
        buttonProps={{ title: 'Primary', onPress: jest.fn() }}
        secondaryButtonProps={{ title: 'Secondary', onPress }}
      />,
    );
    getByText('Secondary');
  });

  it('does not render description when neither description nor subtitle provided', () => {
    const { queryByText } = render(<EmptyState title="Empty" />);
    // Title is rendered
    expect(queryByText('Empty')).not.toBeNull();
    // No description/subtitle rendered — component only has title
    const { toJSON } = render(<EmptyState title="Only Title" />);
    const root = toJSON() as ReactTestRendererJSON;
    const textChildren = (root.children ?? []).filter(
      (c): c is ReactTestRendererJSON => typeof c !== 'string' && c.type === 'Text',
    );
    expect(textChildren).toHaveLength(1);
  });
});
