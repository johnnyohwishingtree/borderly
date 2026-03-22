/**
 * Accessibility tests for PassportValidityWarning.
 *
 * Verifies the component exposes correct accessibility roles, labels,
 * and live regions to screen readers (VoiceOver / TalkBack).
 *
 * The component uses `accessibilityRole="alert"` and
 * `accessibilityLiveRegion="polite"` so screen readers announce it
 * automatically when it appears. All child text nodes use
 * `accessibilityElementsHidden` so the combined label on the container
 * is the only thing announced.
 */

import { render, screen } from '@testing-library/react-native';
import PassportValidityWarning from '../../../src/components/trips/PassportValidityWarning';
import type { PassportValidityStatus } from '../../../src/types/document';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStatus(overrides: Partial<PassportValidityStatus> = {}): PassportValidityStatus {
  return {
    isValid: false,
    daysUntilExpiry: 90,
    requiredValidityDays: 180,
    shortfallDays: 90,
    ...overrides,
  };
}

const NEAR_EXPIRY = '2026-06-20';

const DEFAULT_PROPS = {
  status: makeStatus(),
  countryName: 'Japan',
  requiredMonths: 6,
  passportExpiry: NEAR_EXPIRY,
};

// ---------------------------------------------------------------------------
// Null render when valid
// ---------------------------------------------------------------------------

describe('PassportValidityWarning — renders null when valid', () => {
  it('returns null when status.isValid is true', () => {
    const { toJSON } = render(
      <PassportValidityWarning
        {...DEFAULT_PROPS}
        status={makeStatus({ isValid: true })}
      />,
    );
    expect(toJSON()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Accessibility role and live region
// ---------------------------------------------------------------------------

describe('PassportValidityWarning — accessibility role and live region', () => {
  it('has accessibilityRole="alert"', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    const warning = screen.getByTestId('passport-validity-warning-Japan');
    expect(warning.props.accessibilityRole).toBe('alert');
  });

  it('has accessibilityLiveRegion="polite"', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    const warning = screen.getByTestId('passport-validity-warning-Japan');
    expect(warning.props.accessibilityLiveRegion).toBe('polite');
  });

  it('has accessible={true}', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    const warning = screen.getByTestId('passport-validity-warning-Japan');
    expect(warning.props.accessible).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Accessibility label content
// ---------------------------------------------------------------------------

describe('PassportValidityWarning — accessibilityLabel content', () => {
  it('label mentions the destination country name', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    const warning = screen.getByTestId('passport-validity-warning-Japan');
    expect(warning.props.accessibilityLabel).toMatch(/Japan/);
  });

  it('label includes required months', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    const warning = screen.getByTestId('passport-validity-warning-Japan');
    expect(warning.props.accessibilityLabel).toMatch(/6 months/);
  });

  it('label includes shortfall days', () => {
    render(
      <PassportValidityWarning
        {...DEFAULT_PROPS}
        status={makeStatus({ shortfallDays: 90 })}
      />,
    );
    const warning = screen.getByTestId('passport-validity-warning-Japan');
    expect(warning.props.accessibilityLabel).toMatch(/90 days short/);
  });

  it('label includes passport expiry date', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    const warning = screen.getByTestId('passport-validity-warning-Japan');
    // The expiry date is formatted as "Month Day, Year" in the label
    expect(warning.props.accessibilityLabel).toMatch(/June 20, 2026/);
  });

  it('label includes "entry could be denied" guidance', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    const warning = screen.getByTestId('passport-validity-warning-Japan');
    expect(warning.props.accessibilityLabel).toMatch(/entry could be denied/);
  });

  it('uses singular "month" when requiredMonths is 1', () => {
    render(
      <PassportValidityWarning
        {...DEFAULT_PROPS}
        requiredMonths={1}
      />,
    );
    const warning = screen.getByTestId('passport-validity-warning-Japan');
    expect(warning.props.accessibilityLabel).toMatch(/\b1 month\b/);
    expect(warning.props.accessibilityLabel).not.toMatch(/1 months/);
  });

  it('uses singular "day" when shortfallDays is 1', () => {
    render(
      <PassportValidityWarning
        {...DEFAULT_PROPS}
        status={makeStatus({ shortfallDays: 1 })}
      />,
    );
    const warning = screen.getByTestId('passport-validity-warning-Japan');
    expect(warning.props.accessibilityLabel).toMatch(/\b1 day short\b/);
    expect(warning.props.accessibilityLabel).not.toMatch(/1 days short/);
  });

  it('label works for Malaysia', () => {
    render(
      <PassportValidityWarning
        {...DEFAULT_PROPS}
        countryName="Malaysia"
        testID="passport-validity-warning-Malaysia"
      />,
    );
    const warning = screen.getByTestId('passport-validity-warning-Malaysia');
    expect(warning.props.accessibilityLabel).toMatch(/Malaysia/);
  });

  it('label works for Singapore', () => {
    render(
      <PassportValidityWarning
        {...DEFAULT_PROPS}
        countryName="Singapore"
        testID="passport-validity-warning-Singapore"
      />,
    );
    const warning = screen.getByTestId('passport-validity-warning-Singapore');
    expect(warning.props.accessibilityLabel).toMatch(/Singapore/);
  });
});

// ---------------------------------------------------------------------------
// TestID
// ---------------------------------------------------------------------------

describe('PassportValidityWarning — testID', () => {
  it('uses default testID "passport-validity-warning-<Country>" when no testID prop provided', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('passport-validity-warning-Japan')).toBeTruthy();
  });

  it('uses custom testID when provided', () => {
    render(
      <PassportValidityWarning {...DEFAULT_PROPS} testID="custom-warning-id" />,
    );
    expect(screen.getByTestId('custom-warning-id')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Decorative elements hidden from screen readers
// ---------------------------------------------------------------------------

describe('PassportValidityWarning — decorative elements hidden', () => {
  it('AlertTriangle icon has accessibilityElementsHidden to prevent double announcement', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    const tree = screen.toJSON();

    const findHidden = (node: unknown): boolean => {
      if (!node || typeof node !== 'object') return false;
      const n = node as Record<string, unknown>;
      if (n.props && typeof n.props === 'object') {
        const p = n.props as Record<string, unknown>;
        if (p.accessibilityElementsHidden === true) return true;
      }
      const children = (n as Record<string, unknown>).children;
      if (Array.isArray(children)) return children.some(findHidden);
      return false;
    };

    expect(findHidden(tree)).toBe(true);
  });

  it('text nodes inside the banner have accessibilityElementsHidden so screen reader uses container label', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    const tree = screen.toJSON();

    // Verify that at least one Text element has accessibilityElementsHidden=true
    const findTextHidden = (node: unknown): boolean => {
      if (!node || typeof node !== 'object') return false;
      const n = node as Record<string, unknown>;
      if (
        n.type === 'Text' &&
        n.props &&
        typeof n.props === 'object' &&
        (n.props as Record<string, unknown>).accessibilityElementsHidden === true
      ) {
        return true;
      }
      const children = (n as Record<string, unknown>).children;
      if (Array.isArray(children)) return children.some(findTextHidden);
      return false;
    };

    expect(findTextHidden(tree)).toBe(true);
  });
});
