/**
 * Accessibility tests for the Button component.
 * Verifies role, label, and disabled/loading state props exposed to screen readers.
 */

import { render, screen } from '@testing-library/react-native';
import Button from '../../../src/components/ui/Button';

// ---------------------------------------------------------------------------
// accessibilityRole
// ---------------------------------------------------------------------------

describe('Button accessibilityRole', () => {
  it('has accessibilityRole "button" by default', () => {
    render(<Button title="Continue" onPress={jest.fn()} />);
    screen.getByRole('button');
  });

  it('has accessibilityRole "link" when specified', () => {
    render(<Button title="Open Portal" onPress={jest.fn()} accessibilityRole="link" />);
    screen.getByRole('link');
  });

  it('has accessibilityRole "tab" when specified', () => {
    render(<Button title="Tab Item" onPress={jest.fn()} accessibilityRole="tab" />);
    screen.getByRole('tab');
  });
});

// ---------------------------------------------------------------------------
// accessibilityLabel
// ---------------------------------------------------------------------------

describe('Button accessibilityLabel', () => {
  it('defaults to the title text when no accessibilityLabel is provided', () => {
    render(<Button title="Save Profile" onPress={jest.fn()} />);
    screen.getByLabelText('Save Profile');
  });

  it('uses custom accessibilityLabel when provided', () => {
    render(
      <Button
        title="Submit"
        onPress={jest.fn()}
        accessibilityLabel="Submit customs declaration form"
      />
    );
    screen.getByLabelText('Submit customs declaration form');
  });

  it('custom label takes precedence over title', () => {
    render(
      <Button
        title="Go"
        onPress={jest.fn()}
        accessibilityLabel="Navigate to next step"
      />
    );
    // Custom label present
    screen.getByLabelText('Navigate to next step');
    // Title-based label should NOT be the label (title 'Go' is not the a11y label)
    expect(screen.queryByLabelText('Go')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// accessibilityState — disabled
// ---------------------------------------------------------------------------

describe('Button accessibilityState.disabled', () => {
  it('accessibilityState.disabled is false when not disabled', () => {
    render(<Button title="Scan Passport" onPress={jest.fn()} />);
    const btn = screen.getByRole('button');
    expect(btn.props.accessibilityState?.disabled).toBe(false);
  });

  it('accessibilityState.disabled is true when disabled prop is set', () => {
    render(<Button title="Scan Passport" onPress={jest.fn()} disabled />);
    const btn = screen.getByRole('button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('accessibilityState.disabled is false when only loading (busy, not disabled)', () => {
    // When loading, the button is busy but not semantically disabled.
    // Screen readers announce "dimmed" via the busy state instead.
    render(<Button title="Saving…" onPress={jest.fn()} loading />);
    const btn = screen.getByRole('button');
    expect(btn.props.accessibilityState?.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// accessibilityState — busy (loading)
// ---------------------------------------------------------------------------

describe('Button accessibilityState.busy', () => {
  it('accessibilityState.busy is false when not loading', () => {
    render(<Button title="Save" onPress={jest.fn()} />);
    const btn = screen.getByRole('button');
    expect(btn.props.accessibilityState?.busy).toBe(false);
  });

  it('accessibilityState.busy is true when loading', () => {
    render(<Button title="Saving…" onPress={jest.fn()} loading />);
    const btn = screen.getByRole('button');
    expect(btn.props.accessibilityState?.busy).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// accessible prop
// ---------------------------------------------------------------------------

describe('Button accessible prop', () => {
  it('has accessible={true} so the element is reachable by screen readers', () => {
    render(<Button title="Next" onPress={jest.fn()} />);
    const btn = screen.getByRole('button');
    expect(btn.props.accessible).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// accessibilityHint
// ---------------------------------------------------------------------------

describe('Button accessibilityHint', () => {
  it('passes accessibilityHint to the Pressable', () => {
    render(
      <Button
        title="Scan"
        onPress={jest.fn()}
        accessibilityHint="Opens the camera to scan your passport"
      />
    );
    const btn = screen.getByRole('button');
    expect(btn.props.accessibilityHint).toBe('Opens the camera to scan your passport');
  });

  it('does not set accessibilityHint when not provided', () => {
    render(<Button title="Scan" onPress={jest.fn()} />);
    const btn = screen.getByRole('button');
    expect(btn.props.accessibilityHint).toBeUndefined();
  });
});
