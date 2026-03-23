/**
 * Tests for the DuplicateTripModal component.
 *
 * Verifies rendering, user interaction (cancel, confirm), validation,
 * loading state, and error display.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import DuplicateTripModal from '../../../src/components/trips/DuplicateTripModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_PROPS: React.ComponentProps<typeof DuplicateTripModal> = {
  visible: true,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  loading: false,
  error: null,
};

function renderModal(overrides?: Partial<React.ComponentProps<typeof DuplicateTripModal>>) {
  return render(<DuplicateTripModal {...DEFAULT_PROPS} {...overrides} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('DuplicateTripModal — rendering', () => {
  it('renders the modal with default testID', () => {
    renderModal();
    expect(screen.getByTestId('duplicate-trip-modal')).toBeTruthy();
  });

  it('renders the modal with a custom testID', () => {
    renderModal({ testID: 'custom-id' });
    expect(screen.getByTestId('custom-id')).toBeTruthy();
  });

  it('renders the title', () => {
    renderModal();
    expect(screen.getByTestId('duplicate-trip-modal-title')).toBeTruthy();
  });

  it('renders the cancel button', () => {
    renderModal();
    expect(screen.getByTestId('duplicate-trip-modal-cancel')).toBeTruthy();
  });

  it('renders the confirm button', () => {
    renderModal();
    expect(screen.getByTestId('duplicate-trip-modal-confirm')).toBeTruthy();
  });

  it('renders the departure date picker', () => {
    renderModal();
    expect(screen.getByTestId('duplicate-trip-departure-date')).toBeTruthy();
  });

  it('does not show error section when error is null', () => {
    renderModal({ error: null });
    expect(screen.queryByTestId('duplicate-trip-modal-error')).toBeNull();
  });

  it('shows error section when error is provided', () => {
    renderModal({ error: 'Something went wrong' });
    expect(screen.getByTestId('duplicate-trip-modal-error')).toBeTruthy();
  });

  it('displays the error message text', () => {
    renderModal({ error: 'Failed to duplicate' });
    expect(screen.getByText('Failed to duplicate')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('DuplicateTripModal — loading state', () => {
  it('shows loading indicator when loading is true', () => {
    renderModal({ loading: true });
    expect(screen.getByTestId('duplicate-trip-loading-indicator')).toBeTruthy();
  });

  it('does not show loading indicator when loading is false', () => {
    renderModal({ loading: false });
    expect(screen.queryByTestId('duplicate-trip-loading-indicator')).toBeNull();
  });

  it('disables cancel button when loading', () => {
    renderModal({ loading: true });
    const cancelBtn = screen.getByTestId('duplicate-trip-modal-cancel');
    expect(cancelBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('disables confirm button when loading', () => {
    renderModal({ loading: true });
    const confirmBtn = screen.getByTestId('duplicate-trip-modal-confirm');
    expect(confirmBtn.props.accessibilityState?.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

describe('DuplicateTripModal — interactions', () => {
  it('calls onClose when cancel is pressed', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.press(screen.getByTestId('duplicate-trip-modal-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onConfirm when confirm is pressed without a date', () => {
    const onConfirm = jest.fn();
    renderModal({ onConfirm });
    fireEvent.press(screen.getByTestId('duplicate-trip-modal-confirm'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows a validation error when confirm is pressed without a date', () => {
    renderModal();
    fireEvent.press(screen.getByTestId('duplicate-trip-modal-confirm'));
    expect(screen.getByText('Please select a new departure date')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('DuplicateTripModal — accessibility', () => {
  it('cancel button has accessibilityRole button', () => {
    renderModal();
    const btn = screen.getByTestId('duplicate-trip-modal-cancel');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('cancel button has an accessibilityLabel', () => {
    renderModal();
    const btn = screen.getByTestId('duplicate-trip-modal-cancel');
    expect(btn.props.accessibilityLabel).toBeTruthy();
  });

  it('confirm button has accessibilityRole button', () => {
    renderModal();
    const btn = screen.getByTestId('duplicate-trip-modal-confirm');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('confirm button has an accessibilityLabel', () => {
    renderModal();
    const btn = screen.getByTestId('duplicate-trip-modal-confirm');
    expect(btn.props.accessibilityLabel).toBeTruthy();
  });

  it('title has accessibilityRole header', () => {
    renderModal();
    const title = screen.getByTestId('duplicate-trip-modal-title');
    expect(title.props.accessibilityRole).toBe('header');
  });

  it('error region has accessibilityLiveRegion polite', () => {
    renderModal({ error: 'Something failed' });
    const errorRegion = screen.getByTestId('duplicate-trip-modal-error');
    expect(errorRegion.props.accessibilityLiveRegion).toBe('polite');
  });

  it('error region has accessibilityRole text', () => {
    renderModal({ error: 'Something failed' });
    const errorRegion = screen.getByTestId('duplicate-trip-modal-error');
    expect(errorRegion.props.accessibilityRole).toBe('text');
  });
});
