/**
 * Unit tests for the ReadinessChecklist component.
 *
 * Covers:
 * - Header rendering (overall status, item count label)
 * - Expand / collapse on header tap
 * - Category grouping with section headers
 * - "Fix" link calls onNavigate with the correct screen name
 * - Items without actionScreen do not render a Fix link
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
    makeItem({ id: 'passport-leg-1', category: 'passport', label: 'Passport valid', status: 'ok' }),
    makeItem({
      id: 'form-leg-1',
      category: 'form',
      label: 'Japan form incomplete',
      status: 'warning',
      detail: 'Missing occupation field',
      actionScreen: 'LegForm',
    }),
    makeItem({
      id: 'qr-leg-1',
      category: 'qr',
      label: 'Japan QR missing',
      status: 'missing',
      actionScreen: 'QRWallet',
    }),
    makeItem({ id: 'deadline-leg-1', category: 'deadline', label: 'Deadline OK', status: 'ok' }),
  ];
  return {
    tripId: 'trip-001',
    overallStatus: 'warning',
    items,
    readyCount: 2,
    totalCount: 4,
    departureDate: new Date('2025-08-01'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Header rendering
// ---------------------------------------------------------------------------

describe('ReadinessChecklist — header', () => {
  it('renders "Ready to travel" when overallStatus is ok', () => {
    const readiness = makeTripReadiness({
      overallStatus: 'ok',
      readyCount: 2,
      totalCount: 2,
    });
    render(<ReadinessChecklist tripReadiness={readiness} onNavigate={jest.fn()} />);
    expect(screen.getByText('Ready to travel')).toBeTruthy();
  });

  it('renders singular "1 item needs attention" when 1 item is not ready', () => {
    const readiness = makeTripReadiness({
      overallStatus: 'warning',
      readyCount: 3,
      totalCount: 4,
    });
    render(<ReadinessChecklist tripReadiness={readiness} onNavigate={jest.fn()} />);
    expect(screen.getByText('1 item needs attention')).toBeTruthy();
  });

  it('renders plural "2 items need attention" when 2 items are not ready', () => {
    const readiness = makeTripReadiness({
      overallStatus: 'critical',
      readyCount: 2,
      totalCount: 4,
    });
    render(<ReadinessChecklist tripReadiness={readiness} onNavigate={jest.fn()} />);
    expect(screen.getByText('2 items need attention')).toBeTruthy();
  });

  it('renders the header button with testID readiness-checklist-header', () => {
    render(
      <ReadinessChecklist tripReadiness={makeTripReadiness()} onNavigate={jest.fn()} />,
    );
    expect(screen.getByTestId('readiness-checklist-header')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Expand / collapse
// ---------------------------------------------------------------------------

describe('ReadinessChecklist — expand/collapse', () => {
  it('body is hidden by default (initialExpanded=false)', () => {
    render(
      <ReadinessChecklist tripReadiness={makeTripReadiness()} onNavigate={jest.fn()} />,
    );
    expect(screen.queryByTestId('readiness-checklist-body')).toBeNull();
  });

  it('body is visible when initialExpanded=true', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    expect(screen.getByTestId('readiness-checklist-body')).toBeTruthy();
  });

  it('tapping header expands the body', () => {
    render(
      <ReadinessChecklist tripReadiness={makeTripReadiness()} onNavigate={jest.fn()} />,
    );
    expect(screen.queryByTestId('readiness-checklist-body')).toBeNull();
    fireEvent.press(screen.getByTestId('readiness-checklist-header'));
    expect(screen.getByTestId('readiness-checklist-body')).toBeTruthy();
  });

  it('tapping header again collapses the body', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    expect(screen.getByTestId('readiness-checklist-body')).toBeTruthy();
    fireEvent.press(screen.getByTestId('readiness-checklist-header'));
    expect(screen.queryByTestId('readiness-checklist-body')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Category grouping
// ---------------------------------------------------------------------------

describe('ReadinessChecklist — category grouping', () => {
  it('renders section headers for each category present in items', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    expect(screen.getByText('Passport')).toBeTruthy();
    expect(screen.getByText('Forms')).toBeTruthy();
    expect(screen.getByText('QR Codes')).toBeTruthy();
    expect(screen.getByText('Deadlines')).toBeTruthy();
  });

  it('does NOT render a category header when no items belong to that category', () => {
    const readiness = makeTripReadiness({
      items: [
        makeItem({ id: 'p-1', category: 'passport', label: 'Passport OK', status: 'ok' }),
      ],
    });
    render(
      <ReadinessChecklist tripReadiness={readiness} onNavigate={jest.fn()} initialExpanded={true} />,
    );
    expect(screen.getByText('Passport')).toBeTruthy();
    expect(screen.queryByText('Forms')).toBeNull();
    expect(screen.queryByText('QR Codes')).toBeNull();
    expect(screen.queryByText('Deadlines')).toBeNull();
  });

  it('renders a category section testID for each category', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    expect(screen.getByTestId('readiness-category-passport')).toBeTruthy();
    expect(screen.getByTestId('readiness-category-form')).toBeTruthy();
    expect(screen.getByTestId('readiness-category-qr')).toBeTruthy();
    expect(screen.getByTestId('readiness-category-deadline')).toBeTruthy();
  });

  it('renders item labels within their category sections', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    expect(screen.getByText('Passport valid')).toBeTruthy();
    expect(screen.getByText('Japan form incomplete')).toBeTruthy();
    expect(screen.getByText('Japan QR missing')).toBeTruthy();
    expect(screen.getByText('Deadline OK')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Detail text
// ---------------------------------------------------------------------------

describe('ReadinessChecklist — detail text', () => {
  it('renders item detail text when detail is provided', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    expect(screen.getByText('Missing occupation field')).toBeTruthy();
  });

  it('does not render detail text when detail is absent', () => {
    const readiness = makeTripReadiness({
      items: [makeItem({ id: 'p-1', category: 'passport', label: 'Passport OK', status: 'ok' })],
    });
    render(
      <ReadinessChecklist tripReadiness={readiness} onNavigate={jest.fn()} initialExpanded={true} />,
    );
    // No detail text is present in DOM
    expect(screen.queryByText(/detail/i)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Fix link — calls onNavigate
// ---------------------------------------------------------------------------

describe('ReadinessChecklist — Fix link', () => {
  it('renders a Fix button for items with actionScreen', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    // Two items have actionScreen in makeTripReadiness
    const fixButtons = screen.getAllByText('Fix');
    expect(fixButtons.length).toBe(2);
  });

  it('does NOT render a Fix button for items without actionScreen', () => {
    const readiness = makeTripReadiness({
      items: [
        makeItem({ id: 'p-1', category: 'passport', label: 'Passport OK', status: 'ok' }),
      ],
    });
    render(
      <ReadinessChecklist tripReadiness={readiness} onNavigate={jest.fn()} initialExpanded={true} />,
    );
    expect(screen.queryByText('Fix')).toBeNull();
  });

  it('calls onNavigate with the correct screen name when Fix is tapped', () => {
    const onNavigate = jest.fn();
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={onNavigate}
        initialExpanded={true}
      />,
    );
    // Press the first Fix button (form-leg-1 → LegForm)
    const fixButtons = screen.getAllByText('Fix');
    fireEvent.press(fixButtons[0]);
    expect(onNavigate).toHaveBeenCalledWith('LegForm');
  });

  it('calls onNavigate with the correct screen for the second Fix link', () => {
    const onNavigate = jest.fn();
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={onNavigate}
        initialExpanded={true}
      />,
    );
    const fixButtons = screen.getAllByText('Fix');
    fireEvent.press(fixButtons[1]);
    expect(onNavigate).toHaveBeenCalledWith('QRWallet');
  });
});

// ---------------------------------------------------------------------------
// Empty items list
// ---------------------------------------------------------------------------

describe('ReadinessChecklist — empty items', () => {
  it('renders fallback message when items list is empty', () => {
    const readiness = makeTripReadiness({ items: [], readyCount: 0, totalCount: 0 });
    render(
      <ReadinessChecklist
        tripReadiness={readiness}
        onNavigate={jest.fn()}
        initialExpanded={true}
      />,
    );
    expect(screen.getByText('No readiness items.')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Custom testID
// ---------------------------------------------------------------------------

describe('ReadinessChecklist — testID', () => {
  it('uses default testID "readiness-checklist"', () => {
    render(
      <ReadinessChecklist tripReadiness={makeTripReadiness()} onNavigate={jest.fn()} />,
    );
    expect(screen.getByTestId('readiness-checklist')).toBeTruthy();
  });

  it('accepts a custom testID', () => {
    render(
      <ReadinessChecklist
        tripReadiness={makeTripReadiness()}
        onNavigate={jest.fn()}
        testID="my-checklist"
      />,
    );
    expect(screen.getByTestId('my-checklist')).toBeTruthy();
  });
});
