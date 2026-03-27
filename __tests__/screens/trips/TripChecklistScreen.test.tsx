/**
 * Tests for TripChecklistScreen.
 *
 * Covers:
 *  1. Loading state
 *  2. Empty state when no checklist items
 *  3. Renders grouped checklist items with progress header
 *  4. Item tap navigates to deep link target
 *  5. A11y: items have button role
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import TripChecklistScreen from '@/screens/trips/TripChecklistScreen/TripChecklistScreen';
import type { TripChecklist } from '@/services/checklist/checklistTypes';

// ── Mocks ──

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: { tripId: 'trip-001' } }),
}));

let mockChecklist: TripChecklist | null = null;
let mockIsLoading = false;

jest.mock('@/hooks/useTripChecklist', () => ({
  useTripChecklist: () => ({
    checklist: mockChecklist,
    isLoading: mockIsLoading,
  }),
}));

// ── Tests ──

describe('TripChecklistScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockChecklist = null;
    mockIsLoading = false;
  });

  it('shows loading state', () => {
    mockIsLoading = true;
    render(<TripChecklistScreen />);

    screen.getByText('Computing checklist...');
  });

  it('shows empty state when no items', () => {
    mockChecklist = null;
    render(<TripChecklistScreen />);

    screen.getByTestId('checklist-empty');
  });

  it('renders progress header and grouped items', () => {
    mockChecklist = {
      tripId: 'trip-001',
      tripName: 'Japan Trip',
      items: [
        {
          id: 'leg-JPN-form-leg-001',
          category: 'form',
          label: 'Japan entry form',
          status: 'not-started',
          detail: 'Form not started',
          urgency: 'critical',
          deepLink: { screen: 'LegForm', params: { legId: 'leg-001' } },
          legId: 'leg-001',
          countryCode: 'JPN',
        },
        {
          id: 'leg-JPN-qr-leg-001',
          category: 'qr',
          label: 'Japan QR code',
          status: 'action-needed',
          detail: 'No QR code saved',
          urgency: 'critical',
          deepLink: { screen: 'QRWallet', params: { legId: 'leg-001' } },
          legId: 'leg-001',
          countryCode: 'JPN',
        },
      ],
      overallStatus: 'action-needed',
      completedCount: 0,
      totalCount: 2,
    };

    render(<TripChecklistScreen />);

    // Progress header
    screen.getByTestId('checklist-progress');
    screen.getByText('0 of 2 items complete');

    // Section headers
    screen.getByText('Forms');
    screen.getByText('QR Codes');

    // Items
    screen.getByText('Japan entry form');
    screen.getByText('Japan QR code');
  });

  it('navigates when item is tapped', () => {
    mockChecklist = {
      tripId: 'trip-001',
      tripName: 'Japan Trip',
      items: [
        {
          id: 'leg-JPN-form-leg-001',
          category: 'form',
          label: 'Japan entry form',
          status: 'not-started',
          detail: 'Form not started',
          urgency: 'critical',
          deepLink: { screen: 'LegForm', params: { legId: 'leg-001' } },
          legId: 'leg-001',
          countryCode: 'JPN',
        },
      ],
      overallStatus: 'not-started',
      completedCount: 0,
      totalCount: 1,
    };

    render(<TripChecklistScreen />);

    fireEvent.press(screen.getByTestId('checklist-item-leg-JPN-form-leg-001'));

    expect(mockNavigate).toHaveBeenCalledWith('LegForm', { legId: 'leg-001' });
  });

  it('items have button accessibility role', () => {
    mockChecklist = {
      tripId: 'trip-001',
      tripName: 'Japan Trip',
      items: [
        {
          id: 'leg-JPN-form-leg-001',
          category: 'form',
          label: 'Japan entry form',
          status: 'complete',
          detail: 'Form submitted',
          urgency: 'normal',
          deepLink: { screen: 'LegForm', params: { legId: 'leg-001' } },
          legId: 'leg-001',
          countryCode: 'JPN',
        },
      ],
      overallStatus: 'complete',
      completedCount: 1,
      totalCount: 1,
    };

    render(<TripChecklistScreen />);

    const item = screen.getByTestId('checklist-item-leg-JPN-form-leg-001');
    expect(item.props.accessibilityRole).toBe('button');
    expect(item.props.accessibilityLabel).toContain('Japan entry form');
    expect(item.props.accessibilityLabel).toContain('Complete');
  });
});
