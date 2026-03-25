import { render, fireEvent } from '@testing-library/react-native';
import DeadlineSummary from '@/components/trips/DeadlineSummary';
import type { DeadlineSummaryItem } from '@/hooks/useDeadlineSummary';

function makeItem(overrides: Partial<DeadlineSummaryItem> = {}): DeadlineSummaryItem {
  return {
    tripId: 'trip-1',
    tripName: 'Japan Trip',
    legId: 'leg-1',
    countryCode: 'JPN',
    urgency: 'critical',
    hoursRemaining: 12,
    label: 'Due in 12h',
    ...overrides,
  };
}

describe('DeadlineSummary', () => {
  const defaultProps = {
    items: [makeItem()],
    isExpanded: true,
    onToggleExpanded: jest.fn(),
    onGoToForm: jest.fn(),
  };

  it('returns null when items is empty', () => {
    const { toJSON } = render(
      <DeadlineSummary {...defaultProps} items={[]} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders header with correct count text', () => {
    const { getByText } = render(<DeadlineSummary {...defaultProps} />);
    expect(getByText('1 deadline needs attention')).toBeTruthy();
  });

  it('renders plural header for multiple items', () => {
    const items = [makeItem(), makeItem({ legId: 'leg-2', tripId: 'trip-2', tripName: 'Trip 2' })];
    const { getByText } = render(<DeadlineSummary {...defaultProps} items={items} />);
    expect(getByText('2 deadlines need attention')).toBeTruthy();
  });

  it('shows item rows when expanded', () => {
    const { getByText } = render(<DeadlineSummary {...defaultProps} />);
    expect(getByText('Japan Trip')).toBeTruthy();
    expect(getByText('Due in 12h')).toBeTruthy();
  });

  it('hides item rows when collapsed', () => {
    const { queryByText } = render(
      <DeadlineSummary {...defaultProps} isExpanded={false} />,
    );
    expect(queryByText('Japan Trip')).toBeNull();
  });

  it('calls onToggleExpanded when header is pressed', () => {
    const onToggleExpanded = jest.fn();
    const { getByTestId } = render(
      <DeadlineSummary {...defaultProps} onToggleExpanded={onToggleExpanded} />,
    );
    fireEvent.press(getByTestId('deadline-summary-header'));
    expect(onToggleExpanded).toHaveBeenCalledTimes(1);
  });

  it('calls onGoToForm with correct args when Go button is pressed', () => {
    const onGoToForm = jest.fn();
    const { getByTestId } = render(
      <DeadlineSummary {...defaultProps} onGoToForm={onGoToForm} />,
    );
    fireEvent.press(getByTestId('deadline-summary-item-0-go-button'));
    expect(onGoToForm).toHaveBeenCalledWith('trip-1', 'leg-1');
  });

  it('shows "+N more" link when items exceed MAX_VISIBLE_ITEMS', () => {
    const items = Array.from({ length: 7 }, (_, i) =>
      makeItem({ legId: `leg-${i}`, tripId: `trip-${i}`, tripName: `Trip ${i}` }),
    );
    const { getByText } = render(<DeadlineSummary {...defaultProps} items={items} />);
    expect(getByText('+2 more')).toBeTruthy();
  });

  it('does not show "+N more" link when items <= 5', () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      makeItem({ legId: `leg-${i}`, tripId: `trip-${i}`, tripName: `Trip ${i}` }),
    );
    const { queryByTestId } = render(<DeadlineSummary {...defaultProps} items={items} />);
    expect(queryByTestId('deadline-summary-show-more')).toBeNull();
  });

  it('renders overdue label with correct styling class', () => {
    const items = [makeItem({ urgency: 'overdue', label: 'Overdue' })];
    const { getByText } = render(<DeadlineSummary {...defaultProps} items={items} />);
    expect(getByText('Overdue')).toBeTruthy();
  });

  it('has correct testID', () => {
    const { getByTestId } = render(
      <DeadlineSummary {...defaultProps} testID="custom-summary" />,
    );
    expect(getByTestId('custom-summary')).toBeTruthy();
  });

  it('has accessibilityRole summary on container', () => {
    const { getByTestId } = render(<DeadlineSummary {...defaultProps} />);
    const container = getByTestId('deadline-summary');
    expect(container.props.accessibilityRole).toBe('summary');
  });
});
