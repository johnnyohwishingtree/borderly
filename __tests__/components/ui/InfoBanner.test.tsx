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
    getByText(/New feature available/);
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
    getByTestId('banner');
  });

  it('applies testID to dismiss button', () => {
    const { getByTestId } = render(
      <InfoBanner message="Info" onDismiss={jest.fn()} testID="banner" />,
    );
    getByTestId('banner-dismiss');
  });

  it('sets accessibility label on container to message', () => {
    const { getByLabelText } = render(
      <InfoBanner message="Update ready" onDismiss={jest.fn()} />,
    );
    getByLabelText('Update ready');
  });
});
