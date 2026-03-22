/**
 * Tests for the PassportValidityWarning component.
 *
 * Verifies rendering, content, accessibility props, and the null-return
 * (valid passport) branch.
 */

import { render, screen } from '@testing-library/react-native';
import PassportValidityWarning from '../../../src/components/trips/PassportValidityWarning';
import type { PassportValidityStatus } from '../../../src/types/document';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStatus(overrides?: Partial<PassportValidityStatus>): PassportValidityStatus {
  return {
    isValid: false,
    daysUntilExpiry: 90,
    requiredValidityDays: 180,
    shortfallDays: 30,
    ...overrides,
  };
}

const DEFAULT_PROPS = {
  status: makeStatus(),
  countryName: 'Japan',
  requiredMonths: 6,
  passportExpiry: '2025-04-30',
  testID: 'passport-validity-warning-test',
};

// ---------------------------------------------------------------------------
// Null branch — valid passport
// ---------------------------------------------------------------------------

describe('PassportValidityWarning — valid passport', () => {
  it('renders nothing when status.isValid is true', () => {
    const { toJSON } = render(
      <PassportValidityWarning
        {...DEFAULT_PROPS}
        status={makeStatus({ isValid: true, shortfallDays: 0 })}
      />,
    );
    expect(toJSON()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Rendering — invalid passport
// ---------------------------------------------------------------------------

describe('PassportValidityWarning — invalid passport renders correctly', () => {
  it('renders the warning container with testID', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('passport-validity-warning-test')).toBeTruthy();
  });

  it('uses default testID based on country name when testID prop is omitted', () => {
    render(
      <PassportValidityWarning
        status={makeStatus()}
        countryName="Japan"
        requiredMonths={6}
        passportExpiry="2025-04-30"
      />,
    );
    expect(screen.getByTestId('passport-validity-warning-Japan')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('PassportValidityWarning — accessibility', () => {
  it('root container has accessibilityRole="alert"', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    const container = screen.getByTestId('passport-validity-warning-test');
    expect(container.props.accessibilityRole).toBe('alert');
  });

  it('root container has accessibilityLiveRegion="polite"', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    const container = screen.getByTestId('passport-validity-warning-test');
    expect(container.props.accessibilityLiveRegion).toBe('polite');
  });

  it('accessibilityLabel mentions the country name', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    const container = screen.getByTestId('passport-validity-warning-test');
    expect(container.props.accessibilityLabel).toContain('Japan');
  });

  it('accessibilityLabel mentions required months', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    const container = screen.getByTestId('passport-validity-warning-test');
    expect(container.props.accessibilityLabel).toContain('6 months');
  });

  it('accessibilityLabel mentions the shortfall days', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    const container = screen.getByTestId('passport-validity-warning-test');
    expect(container.props.accessibilityLabel).toContain('30 days short');
  });

  it('accessibilityLabel mentions passport expiry date', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    const container = screen.getByTestId('passport-validity-warning-test');
    // The expiry is formatted, so just verify the year is present
    expect(container.props.accessibilityLabel).toContain('2025');
  });

  it('root container is accessible', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} />);
    const container = screen.getByTestId('passport-validity-warning-test');
    expect(container.props.accessible).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Singular vs plural labels
// ---------------------------------------------------------------------------

describe('PassportValidityWarning — singular/plural month label', () => {
  it('uses "month" (singular) when requiredMonths is 1', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} status={makeStatus({ shortfallDays: 10 })} requiredMonths={1} />);
    const container = screen.getByTestId('passport-validity-warning-test');
    expect(container.props.accessibilityLabel).toContain('1 month');
    expect(container.props.accessibilityLabel).not.toContain('1 months');
  });

  it('uses "months" (plural) when requiredMonths > 1', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} requiredMonths={6} />);
    const container = screen.getByTestId('passport-validity-warning-test');
    expect(container.props.accessibilityLabel).toContain('6 months');
  });
});

describe('PassportValidityWarning — singular/plural day label', () => {
  it('uses "day" (singular) when shortfallDays is 1', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} status={makeStatus({ shortfallDays: 1 })} />);
    const container = screen.getByTestId('passport-validity-warning-test');
    expect(container.props.accessibilityLabel).toContain('1 day short');
    expect(container.props.accessibilityLabel).not.toContain('1 days short');
  });

  it('uses "days" (plural) when shortfallDays > 1', () => {
    render(<PassportValidityWarning {...DEFAULT_PROPS} status={makeStatus({ shortfallDays: 30 })} />);
    const container = screen.getByTestId('passport-validity-warning-test');
    expect(container.props.accessibilityLabel).toContain('30 days short');
  });
});

// ---------------------------------------------------------------------------
// Different country names
// ---------------------------------------------------------------------------

describe('PassportValidityWarning — different countries', () => {
  it('shows Singapore in accessibility label', () => {
    render(
      <PassportValidityWarning
        {...DEFAULT_PROPS}
        countryName="Singapore"
        testID="test-sgp"
      />,
    );
    const container = screen.getByTestId('test-sgp');
    expect(container.props.accessibilityLabel).toContain('Singapore');
  });

  it('shows Malaysia in accessibility label', () => {
    render(
      <PassportValidityWarning
        {...DEFAULT_PROPS}
        countryName="Malaysia"
        testID="test-mys"
      />,
    );
    const container = screen.getByTestId('test-mys');
    expect(container.props.accessibilityLabel).toContain('Malaysia');
  });
});
