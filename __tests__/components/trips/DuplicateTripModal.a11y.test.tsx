/**
 * Accessibility tests for DuplicateTripModal.
 *
 * Verifies that the modal and its interactive elements expose correct
 * accessibility roles, labels, and live regions to screen readers
 * (VoiceOver on iOS, TalkBack on Android).
 */

import { render, screen } from '@testing-library/react-native';
import DuplicateTripModal from '../../../src/components/trips/DuplicateTripModal';

// ---------------------------------------------------------------------------
// Mock DatePickerField — native date picker not needed for a11y tests
// ---------------------------------------------------------------------------

jest.mock('@/components/ui', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    DatePickerField: ({
      label,
      testID,
      required,
    }: {
      label?: string;
      testID?: string;
      required?: boolean;
    }) => (
      <TouchableOpacity
        testID={testID}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label} date picker${required ? ', required' : ''}` : 'Date picker'}
      >
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
  };
});

// ---------------------------------------------------------------------------
// Mock useAccessibilityFocus — not needed in unit tests
// ---------------------------------------------------------------------------

jest.mock('@/hooks/useAccessibilityFocus', () => ({
  useAccessibilityFocus: () => ({ ref: { current: null } }),
}));

// ---------------------------------------------------------------------------
// Default props
// ---------------------------------------------------------------------------

const DEFAULT_PROPS = {
  visible: true,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  loading: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Modal renders
// ---------------------------------------------------------------------------

describe('DuplicateTripModal — renders', () => {
  it('renders when visible=true', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} />);
    screen.getByTestId('duplicate-trip-modal');
  });

  it('does not crash when visible=false', () => {
    const { toJSON } = render(
      <DuplicateTripModal {...DEFAULT_PROPS} visible={false} />,
    );
    // Modal renders its children regardless (React Native Modal controls visibility)
    expect(toJSON()).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Title — accessibilityRole="header"
// ---------------------------------------------------------------------------

describe('DuplicateTripModal — title heading', () => {
  it('renders "Duplicate Trip" title with accessibilityRole="header"', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} />);
    const title = screen.getByTestId('duplicate-trip-modal-title');
    expect(title.props.accessibilityRole).toBe('header');
  });

  it('title text is "Duplicate Trip"', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} />);
    screen.getByText('Duplicate Trip');
  });
});

// ---------------------------------------------------------------------------
// Cancel button
// ---------------------------------------------------------------------------

describe('DuplicateTripModal — Cancel button', () => {
  it('has accessibilityRole="button"', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} />);
    const cancel = screen.getByTestId('duplicate-trip-modal-cancel');
    expect(cancel.props.accessibilityRole).toBe('button');
  });

  it('has accessibilityLabel="Cancel duplicate trip"', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} />);
    const cancel = screen.getByTestId('duplicate-trip-modal-cancel');
    expect(cancel.props.accessibilityLabel).toBe('Cancel duplicate trip');
  });

  it('is not disabled when loading=false', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} loading={false} />);
    const cancel = screen.getByTestId('duplicate-trip-modal-cancel');
    expect(cancel.props.accessibilityState?.disabled).not.toBe(true);
  });

  it('is disabled when loading=true', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} loading={true} />);
    const cancel = screen.getByTestId('duplicate-trip-modal-cancel');
    expect(cancel.props.accessibilityState?.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Confirm / Duplicate button
// ---------------------------------------------------------------------------

describe('DuplicateTripModal — Confirm (Duplicate) button', () => {
  it('has accessibilityRole="button"', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} />);
    const confirm = screen.getByTestId('duplicate-trip-modal-confirm');
    expect(confirm.props.accessibilityRole).toBe('button');
  });

  it('has accessibilityLabel="Confirm duplicate trip"', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} />);
    const confirm = screen.getByTestId('duplicate-trip-modal-confirm');
    expect(confirm.props.accessibilityLabel).toBe('Confirm duplicate trip');
  });

  it('is not disabled when loading=false', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} loading={false} />);
    const confirm = screen.getByTestId('duplicate-trip-modal-confirm');
    expect(confirm.props.accessibilityState?.disabled).not.toBe(true);
  });

  it('is disabled when loading=true', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} loading={true} />);
    const confirm = screen.getByTestId('duplicate-trip-modal-confirm');
    expect(confirm.props.accessibilityState?.disabled).toBe(true);
  });

  it('shows loading indicator when loading=true', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} loading={true} />);
    screen.getByTestId('duplicate-trip-loading-indicator');
  });
});

// ---------------------------------------------------------------------------
// Date picker field
// ---------------------------------------------------------------------------

describe('DuplicateTripModal — date picker accessibility', () => {
  it('renders DatePickerField with testID "duplicate-trip-departure-date"', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} />);
    screen.getByTestId('duplicate-trip-departure-date');
  });

  it('DatePickerField has accessibilityRole="button"', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} />);
    const picker = screen.getByTestId('duplicate-trip-departure-date');
    expect(picker.props.accessibilityRole).toBe('button');
  });

  it('DatePickerField label mentions departure date', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} />);
    const picker = screen.getByTestId('duplicate-trip-departure-date');
    expect(picker.props.accessibilityLabel).toMatch(/departure date/i);
  });
});

// ---------------------------------------------------------------------------
// Error live region
// ---------------------------------------------------------------------------

describe('DuplicateTripModal — error live region', () => {
  it('does not render the error region when error is null', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} error={null} />);
    expect(screen.queryByTestId('duplicate-trip-modal-error')).toBeNull();
  });

  it('renders the error region when error is provided', () => {
    render(
      <DuplicateTripModal {...DEFAULT_PROPS} error="Something went wrong" />,
    );
    screen.getByTestId('duplicate-trip-modal-error');
  });

  it('error region has accessibilityLiveRegion="polite"', () => {
    render(
      <DuplicateTripModal {...DEFAULT_PROPS} error="Failed to duplicate trip" />,
    );
    const errorView = screen.getByTestId('duplicate-trip-modal-error');
    expect(errorView.props.accessibilityLiveRegion).toBe('polite');
  });

  it('error region has accessibilityRole="text"', () => {
    render(
      <DuplicateTripModal {...DEFAULT_PROPS} error="Network error" />,
    );
    const errorView = screen.getByTestId('duplicate-trip-modal-error');
    expect(errorView.props.accessibilityRole).toBe('text');
  });

  it('error message text is rendered inside the error region', () => {
    const errorMsg = 'Please try again';
    render(<DuplicateTripModal {...DEFAULT_PROPS} error={errorMsg} />);
    screen.getByText(errorMsg);
  });
});

// ---------------------------------------------------------------------------
// Custom testID
// ---------------------------------------------------------------------------

describe('DuplicateTripModal — custom testID', () => {
  it('uses custom testID when provided', () => {
    render(
      <DuplicateTripModal {...DEFAULT_PROPS} testID="my-duplicate-modal" />,
    );
    screen.getByTestId('my-duplicate-modal');
  });

  it('defaults to "duplicate-trip-modal" when testID not provided', () => {
    render(<DuplicateTripModal {...DEFAULT_PROPS} />);
    screen.getByTestId('duplicate-trip-modal');
  });
});
