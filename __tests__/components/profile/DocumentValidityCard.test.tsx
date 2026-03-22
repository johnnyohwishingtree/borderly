/**
 * Unit tests for DocumentValidityCard and PassportExpiryBadge.
 *
 * Covers:
 * - computeDaysRemaining and computeExpiryStatus pure helpers
 * - DocumentValidityCard rendering (expiry date, status pill, country grid)
 * - Returns null when passportExpiry is absent
 * - Per-country valid/invalid logic
 */

import { render, screen } from '@testing-library/react-native';
import DocumentValidityCard from '../../../src/components/profile/DocumentValidityCard';
import {
  computeDaysRemaining,
  computeExpiryStatus,
} from '../../../src/components/profile/PassportExpiryBadge';

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/** Build a date that is `days` days from `base` (or today). Uses UTC to avoid timezone drift. */
function daysFrom(days: number, base: Date = new Date()): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

// -------------------------------------------------------------------------
// computeDaysRemaining
// -------------------------------------------------------------------------

describe('computeDaysRemaining', () => {
  it('returns 0 on the day of expiry', () => {
    const today = new Date('2026-06-01');
    expect(computeDaysRemaining('2026-06-01', today)).toBe(0);
  });

  it('returns positive days when passport is not yet expired', () => {
    const today = new Date('2026-06-01');
    expect(computeDaysRemaining('2026-06-10', today)).toBe(9);
  });

  it('returns negative days when passport is expired', () => {
    const today = new Date('2026-06-10');
    expect(computeDaysRemaining('2026-06-01', today)).toBe(-9);
  });

  it('returns 180 exactly on the boundary', () => {
    const today = new Date('2026-01-01');
    const expiry = toISO(daysFrom(180, today));
    expect(computeDaysRemaining(expiry, today)).toBe(180);
  });
});

// -------------------------------------------------------------------------
// computeExpiryStatus
// -------------------------------------------------------------------------

describe('computeExpiryStatus', () => {
  it('returns "valid" for 180+ days', () => {
    expect(computeExpiryStatus(180)).toBe('valid');
    expect(computeExpiryStatus(365)).toBe('valid');
  });

  it('returns "expiring-soon" for 30–179 days', () => {
    expect(computeExpiryStatus(179)).toBe('expiring-soon');
    expect(computeExpiryStatus(30)).toBe('expiring-soon');
  });

  it('returns "expired" for fewer than 30 days', () => {
    expect(computeExpiryStatus(29)).toBe('expired');
    expect(computeExpiryStatus(0)).toBe('expired');
    expect(computeExpiryStatus(-1)).toBe('expired');
  });
});

// -------------------------------------------------------------------------
// DocumentValidityCard — null when no passport data
// -------------------------------------------------------------------------

describe('DocumentValidityCard — null when no passport data', () => {
  it('returns null when passportExpiry is undefined', () => {
    const { toJSON } = render(
      <DocumentValidityCard passportExpiry={undefined} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('returns null when passportExpiry is null', () => {
    const { toJSON } = render(
      <DocumentValidityCard passportExpiry={null} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('returns null when passportExpiry is empty string', () => {
    const { toJSON } = render(
      <DocumentValidityCard passportExpiry="" />,
    );
    expect(toJSON()).toBeNull();
  });
});

// -------------------------------------------------------------------------
// DocumentValidityCard — renders section header
// -------------------------------------------------------------------------

describe('DocumentValidityCard — renders section header', () => {
  const today = new Date('2026-03-22');
  const expiryFuture = '2027-06-01'; // valid (400+ days out)

  it('renders "Document Validity" heading', () => {
    render(<DocumentValidityCard passportExpiry={expiryFuture} today={today} />);
    expect(screen.getByText('Document Validity')).toBeTruthy();
  });

  it('renders expiry date text', () => {
    render(<DocumentValidityCard passportExpiry={expiryFuture} today={today} />);
    expect(screen.getByText('June 1, 2027')).toBeTruthy();
  });

  it('renders the expiry badge with testID "expiry-badge"', () => {
    render(<DocumentValidityCard passportExpiry={expiryFuture} today={today} />);
    expect(screen.getByTestId('expiry-badge')).toBeTruthy();
  });
});

// -------------------------------------------------------------------------
// DocumentValidityCard — status pill colours
// -------------------------------------------------------------------------

describe('DocumentValidityCard — status pill labels', () => {
  const today = new Date('2026-03-22');

  it('shows "Valid" badge for 180+ days remaining', () => {
    const expiry = toISO(daysFrom(200, today));
    render(<DocumentValidityCard passportExpiry={expiry} today={today} />);
    const badge = screen.getByTestId('expiry-badge');
    expect(badge.props.accessibilityLabel).toMatch(/Valid/);
  });

  it('shows "Expiring Soon" badge for 30–179 days remaining', () => {
    const expiry = toISO(daysFrom(90, today));
    render(<DocumentValidityCard passportExpiry={expiry} today={today} />);
    const badge = screen.getByTestId('expiry-badge');
    expect(badge.props.accessibilityLabel).toMatch(/Expiring Soon/);
  });

  it('shows "Expired" badge for fewer than 30 days remaining', () => {
    const expiry = toISO(daysFrom(10, today));
    render(<DocumentValidityCard passportExpiry={expiry} today={today} />);
    const badge = screen.getByTestId('expiry-badge');
    expect(badge.props.accessibilityLabel).toMatch(/Expired/);
  });

  it('shows "Expired" badge for past dates', () => {
    const expiry = toISO(daysFrom(-30, today));
    render(<DocumentValidityCard passportExpiry={expiry} today={today} />);
    const badge = screen.getByTestId('expiry-badge');
    expect(badge.props.accessibilityLabel).toMatch(/Expired/);
  });
});

// -------------------------------------------------------------------------
// DocumentValidityCard — per-country validity grid
// -------------------------------------------------------------------------

describe('DocumentValidityCard — per-country validity grid', () => {
  const today = new Date('2026-03-22');

  it('renders a row for each of the 8 supported countries', () => {
    const expiry = toISO(daysFrom(400, today)); // well-valid passport
    render(<DocumentValidityCard passportExpiry={expiry} today={today} />);
    const countries = ['JPN', 'MYS', 'SGP', 'THA', 'VNM', 'GBR', 'USA', 'CAN'];
    for (const code of countries) {
      expect(screen.getByTestId(`country-validity-${code}`)).toBeTruthy();
    }
  });

  it('marks all countries as valid when passport has 400 days remaining', () => {
    const expiry = toISO(daysFrom(400, today));
    render(<DocumentValidityCard passportExpiry={expiry} today={today} />);
    const jpn = screen.getByTestId('country-validity-JPN');
    expect(jpn.props.accessibilityLabel).toBe('Japan: Valid');
  });

  it('marks all countries as invalid when passport expires in 10 days (< 6 months)', () => {
    const expiry = toISO(daysFrom(10, today));
    render(<DocumentValidityCard passportExpiry={expiry} today={today} />);
    const jpn = screen.getByTestId('country-validity-JPN');
    expect(jpn.props.accessibilityLabel).toBe('Japan: Invalid');
    const can = screen.getByTestId('country-validity-CAN');
    expect(can.props.accessibilityLabel).toBe('Canada: Invalid');
  });

  it('marks countries valid exactly at the 6-month boundary', () => {
    // Exactly 6 months from today: the passport meets the minimum requirement
    const sixMonthsOut = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 6, today.getUTCDate()),
    );
    const expiry = toISO(sixMonthsOut);
    render(<DocumentValidityCard passportExpiry={expiry} today={today} />);
    const sgp = screen.getByTestId('country-validity-SGP');
    expect(sgp.props.accessibilityLabel).toBe('Singapore: Valid');
  });

  it('marks countries invalid when passport expires one day before 6-month boundary', () => {
    const sixMonthsOut = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 6, today.getUTCDate()),
    );
    sixMonthsOut.setUTCDate(sixMonthsOut.getUTCDate() - 1);
    const expiry = toISO(sixMonthsOut);
    render(<DocumentValidityCard passportExpiry={expiry} today={today} />);
    const sgp = screen.getByTestId('country-validity-SGP');
    expect(sgp.props.accessibilityLabel).toBe('Singapore: Invalid');
  });
});

// -------------------------------------------------------------------------
// DocumentValidityCard — custom testID
// -------------------------------------------------------------------------

describe('DocumentValidityCard — custom testID', () => {
  it('accepts a custom testID prop', () => {
    const today = new Date('2026-03-22');
    const expiry = toISO(daysFrom(200, today));
    render(
      <DocumentValidityCard
        passportExpiry={expiry}
        today={today}
        testID="my-validity-card"
      />,
    );
    expect(screen.getByTestId('my-validity-card')).toBeTruthy();
  });
});
