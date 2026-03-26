/**
 * Tests for ContextualHelp component.
 * Covers: variants (icon, text, minimal), modal open/close, content display,
 * tips list, action links, and accessibility.
 */
import { render, fireEvent } from '@testing-library/react-native';
import ContextualHelp from '../../../src/components/help/ContextualHelp';

jest.mock('lucide-react-native', () => ({
  CircleHelp: 'CircleHelp',
  X: 'X',
}));

jest.mock('@/components/ui', () => {
  const { TouchableOpacity, Text, View } = require('react-native');
  return {
    Button: ({ title, onPress, ...props }: any) => (
      <TouchableOpacity onPress={onPress} testID={props.testID}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    Card: ({ children }: any) => <View>{children}</View>,
    StatusBadge: ({ text }: any) => <Text>{text}</Text>,
  };
});

const baseContent = {
  title: 'Test Help',
  description: 'This is a test description.',
};

const fullContent = {
  title: 'Full Help',
  description: 'Full description with tips and links.',
  tips: ['Tip one', 'Tip two', 'Tip three'],
  links: [
    { title: 'Link A', action: jest.fn() },
    { title: 'Link B', action: jest.fn() },
  ],
};

describe('ContextualHelp', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fullContent.links[0].action.mockClear();
    fullContent.links[1].action.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── Variant rendering ────────────────────────────────────────────────────

  it('renders icon variant (default)', () => {
    const { getByLabelText } = render(
      <ContextualHelp content={baseContent} />,
    );
    expect(getByLabelText('Get help')).toBeTruthy();
  });

  it('renders text variant with "Help" label', () => {
    const { getByText, getByLabelText } = render(
      <ContextualHelp content={baseContent} variant="text" />,
    );
    expect(getByText('Help')).toBeTruthy();
    expect(getByLabelText('Get help')).toBeTruthy();
  });

  it('renders minimal variant', () => {
    const { getByLabelText } = render(
      <ContextualHelp content={baseContent} variant="minimal" />,
    );
    expect(getByLabelText('Get help')).toBeTruthy();
  });

  // ─── Modal open/close ─────────────────────────────────────────────────────

  it('opens modal when trigger is pressed', () => {
    const { getByLabelText, getByText } = render(
      <ContextualHelp content={baseContent} />,
    );
    fireEvent.press(getByLabelText('Get help'));
    expect(getByText('Test Help')).toBeTruthy();
    expect(getByText('This is a test description.')).toBeTruthy();
  });

  it('closes modal when X button is pressed', () => {
    const { getByLabelText, UNSAFE_getByType } = render(
      <ContextualHelp content={baseContent} />,
    );
    const { Modal } = require('react-native');
    fireEvent.press(getByLabelText('Get help'));
    expect(UNSAFE_getByType(Modal).props.visible).toBe(true);

    fireEvent.press(getByLabelText('Close help'));
    expect(UNSAFE_getByType(Modal).props.visible).toBe(false);
  });

  it('closes modal when "Got it!" button is pressed', () => {
    const { getByLabelText, getByText, UNSAFE_getByType } = render(
      <ContextualHelp content={baseContent} />,
    );
    const { Modal } = require('react-native');
    fireEvent.press(getByLabelText('Get help'));
    expect(UNSAFE_getByType(Modal).props.visible).toBe(true);

    fireEvent.press(getByText('Got it!'));
    expect(UNSAFE_getByType(Modal).props.visible).toBe(false);
  });

  // ─── Content display ──────────────────────────────────────────────────────

  it('displays title and description in the modal', () => {
    const { getByLabelText, getByText } = render(
      <ContextualHelp content={fullContent} />,
    );
    fireEvent.press(getByLabelText('Get help'));
    expect(getByText('Full Help')).toBeTruthy();
    expect(getByText('Full description with tips and links.')).toBeTruthy();
  });

  it('renders tips list', () => {
    const { getByLabelText, getByText } = render(
      <ContextualHelp content={fullContent} />,
    );
    fireEvent.press(getByLabelText('Get help'));
    expect(getByText('Tip one')).toBeTruthy();
    expect(getByText('Tip two')).toBeTruthy();
    expect(getByText('Tip three')).toBeTruthy();
  });

  it('renders action links', () => {
    const { getByLabelText, getByText } = render(
      <ContextualHelp content={fullContent} />,
    );
    fireEvent.press(getByLabelText('Get help'));
    expect(getByText('Link A')).toBeTruthy();
    expect(getByText('Link B')).toBeTruthy();
  });

  it('fires action link callback on press (with delay)', () => {
    const { getByLabelText, getByText } = render(
      <ContextualHelp content={fullContent} />,
    );
    fireEvent.press(getByLabelText('Get help'));
    fireEvent.press(getByText('Link A'));

    // Action is called after a 150ms delay
    expect(fullContent.links[0].action).not.toHaveBeenCalled();
    jest.advanceTimersByTime(150);
    expect(fullContent.links[0].action).toHaveBeenCalledTimes(1);
  });

  it('does not render tips section when tips are absent', () => {
    const { getByLabelText, queryByText } = render(
      <ContextualHelp content={baseContent} />,
    );
    fireEvent.press(getByLabelText('Get help'));
    expect(queryByText('Quick Tips:')).toBeNull();
  });

  it('does not render links section when links are absent', () => {
    const { getByLabelText, queryByText } = render(
      <ContextualHelp content={baseContent} />,
    );
    fireEvent.press(getByLabelText('Get help'));
    expect(queryByText('Link A')).toBeNull();
  });

  // ─── Accessibility ────────────────────────────────────────────────────────

  it('trigger has correct accessibilityHint', () => {
    const { getByLabelText } = render(
      <ContextualHelp content={baseContent} />,
    );
    const trigger = getByLabelText('Get help');
    expect(trigger.props.accessibilityHint).toBe('Learn more about Test Help');
  });
});
