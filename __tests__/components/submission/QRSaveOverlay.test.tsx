import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { QRSaveOverlay } from '../../../src/components/submission/QRSaveOverlay';
import type { QRPageDetectedPayload } from '../../../src/components/submission/QRSaveOverlay';

const SAMPLE_PAYLOAD: QRPageDetectedPayload = {
  countryCode: 'JPN',
  qrImageBase64: 'data:image/png;base64,abc123',
  pageUrl: 'https://vjw-lp.digital.go.jp/en/complete',
};

describe('QRSaveOverlay', () => {
  const defaultProps = {
    payload: SAMPLE_PAYLOAD,
    onSave: jest.fn().mockResolvedValue(undefined),
    onDismiss: jest.fn(),
    onOpenWallet: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when payload is null', () => {
    const { toJSON } = render(
      <QRSaveOverlay
        payload={null}
        onSave={jest.fn()}
        onDismiss={jest.fn()}
        onOpenWallet={jest.fn()}
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the overlay when payload is provided', () => {
    const { getByTestId } = render(<QRSaveOverlay {...defaultProps} />);
    expect(getByTestId('qr-save-overlay')).toBeTruthy();
  });

  it('renders with the default testID', () => {
    const { getByTestId } = render(<QRSaveOverlay {...defaultProps} />);
    expect(getByTestId('qr-save-overlay')).toBeTruthy();
  });

  it('renders with a custom testID', () => {
    const { getByTestId } = render(
      <QRSaveOverlay {...defaultProps} testID="custom-overlay" />
    );
    expect(getByTestId('custom-overlay')).toBeTruthy();
  });

  it('shows QR Code Detected title in idle state', () => {
    const { getByTestId } = render(<QRSaveOverlay {...defaultProps} />);
    expect(getByTestId('qr-overlay-title').props.children).toBe('QR Code Detected');
  });

  it('shows QR image preview when qrImageBase64 is provided', () => {
    const { getByTestId } = render(<QRSaveOverlay {...defaultProps} />);
    expect(getByTestId('qr-overlay-preview')).toBeTruthy();
    expect(getByTestId('qr-overlay-image')).toBeTruthy();
  });

  it('hides QR image preview when qrImageBase64 is null', () => {
    const { queryByTestId } = render(
      <QRSaveOverlay
        {...defaultProps}
        payload={{ ...SAMPLE_PAYLOAD, qrImageBase64: null }}
      />
    );
    expect(queryByTestId('qr-overlay-preview')).toBeNull();
  });

  it('shows confirmation number when provided', () => {
    const { getByTestId } = render(
      <QRSaveOverlay
        {...defaultProps}
        payload={{ ...SAMPLE_PAYLOAD, confirmationNumber: 'REF-12345' }}
      />
    );
    expect(getByTestId('qr-overlay-confirmation')).toBeTruthy();
    expect(getByTestId('qr-overlay-ref-number').props.children).toBe('REF-12345');
  });

  it('hides confirmation number when not provided', () => {
    const { queryByTestId } = render(<QRSaveOverlay {...defaultProps} />);
    expect(queryByTestId('qr-overlay-confirmation')).toBeNull();
  });

  it('renders the Save QR to Wallet button', () => {
    const { getByTestId } = render(<QRSaveOverlay {...defaultProps} />);
    expect(getByTestId('qr-overlay-save-button')).toBeTruthy();
  });

  it('renders the Skip button', () => {
    const { getByTestId } = render(<QRSaveOverlay {...defaultProps} />);
    expect(getByTestId('qr-overlay-skip-button')).toBeTruthy();
  });

  it('renders the dismiss (X) button', () => {
    const { getByTestId } = render(<QRSaveOverlay {...defaultProps} />);
    expect(getByTestId('qr-overlay-dismiss')).toBeTruthy();
  });

  it('calls onDismiss when Skip is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <QRSaveOverlay {...defaultProps} onDismiss={onDismiss} />
    );
    fireEvent.press(getByTestId('qr-overlay-skip-button'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when X button is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <QRSaveOverlay {...defaultProps} onDismiss={onDismiss} />
    );
    fireEvent.press(getByTestId('qr-overlay-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with the qrImageBase64 when Save is pressed', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <QRSaveOverlay {...defaultProps} onSave={onSave} />
    );
    fireEvent.press(getByTestId('qr-overlay-save-button'));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('data:image/png;base64,abc123');
    });
  });

  it('calls onSave with null when payload has no qrImageBase64', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <QRSaveOverlay
        {...defaultProps}
        onSave={onSave}
        payload={{ ...SAMPLE_PAYLOAD, qrImageBase64: null }}
      />
    );
    fireEvent.press(getByTestId('qr-overlay-save-button'));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(null);
    });
  });

  it('shows QR Code Saved title after successful save', async () => {
    const { getByTestId } = render(<QRSaveOverlay {...defaultProps} />);
    fireEvent.press(getByTestId('qr-overlay-save-button'));
    await waitFor(() => {
      expect(getByTestId('qr-overlay-title').props.children).toBe('QR Code Saved!');
    });
  });

  it('shows Open QR Wallet button after successful save', async () => {
    const { getByTestId } = render(<QRSaveOverlay {...defaultProps} />);
    fireEvent.press(getByTestId('qr-overlay-save-button'));
    await waitFor(() => {
      expect(getByTestId('qr-overlay-open-wallet')).toBeTruthy();
    });
  });

  it('hides dismiss X button after successful save', async () => {
    const { getByTestId, queryByTestId } = render(
      <QRSaveOverlay {...defaultProps} />
    );
    fireEvent.press(getByTestId('qr-overlay-save-button'));
    // Wait for a positive indicator of saved state before checking absence
    await waitFor(() => {
      expect(getByTestId('qr-overlay-open-wallet')).toBeTruthy();
    });
    // In saved state, the dismiss X button must not be rendered
    expect(queryByTestId('qr-overlay-dismiss')).toBeNull();
  });

  it('calls onOpenWallet when Open QR Wallet is pressed', async () => {
    const onOpenWallet = jest.fn();
    const { getByTestId } = render(
      <QRSaveOverlay {...defaultProps} onOpenWallet={onOpenWallet} />
    );
    fireEvent.press(getByTestId('qr-overlay-save-button'));
    await waitFor(() => {
      expect(getByTestId('qr-overlay-open-wallet')).toBeTruthy();
    });
    fireEvent.press(getByTestId('qr-overlay-open-wallet'));
    expect(onOpenWallet).toHaveBeenCalledTimes(1);
  });

  it('shows error message when onSave rejects', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('Network error'));
    const { getByTestId } = render(
      <QRSaveOverlay {...defaultProps} onSave={onSave} />
    );
    fireEvent.press(getByTestId('qr-overlay-save-button'));
    await waitFor(() => {
      expect(getByTestId('qr-overlay-error')).toBeTruthy();
    });
  });

  it('shows Skip (Screenshot Manually) text in error state', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('Save failed'));
    const { getByTestId } = render(
      <QRSaveOverlay {...defaultProps} onSave={onSave} />
    );
    fireEvent.press(getByTestId('qr-overlay-save-button'));
    await waitFor(() => {
      const skipBtn = getByTestId('qr-overlay-skip-button');
      expect(skipBtn.props.children).toBeTruthy();
    });
  });

  it('resets state when a new payload arrives', async () => {
    const { getByTestId, rerender } = render(<QRSaveOverlay {...defaultProps} />);

    // Trigger an error state
    const failingOnSave = jest.fn().mockRejectedValue(new Error('Fail'));
    const propsWithError = { ...defaultProps, onSave: failingOnSave };
    rerender(<QRSaveOverlay {...propsWithError} />);
    fireEvent.press(getByTestId('qr-overlay-save-button'));
    await waitFor(() => {
      expect(getByTestId('qr-overlay-error')).toBeTruthy();
    });

    // Now reset with a new payload — should go back to idle
    const newPayload: QRPageDetectedPayload = {
      countryCode: 'MYS',
      qrImageBase64: null,
      pageUrl: 'https://mdac.gov.my/success',
    };
    const newOnSave = jest.fn().mockResolvedValue(undefined);
    rerender(
      <QRSaveOverlay
        {...defaultProps}
        payload={newPayload}
        onSave={newOnSave}
      />
    );
    // After new payload, error should be gone
    await waitFor(() => {
      expect(getByTestId('qr-overlay-title').props.children).toBe(
        'QR Code Detected'
      );
    });
  });

  it('shows the correct portal name for JPN', () => {
    const { getByTestId } = render(<QRSaveOverlay {...defaultProps} />);
    const subtitle = getByTestId('qr-overlay-subtitle');
    expect(subtitle.props.children).toContain('Visit Japan Web');
  });

  it('shows the correct portal name for MYS', () => {
    const { getByTestId } = render(
      <QRSaveOverlay
        {...defaultProps}
        payload={{ ...SAMPLE_PAYLOAD, countryCode: 'MYS' }}
      />
    );
    const subtitle = getByTestId('qr-overlay-subtitle');
    expect(subtitle.props.children).toContain('Malaysia MDAC');
  });

  it('shows the correct portal name for SGP', () => {
    const { getByTestId } = render(
      <QRSaveOverlay
        {...defaultProps}
        payload={{ ...SAMPLE_PAYLOAD, countryCode: 'SGP' }}
      />
    );
    const subtitle = getByTestId('qr-overlay-subtitle');
    expect(subtitle.props.children).toContain('SG Arrival Card');
  });

  it('does not call onSave again when already saving', async () => {
    let resolvePromise: (() => void) | undefined;
    const slowSave = jest.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePromise = resolve;
        })
    );
    const { getByTestId } = render(
      <QRSaveOverlay {...defaultProps} onSave={slowSave} />
    );

    // First press — begins saving
    fireEvent.press(getByTestId('qr-overlay-save-button'));

    // Wait for the saving state to be applied so the second press is blocked
    await waitFor(() => {
      // The button is disabled while saving (overlayState === 'saving')
      expect(slowSave).toHaveBeenCalledTimes(1);
    });

    // Second press while still saving — should be ignored
    fireEvent.press(getByTestId('qr-overlay-save-button'));

    // Resolve the pending save
    await act(async () => {
      resolvePromise?.();
    });

    // onSave must only have been called once
    expect(slowSave).toHaveBeenCalledTimes(1);
  });
});
