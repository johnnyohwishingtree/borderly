/**
 * Tests for HelpHint component.
 * Covers: rendering, variants, dismissible, sizes, a11y.
 */
import { render, fireEvent } from '@testing-library/react-native';
import HelpHint from '../../../src/components/ui/HelpHint';

describe('HelpHint', () => {
  it('renders content text', () => {
    const { getByText } = render(
      <HelpHint content="Fill in all required fields" />,
    );
    expect(getByText('Fill in all required fields')).toBeTruthy();
  });

  it('renders title when provided', () => {
    const { getByText } = render(
      <HelpHint title="Tip" content="Use passport number" />,
    );
    expect(getByText('Tip')).toBeTruthy();
    expect(getByText('Use passport number')).toBeTruthy();
  });

  it('does not render title when not provided', () => {
    const { queryByText, getByText } = render(
      <HelpHint content="Just content" />,
    );
    expect(getByText('Just content')).toBeTruthy();
    // No title text element with font-semibold should exist
    expect(queryByText('Tip')).toBeNull();
  });

  it('renders dismiss button when dismissible with onDismiss', () => {
    const onDismiss = jest.fn();
    const { getByLabelText } = render(
      <HelpHint content="Info" dismissible onDismiss={onDismiss} />,
    );
    fireEvent.press(getByLabelText('Dismiss hint'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not render dismiss button when not dismissible', () => {
    const { queryByLabelText } = render(
      <HelpHint content="Info" />,
    );
    expect(queryByLabelText('Dismiss hint')).toBeNull();
  });

  it('renders info variant by default', () => {
    const { toJSON } = render(<HelpHint content="Info text" />);
    const json = JSON.stringify(toJSON());
    // Info variant uses blue styles
    expect(json).toContain('bg-blue-50');
  });

  it('renders warning variant', () => {
    const { toJSON } = render(
      <HelpHint content="Warning text" variant="warning" />,
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('bg-yellow-50');
  });

  it('renders success variant', () => {
    const { toJSON } = render(
      <HelpHint content="Success text" variant="success" />,
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('bg-green-50');
  });

  it('sets accessibility label from content', () => {
    const { toJSON } = render(<HelpHint content="Help text" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"accessibilityLabel":"Help text"');
  });

  it('sets accessibility label from title and content', () => {
    const { toJSON } = render(
      <HelpHint title="Note" content="Important info" />,
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"accessibilityLabel":"Note: Important info"');
  });
});
