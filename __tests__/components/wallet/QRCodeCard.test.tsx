/**
 * Tests for QRCodeCard component.
 * Covers: label/date rendering, type badge for each type, onPress, onLongPress,
 * compact mode, traveler info badge.
 */
import { render, fireEvent } from '@testing-library/react-native';
import { QRCodeCard } from '../../../src/components/wallet/QRCodeCard';

jest.mock('../../../src/components/ui', () => {
  const { View } = require('react-native');
  return {
    Card: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});

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

describe('QRCodeCard', () => {
  // ─── Label and date rendering ─────────────────────────────────────────────

  it('renders label from qrCode prop', () => {
    const qr = makeQRCode();
    const { getByText } = render(<QRCodeCard qrCode={qr as any} />);
    expect(getByText('Japan Immigration')).toBeTruthy();
  });

  it('renders formatted date from qrCode prop', () => {
    const qr = makeQRCode();
    const { getByText } = render(<QRCodeCard qrCode={qr as any} />);
    // Date format: "Saved Mar 20, 10:00 AM" (locale-dependent, check partial match)
    expect(getByText(/Mar 20/)).toBeTruthy();
  });

  // ─── Type badge for each type ─────────────────────────────────────────────

  it.each([
    ['immigration', 'Immigration'],
    ['customs', 'Customs'],
    ['health', 'Health'],
    ['combined', 'Combined'],
  ] as const)('renders correct type badge for %s', (type, expectedLabel) => {
    const qr = makeQRCode({ type });
    const { getByText } = render(<QRCodeCard qrCode={qr as any} />);
    expect(getByText(expectedLabel)).toBeTruthy();
  });

  // ─── Press callbacks ──────────────────────────────────────────────────────

  it('calls onPress with qrCode when pressed', () => {
    const onPress = jest.fn();
    const qr = makeQRCode();
    const { getByLabelText } = render(
      <QRCodeCard qrCode={qr as any} onPress={onPress} />,
    );
    fireEvent.press(getByLabelText('Japan Immigration'));
    expect(onPress).toHaveBeenCalledWith(qr);
  });

  it('calls onLongPress with qrCode on long press', () => {
    const onLongPress = jest.fn();
    const qr = makeQRCode();
    const { getByLabelText } = render(
      <QRCodeCard qrCode={qr as any} onLongPress={onLongPress} />,
    );
    fireEvent(getByLabelText('Japan Immigration'), 'onLongPress');
    expect(onLongPress).toHaveBeenCalledWith(qr);
  });

  // ─── Compact mode ────────────────────────────────────────────────────────

  it('renders compact layout when compact=true', () => {
    const qr = makeQRCode();
    const { getByText, getByLabelText } = render(
      <QRCodeCard qrCode={qr as any} compact />,
    );
    expect(getByText('Japan Immigration')).toBeTruthy();
    expect(getByLabelText('Japan Immigration').props.accessibilityHint).toBe(
      'Opens QR code full screen',
    );
  });

  it('renders non-compact layout by default', () => {
    const qr = makeQRCode();
    const { getByLabelText } = render(
      <QRCodeCard qrCode={qr as any} />,
    );
    expect(getByLabelText('Japan Immigration').props.accessibilityHint).toBe(
      'Tap to view full screen, long press for options',
    );
  });

  // ─── Traveler info ───────────────────────────────────────────────────────

  it('shows traveler name when showTravelerInfo=true and travelerName provided', () => {
    const qr = makeQRCode();
    const { getByText } = render(
      <QRCodeCard qrCode={qr as any} showTravelerInfo travelerName="Alice" />,
    );
    expect(getByText('Alice')).toBeTruthy();
  });

  it('does not show traveler name when showTravelerInfo=false', () => {
    const qr = makeQRCode();
    const { queryByText } = render(
      <QRCodeCard qrCode={qr as any} travelerName="Alice" />,
    );
    expect(queryByText('Alice')).toBeNull();
  });
});
