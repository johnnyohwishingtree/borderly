/**
 * Tests for QRFullScreen component.
 * Covers: modal visibility, content with qrCode, null qrCode, close button,
 * delete confirmation alert, onDelete callback.
 */
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QRFullScreen } from '../../../src/components/wallet/QRFullScreen';

jest.mock('lucide-react-native', () => ({
  X: 'X',
  Trash2: 'Trash2',
}));

jest.mock('../../../src/services/storage/models', () => ({}));

jest.mock('@nozbe/watermelondb', () => ({
  Model: class {},
}));

jest.mock('@nozbe/watermelondb/decorators', () => ({
  field: () => () => {},
  date: () => () => {},
  readonly: () => () => {},
  children: () => () => {},
  relation: () => () => {},
}));

function makeQRCode(overrides: Record<string, unknown> = {}) {
  return {
    id: 'qr-1',
    label: 'Japan Immigration',
    type: 'immigration' as const,
    qrData: 'test-qr-data',
    imageBase64: 'dGVzdA==',
    savedAt: new Date('2026-03-20T10:00:00Z'),
    travelerId: null,
    legId: 'leg-1',
    ...overrides,
  };
}

describe('QRFullScreen', () => {
  const originalAlert = Alert.alert;

  beforeEach(() => {
    Alert.alert = jest.fn();
  });

  afterEach(() => {
    Alert.alert = originalAlert;
  });

  // ─── Modal visibility ────────────────────────────────────────────────────

  it('renders modal with qrCode content when visible', () => {
    const qr = makeQRCode();
    const { getByText } = render(
      <QRFullScreen qrCode={qr as any} visible={true} onClose={jest.fn()} />,
    );
    getByText('Japan Immigration');
    getByText('Immigration');
  });

  it('passes visible=false to Modal when not visible', () => {
    const qr = makeQRCode();
    const { UNSAFE_getByType } = render(
      <QRFullScreen qrCode={qr as any} visible={false} onClose={jest.fn()} />,
    );
    const { Modal } = require('react-native');
    expect(UNSAFE_getByType(Modal).props.visible).toBe(false);
  });

  // ─── Null qrCode ─────────────────────────────────────────────────────────

  it('returns null when qrCode is null', () => {
    const { toJSON } = render(
      <QRFullScreen qrCode={null} visible={true} onClose={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  // ─── Close button ────────────────────────────────────────────────────────

  it('calls onClose when close button pressed', () => {
    const onClose = jest.fn();
    const qr = makeQRCode();
    const { getByLabelText } = render(
      <QRFullScreen qrCode={qr as any} visible={true} onClose={onClose} />,
    );
    fireEvent.press(getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ─── Delete confirmation ─────────────────────────────────────────────────

  it('shows delete confirmation alert on delete press', () => {
    const qr = makeQRCode();
    const { getByLabelText } = render(
      <QRFullScreen
        qrCode={qr as any}
        visible={true}
        onClose={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Delete QR code'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete QR Code',
      expect.stringContaining('Japan Immigration'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Delete', style: 'destructive' }),
      ]),
    );
  });

  it('calls onDelete after confirmation', () => {
    const onDelete = jest.fn();
    const onClose = jest.fn();
    const qr = makeQRCode();
    const { getByLabelText } = render(
      <QRFullScreen
        qrCode={qr as any}
        visible={true}
        onClose={onClose}
        onDelete={onDelete}
      />,
    );
    fireEvent.press(getByLabelText('Delete QR code'));

    // Get the Delete button callback from Alert.alert and invoke it
    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const buttons = alertCalls[0][2];
    const deleteButton = buttons.find((b: any) => b.text === 'Delete');
    deleteButton.onPress();

    expect(onDelete).toHaveBeenCalledWith(qr);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not show delete button when onDelete is not provided', () => {
    const qr = makeQRCode();
    const { queryByLabelText } = render(
      <QRFullScreen qrCode={qr as any} visible={true} onClose={jest.fn()} />,
    );
    expect(queryByLabelText('Delete QR code')).toBeNull();
  });

  // ─── Content display ─────────────────────────────────────────────────────

  it('renders label and formatted date', () => {
    const qr = makeQRCode();
    const { getByText } = render(
      <QRFullScreen qrCode={qr as any} visible={true} onClose={jest.fn()} />,
    );
    getByText('Japan Immigration');
    getByText(/March 20, 2026/);
  });

  it('renders type label in header', () => {
    const qr = makeQRCode({ type: 'customs' });
    const { getByText } = render(
      <QRFullScreen qrCode={qr as any} visible={true} onClose={jest.fn()} />,
    );
    getByText('Customs');
  });
});
