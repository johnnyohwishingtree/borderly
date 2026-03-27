/**
 * Tests for InfoBanner component.
 * Covers: rendering message, dismiss callback, accessibility.
 */
import { render, fireEvent } from '@testing-library/react-native';
import { ReactTestRendererJSON } from 'react-test-renderer';
import InfoBanner from '../../../src/components/ui/InfoBanner';

describe('InfoBanner', () => {
  it('renders message text', () => {
    const { getByText } = render(
      <InfoBanner message="New feature available" onDismiss={jest.fn()} />,
    );
    expect(getByText(/New feature available/)).toBeTruthy();
  });

  it('calls onDismiss when close button is pressed', () => {
    const onDismiss = jest.fn();
    const { getByLabelText } = render(
      <InfoBanner message="Info" onDismiss={onDismiss} />,
    );
    fireEvent.press(getByLabelText('Dismiss banner'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('has alert accessibility role', () => {
    const { toJSON } = render(
      <InfoBanner message="Info" onDismiss={jest.fn()} />,
    );
    expect((toJSON() as ReactTestRendererJSON).props.accessibilityRole).toBe('alert');
  });

  it('applies testID to container', () => {
    const { getByTestId } = render(
      <InfoBanner message="Info" onDismiss={jest.fn()} testID="banner" />,
    );
    expect(getByTestId('banner')).toBeTruthy();
  });

  it('applies testID to dismiss button', () => {
    const { getByTestId } = render(
      <InfoBanner message="Info" onDismiss={jest.fn()} testID="banner" />,
    );
    expect(getByTestId('banner-dismiss')).toBeTruthy();
  });

  it('sets accessibility label on container to message', () => {
    const { getByLabelText } = render(
      <InfoBanner message="Update ready" onDismiss={jest.fn()} />,
    );
    expect(getByLabelText('Update ready')).toBeTruthy();
  });
});
