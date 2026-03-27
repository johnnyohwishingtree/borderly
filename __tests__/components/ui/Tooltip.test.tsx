/**
 * Tests for Tooltip component.
 * Covers: rendering trigger, tooltip content, variants, a11y.
 */
import { render } from '@testing-library/react-native';
import { Text, Modal } from 'react-native';
import Tooltip from '../../../src/components/ui/Tooltip';

describe('Tooltip', () => {
  it('renders trigger children', () => {
    const { getByText } = render(
      <Tooltip content="Help text">
        <Text>Trigger</Text>
      </Tooltip>,
    );
    expect(getByText('Trigger')).toBeTruthy();
  });

  it('sets accessibility label on trigger', () => {
    const { getByLabelText } = render(
      <Tooltip content="Help text">
        <Text>Trigger</Text>
      </Tooltip>,
    );
    expect(getByLabelText('Show tooltip: Help text')).toBeTruthy();
  });

  it('has button accessibility role on trigger', () => {
    const { getByLabelText } = render(
      <Tooltip content="Help text">
        <Text>Trigger</Text>
      </Tooltip>,
    );
    const triggerEl = getByLabelText('Show tooltip: Help text');
    expect(triggerEl.props.accessibilityRole).toBe('button');
  });

  it('renders tooltip content text in modal', () => {
    const { getByText } = render(
      <Tooltip content="Tooltip message">
        <Text>Trigger</Text>
      </Tooltip>,
    );
    // Content is rendered in the Modal (even when not visible)
    expect(getByText('Tooltip message')).toBeTruthy();
  });

  it('starts with modal not visible', () => {
    const { UNSAFE_getByType } = render(
      <Tooltip content="Help">
        <Text>Trigger</Text>
      </Tooltip>,
    );
    const modal = UNSAFE_getByType(Modal);
    expect(modal.props.visible).toBe(false);
  });

  it('sets accessibility hint for tap trigger', () => {
    const { getByLabelText } = render(
      <Tooltip content="Help" trigger="tap">
        <Text>Trigger</Text>
      </Tooltip>,
    );
    const trigger = getByLabelText('Show tooltip: Help');
    expect(trigger.props.accessibilityHint).toBe('Tap to show tooltip');
  });

  it('sets accessibility hint for longPress trigger', () => {
    const { getByLabelText } = render(
      <Tooltip content="Help" trigger="longPress">
        <Text>Trigger</Text>
      </Tooltip>,
    );
    const trigger = getByLabelText('Show tooltip: Help');
    expect(trigger.props.accessibilityHint).toBe('Long press to show tooltip');
  });

  it('renders different variants without crashing', () => {
    const variants = ['default', 'info', 'warning', 'error'] as const;
    variants.forEach((variant) => {
      const { getByText } = render(
        <Tooltip content={`${variant} tooltip`} variant={variant}>
          <Text>Trigger</Text>
        </Tooltip>,
      );
      expect(getByText(`${variant} tooltip`)).toBeTruthy();
    });
  });
});
