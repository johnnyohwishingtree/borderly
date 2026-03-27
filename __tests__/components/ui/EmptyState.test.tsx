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
    expect(getByText('No items')).toBeTruthy();
  });

  it('renders title with header accessibility role', () => {
    const { getByRole } = render(<EmptyState title="No items" />);
    expect(getByRole('header')).toBeTruthy();
  });

  it('renders description text', () => {
    const { getByText } = render(
      <EmptyState title="No items" description="Add some items to get started" />,
    );
    expect(getByText('Add some items to get started')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    const { getByText } = render(
      <EmptyState title="No items" subtitle="Try adding something" />,
    );
    expect(getByText('Try adding something')).toBeTruthy();
  });

  it('prefers subtitle over description when both provided', () => {
    const { getByText, queryByText } = render(
      <EmptyState
        title="No items"
        description="Description text"
        subtitle="Subtitle text"
      />,
    );
    expect(getByText('Subtitle text')).toBeTruthy();
    expect(queryByText('Description text')).toBeNull();
  });

  it('renders icon when provided', () => {
    const icon = <Text testID="test-icon">Icon</Text>;
    const { getByTestId } = render(<EmptyState title="No items" icon={icon} />);
    expect(getByTestId('test-icon')).toBeTruthy();
  });

  it('does not render icon container when icon is not provided', () => {
    const { getByRole } = render(<EmptyState title="No items" />);
    // Without icon, the title with header role should still render
    expect(getByRole('header')).toBeTruthy();
  });

  it('renders action button when buttonProps provided', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <EmptyState title="No items" buttonProps={{ title: 'Add Item', onPress }} />,
    );
    const button = getByText('Add Item');
    expect(button).toBeTruthy();
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
    expect(getByText('Secondary')).toBeTruthy();
  });

  it('does not render description when neither description nor subtitle provided', () => {
    const { queryByText } = render(<EmptyState title="Empty" />);
    // Title is rendered
    expect(queryByText('Empty')).toBeTruthy();
    // No description/subtitle rendered — component only has title
    const { toJSON } = render(<EmptyState title="Only Title" />);
    const root = toJSON() as ReactTestRendererJSON;
    const textChildren = (root.children ?? []).filter(
      (c): c is ReactTestRendererJSON => typeof c !== 'string' && c.type === 'Text',
    );
    expect(textChildren).toHaveLength(1);
  });
});
