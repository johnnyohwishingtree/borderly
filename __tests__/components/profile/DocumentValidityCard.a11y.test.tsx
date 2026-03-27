/**
 * Accessibility tests for DocumentValidityCard and PassportExpiryBadge.
 *
 * Verifies that the components expose correct accessibility roles, labels,
 * and live regions to screen readers (VoiceOver / TalkBack).
 */

import { render, screen } from '@testing-library/react-native';
import DocumentValidityCard from '../../../src/components/profile/DocumentValidityCard';
import PassportExpiryBadge from '../../../src/components/profile/PassportExpiryBadge';

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function daysFrom(days: number, base: Date = new Date()): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function toISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

const TODAY = new Date('2026-03-22');
const EXPIRY_VALID = toISO(daysFrom(200, TODAY)); // 200 days → valid
const EXPIRY_EXPIRING = toISO(daysFrom(90, TODAY)); // 90 days → expiring-soon
const EXPIRY_EXPIRED = toISO(daysFrom(10, TODAY)); // 10 days  → expired

// -------------------------------------------------------------------------
// PassportExpiryBadge — accessibility
// -------------------------------------------------------------------------

describe('PassportExpiryBadge — accessibility', () => {
  it('has accessibilityRole="text"', () => {
    render(<PassportExpiryBadge expiryDate={EXPIRY_VALID} today={TODAY} />);
    const badge = screen.getByTestId('passport-expiry-badge');
    expect(badge.props.accessibilityRole).toBe('text');
  });

  it('has accessible={true}', () => {
    render(<PassportExpiryBadge expiryDate={EXPIRY_VALID} today={TODAY} />);
    const badge = screen.getByTestId('passport-expiry-badge');
    expect(badge.props.accessible).toBe(true);
  });

  it('accessibilityLabel includes status and days for "Valid"', () => {
    render(<PassportExpiryBadge expiryDate={EXPIRY_VALID} today={TODAY} />);
    const badge = screen.getByTestId('passport-expiry-badge');
    expect(badge.props.accessibilityLabel).toMatch(/Valid/);
    expect(badge.props.accessibilityLabel).toMatch(/\d+ days? remaining/);
  });

  it('accessibilityLabel says "Expiring Soon" for 30–179 days', () => {
    render(<PassportExpiryBadge expiryDate={EXPIRY_EXPIRING} today={TODAY} />);
    const badge = screen.getByTestId('passport-expiry-badge');
    expect(badge.props.accessibilityLabel).toMatch(/Expiring Soon/);
  });

  it('accessibilityLabel says "Expired" for < 30 days', () => {
    render(<PassportExpiryBadge expiryDate={EXPIRY_EXPIRED} today={TODAY} />);
    const badge = screen.getByTestId('passport-expiry-badge');
    expect(badge.props.accessibilityLabel).toMatch(/Expired/);
  });

  it('shows days-ago label for already-expired passport', () => {
    const pastExpiry = toISO(daysFrom(-15, TODAY));
    render(<PassportExpiryBadge expiryDate={pastExpiry} today={TODAY} />);
    const badge = screen.getByTestId('passport-expiry-badge');
    expect(badge.props.accessibilityLabel).toMatch(/15 days ago/);
  });

  it('accepts a custom testID', () => {
    render(
      <PassportExpiryBadge expiryDate={EXPIRY_VALID} today={TODAY} testID="custom-badge" />,
    );
    screen.getByTestId('custom-badge');
  });
});

// -------------------------------------------------------------------------
// DocumentValidityCard — top-level accessibility
// -------------------------------------------------------------------------

describe('DocumentValidityCard — renders null (no a11y tree) without passport data', () => {
  it('renders nothing when passportExpiry is falsy', () => {
    const { toJSON } = render(
      <DocumentValidityCard passportExpiry={undefined} today={TODAY} />,
    );
    expect(toJSON()).toBeNull();
  });
});

describe('DocumentValidityCard — section header', () => {
  it('section title has accessibilityRole="header"', () => {
    render(<DocumentValidityCard passportExpiry={EXPIRY_VALID} today={TODAY} />);
    const heading = screen.getByText('Document Validity');
    expect(heading.props.accessibilityRole).toBe('header');
  });
});

// -------------------------------------------------------------------------
// DocumentValidityCard — expiry date row
// -------------------------------------------------------------------------

describe('DocumentValidityCard — expiry date row', () => {
  it('expiry row is accessible with a combined label', () => {
    render(<DocumentValidityCard passportExpiry={EXPIRY_VALID} today={TODAY} />);
    // The row wrapping both date text and badge should have an accessible label
    // describing both expiry date and days remaining
    screen.getByLabelText(/Passport expires/i);
  });

  it('expiry row label includes days remaining for valid passport', () => {
    render(<DocumentValidityCard passportExpiry={EXPIRY_VALID} today={TODAY} />);
    // Multiple elements may match (row + badge) — at least one must exist
    const rows = screen.getAllByLabelText(/200 days remaining/i);
    expect(rows.length).toBeGreaterThan(0);
  });
});

// -------------------------------------------------------------------------
// DocumentValidityCard — embedded PassportExpiryBadge
// -------------------------------------------------------------------------

describe('DocumentValidityCard — embedded PassportExpiryBadge', () => {
  it('includes an accessible expiry badge', () => {
    render(<DocumentValidityCard passportExpiry={EXPIRY_VALID} today={TODAY} />);
    const badge = screen.getByTestId('expiry-badge');
    expect(badge.props.accessible).toBe(true);
    expect(badge.props.accessibilityRole).toBe('text');
  });
});

// -------------------------------------------------------------------------
// DocumentValidityCard — per-country validity grid
// -------------------------------------------------------------------------

describe('DocumentValidityCard — per-country grid accessibility', () => {
  it('each country row is accessible with role="text"', () => {
    render(<DocumentValidityCard passportExpiry={EXPIRY_VALID} today={TODAY} />);
    const jpn = screen.getByTestId('country-validity-JPN');
    expect(jpn.props.accessible).toBe(true);
    expect(jpn.props.accessibilityRole).toBe('text');
  });

  it('valid country label reads "<Country>: Valid"', () => {
    render(<DocumentValidityCard passportExpiry={EXPIRY_VALID} today={TODAY} />);
    screen.getByLabelText('Japan: Valid');
    screen.getByLabelText('Canada: Valid');
  });

  it('invalid country label reads "<Country>: Invalid"', () => {
    const shortExpiry = toISO(daysFrom(10, TODAY));
    render(<DocumentValidityCard passportExpiry={shortExpiry} today={TODAY} />);
    screen.getByLabelText('Japan: Invalid');
    screen.getByLabelText('Singapore: Invalid');
  });

  it('decorative icons are hidden from screen readers', () => {
    render(<DocumentValidityCard passportExpiry={EXPIRY_VALID} today={TODAY} />);
    // Verify at least one element has accessibilityElementsHidden=true
    const tree = screen.toJSON();
    const findHidden = (node: unknown): boolean => {
      if (!node || typeof node !== 'object') return false;
      const n = node as Record<string, unknown>;
      if (
        n.props &&
        typeof n.props === 'object' &&
        ((n.props as Record<string, unknown>).accessibilityElementsHidden === true ||
          (n.props as Record<string, unknown>).importantForAccessibility === 'no')
      ) {
        return true;
      }
      const children = (n as Record<string, unknown>).children;
      if (Array.isArray(children)) {
        return children.some(findHidden);
      }
      return false;
    };
    expect(findHidden(tree)).toBe(true);
  });

  it('country text nodes are not independently accessible (accessible=false)', () => {
    render(<DocumentValidityCard passportExpiry={EXPIRY_VALID} today={TODAY} />);
    // The Text nodes inside the country row have accessible={false};
    // screen reader picks up the label from the parent View only
    const tree = screen.toJSON();
    const findAccessibleFalse = (node: unknown): boolean => {
      if (!node || typeof node !== 'object') return false;
      const n = node as Record<string, unknown>;
      if (n.props && typeof n.props === 'object') {
        const p = n.props as Record<string, unknown>;
        if (p.accessible === false) {
          return true;
        }
      }
      const children = (n as Record<string, unknown>).children;
      if (Array.isArray(children)) {
        return children.some(findAccessibleFalse);
      }
      return false;
    };
    expect(findAccessibleFalse(tree)).toBe(true);
  });
});

// -------------------------------------------------------------------------
// DocumentValidityCard — combined label for different statuses
// -------------------------------------------------------------------------

describe('DocumentValidityCard — combined accessibility for all statuses', () => {
  it('renders accessible structure for expiring-soon passport', () => {
    render(<DocumentValidityCard passportExpiry={EXPIRY_EXPIRING} today={TODAY} />);
    const badge = screen.getByTestId('expiry-badge');
    expect(badge.props.accessibilityLabel).toMatch(/Expiring Soon/);
    // Countries with short expiry should all be invalid
    screen.getByLabelText('Japan: Invalid');
  });

  it('renders accessible structure for expired passport', () => {
    const pastExpiry = toISO(daysFrom(-5, TODAY));
    render(<DocumentValidityCard passportExpiry={pastExpiry} today={TODAY} />);
    const badge = screen.getByTestId('expiry-badge');
    expect(badge.props.accessibilityLabel).toMatch(/Expired/);
    screen.getByLabelText('Vietnam: Invalid');
  });
});
