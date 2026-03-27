/**
 * Accessibility tests for the ReadinessChecklist component.
 *
 * Verifies:
 * - Header button has accessibilityRole="button", accessibilityState.expanded
 * - Item rows have accessibilityLabel combining label + status + detail
 * - Status icons are hidden from screen readers
 * - Fix link has accessibilityRole="button" and descriptive label
 * - Critical / warning items use accessibilityLiveRegion="polite" on detail text
 */

import { render, fireEvent, screen } from '@testing-library/react-native';
import ReadinessChecklist from '../../../src/components/trips/ReadinessChecklist';
import type { TripReadiness, ReadinessItem } from '../../../src/services/readiness/readinessTypes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<ReadinessItem> & Pick<ReadinessItem, 'id'>): ReadinessItem {
  return {
    category: 'passport',
    label: 'Passport valid',
    status: 'ok',
    ...overrides,
  };
}

function makeTripReadiness(overrides: Partial<TripReadiness> = {}): TripReadiness {
  const items: ReadinessItem[] = [
    makeItem({ id: 'passport-1', category: 'passport', label: 'Passport valid', status: 'ok' }),
    makeItem({
      id: 'form-1',
      category: 'form',
      label: 'Japan form incomplete',
      status: 'critical',
      detail: 'Missing occupation',
      actionScreen: 'LegForm',
    }),
    makeItem({
      id: 'qr-1',
      category: 'qr',
      label: 'Japan QR missing',
      status: 'missing',
    }),
  ];
  return {
    tripId: 'trip-a11y',
    overallStatus: 'critical',
    items,
    readyCount: 1,
    totalCount: 3,
    departureDate: new Date('2025-09-01'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Header — accessibilityRole and accessibilityState
// ---------------------------------------------------------------------------

describe('ReadinessChecklist — header a11y', () => {
  it('header has accessibilityRole="button"', () => {
    render(
      <ReadinessChecklist tripReadiness={makeTripReadiness()} onNavigate={jest.fn()} />,
    );
    const header = screen.getByTestId('readiness-checklist-header');
    expect(header.props.accessibilityRole).toBe('button');
  });

  it('header accessibilityState.expanded is false by default', () => {
    render(
      <ReadinessChecklist tripReadiness={makeTripReadiness()} onNavigate={jest.fn()} />,
    );
    const header = screen.getByTestId('readiness-checklist-header');
    expect(header.props.accessibilityState).toMatchObject({ expanded: false });
  });

  it('header accessibilityState.expanded becomes true after tap', () => {
    render(
      <ReadinessChecklist tripReadiness={makeTripReadiness()} onNavigate={jest.fn()} />,
    );
    const header = screen.getByTestId('readiness-checklist-header');
    fireEvent.press(header);
    expect(header.props.accessibilityState).toMatchObject({ expanded: true });
  });

  it('header accessibilityState.expanded is true when initialExpanded=true', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    const header = screen.getByTestId('readiness-checklist-header');
    expect(header.props.accessibilityState).toMatchObject({ expanded: true });
  });

  it('header accessibilityLabel describes overall status', () => {
    render(
      <ReadinessChecklist tripReadiness={makeTripReadiness()} onNavigate={jest.fn()} />,
    );
    const header = screen.getByTestId('readiness-checklist-header');
    expect(header.props.accessibilityLabel).toBe('2 items need attention');
  });

  it('header accessibilityLabel is "Ready to travel" for ok status', () => {
    const readiness = makeTripReadiness({
      overallStatus: 'ok',
      readyCount: 3,
      totalCount: 3,
    });
    render(
      <ReadinessChecklist tripReadiness={readiness} onNavigate={jest.fn()} />,
    );
    const header = screen.getByTestId('readiness-checklist-header');
    expect(header.props.accessibilityLabel).toBe('Ready to travel');
  });

  it('header accessibilityHint says "expand" when collapsed', () => {
    render(
      <ReadinessChecklist tripReadiness={makeTripReadiness()} onNavigate={jest.fn()} />,
    );
    const header = screen.getByTestId('readiness-checklist-header');
    expect(header.props.accessibilityHint).toMatch(/expand/i);
  });

  it('header accessibilityHint says "collapse" when expanded', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    const header = screen.getByTestId('readiness-checklist-header');
    expect(header.props.accessibilityHint).toMatch(/collapse/i);
  });
});

// ---------------------------------------------------------------------------
// Item rows — accessibilityLabel
// ---------------------------------------------------------------------------

describe('ReadinessChecklist — item row a11y labels', () => {
  it('ok item has accessibilityLabel combining label and status', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    const item = screen.getByTestId('readiness-item-passport-1');
    expect(item.props.accessibilityLabel).toBe('Passport valid, Ready');
  });

  it('critical item with detail has accessibilityLabel combining label, status, and detail', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    const item = screen.getByTestId('readiness-item-form-1');
    expect(item.props.accessibilityLabel).toBe('Japan form incomplete, Critical, Missing occupation');
  });

  it('missing item without detail has accessibilityLabel of label and status only', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    const item = screen.getByTestId('readiness-item-qr-1');
    expect(item.props.accessibilityLabel).toBe('Japan QR missing, Missing');
  });

  it('item rows have accessibilityRole="text"', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    const item = screen.getByTestId('readiness-item-passport-1');
    expect(item.props.accessibilityRole).toBe('text');
  });
});

// ---------------------------------------------------------------------------
// Status icons — hidden from screen readers
// ---------------------------------------------------------------------------

describe('ReadinessChecklist — decorative elements hidden', () => {
  it('at least one element is hidden from screen readers (accessibilityElementsHidden or importantForAccessibility)', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );

    const tree = screen.toJSON();
    const hasHiddenElement = (node: unknown): boolean => {
      if (!node || typeof node !== 'object') return false;
      const n = node as { props?: Record<string, unknown>; children?: unknown[] };
      if (
        n.props?.accessibilityElementsHidden === true ||
        n.props?.importantForAccessibility === 'no-hide-descendants'
      ) {
        return true;
      }
      if (Array.isArray(n.children)) {
        return n.children.some(hasHiddenElement);
      }
      return false;
    };
    expect(hasHiddenElement(tree)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fix link — accessibilityRole and label
// ---------------------------------------------------------------------------

describe('ReadinessChecklist — Fix link a11y', () => {
  it('Fix button has accessibilityRole="button"', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    const fixButtons = screen.getAllByLabelText(/Fix/);
    expect(fixButtons[0].props.accessibilityRole).toBe('button');
  });

  it('Fix button has descriptive accessibilityLabel containing the item label', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    // Should have a label like "Fix Japan form incomplete"
    screen.getByLabelText('Fix Japan form incomplete');
  });

  it('Fix button has an accessibilityHint', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    const fixButton = screen.getByLabelText('Fix Japan form incomplete');
    expect(typeof fixButton.props.accessibilityHint).toBe('string');
    expect(fixButton.props.accessibilityHint.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Critical detail — accessibilityLiveRegion
// ---------------------------------------------------------------------------

describe('ReadinessChecklist — live regions for critical items', () => {
  it('critical item detail text has accessibilityLiveRegion="polite"', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    // The detail text "Missing occupation" should have liveRegion=polite
    const detailText = screen.getByText('Missing occupation');
    expect(detailText.props.accessibilityLiveRegion).toBe('polite');
  });

  it('ok item detail text has accessibilityLiveRegion="none"', () => {
    const readiness = makeTripReadiness({
      items: [
        makeItem({
          id: 'ok-with-detail',
          category: 'passport',
          label: 'Passport OK',
          status: 'ok',
          detail: 'Expires in 18 months',
        }),
      ],
    });
    render(
      <ReadinessChecklist tripReadiness={readiness} onNavigate={jest.fn()} initialExpanded={true} />,
    );
    const detailText = screen.getByText('Expires in 18 months');
    expect(detailText.props.accessibilityLiveRegion).toBe('none');
  });
});
