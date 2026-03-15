import { render, fireEvent, act } from '@testing-library/react-native';
import { AutoFillBanner } from '../../../src/components/submission/AutoFillBanner';

jest.mock('lucide-react-native', () => ({
  X: 'X',
  ChevronDown: 'ChevronDown',
  ChevronUp: 'ChevronUp',
  CheckCircle: 'CheckCircle',
  AlertCircle: 'AlertCircle',
}));

describe('AutoFillBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the banner with default testID', () => {
    const { getByTestId } = render(
      <AutoFillBanner filled={3} total={5} onDismiss={jest.fn()} />
    );
    expect(getByTestId('autofill-banner')).toBeTruthy();
  });

  it('renders with a custom testID', () => {
    const { getByTestId } = render(
      <AutoFillBanner filled={1} total={1} onDismiss={jest.fn()} testID="my-banner" />
    );
    expect(getByTestId('my-banner')).toBeTruthy();
  });

  it('renders the dismiss button', () => {
    const { getByTestId } = render(
      <AutoFillBanner filled={3} total={5} onDismiss={jest.fn()} />
    );
    expect(getByTestId('autofill-banner-dismiss')).toBeTruthy();
  });

  it('shows the filled/total counts in the message', () => {
    const { getByTestId } = render(
      <AutoFillBanner filled={3} total={5} onDismiss={jest.fn()} />
    );
    const message = getByTestId('autofill-banner-message');
    const text = message.props.children.join('');
    expect(text).toContain('3');
    expect(text).toContain('5');
    expect(text).toContain('auto-filled');
  });

  it('uses singular "field" when total is 1', () => {
    const { getByTestId } = render(
      <AutoFillBanner filled={1} total={1} onDismiss={jest.fn()} />
    );
    const text = getByTestId('autofill-banner-message').props.children.join('');
    expect(text).toContain('1 of 1 field ');
    expect(text).not.toContain('fields');
  });

  it('uses plural "fields" when total is greater than 1', () => {
    const { getByTestId } = render(
      <AutoFillBanner filled={2} total={3} onDismiss={jest.fn()} />
    );
    const text = getByTestId('autofill-banner-message').props.children.join('');
    expect(text).toContain('fields');
  });

  it('renders dismiss button with the correct accessibility label', () => {
    const { getByLabelText } = render(
      <AutoFillBanner filled={1} total={1} onDismiss={jest.fn()} />
    );
    expect(getByLabelText('Dismiss auto-fill notification')).toBeTruthy();
  });

  it('calls onDismiss when dismiss button is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <AutoFillBanner filled={3} total={3} onDismiss={onDismiss} />
    );

    fireEvent.press(getByTestId('autofill-banner-dismiss'));

    // onDismiss is called directly (not via animation callback)
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after 4 seconds', () => {
    const onDismiss = jest.fn();
    render(<AutoFillBanner filled={2} total={2} onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss before 4 seconds', () => {
    const onDismiss = jest.fn();
    render(<AutoFillBanner filled={1} total={2} onDismiss={onDismiss} />);

    act(() => {
      jest.advanceTimersByTime(3999);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  // ─── Field-level detail (expandable) ────────────────────────────────────────

  it('does not render expand toggle when no results are provided', () => {
    const { queryByTestId } = render(
      <AutoFillBanner filled={3} total={5} onDismiss={jest.fn()} />
    );
    // No expand toggle without results
    expect(queryByTestId('autofill-banner-expand-toggle')).toBeNull();
  });

  it('renders expand toggle when results are provided', () => {
    const results = [
      { id: 'surname', status: 'filled' as const },
      { id: 'passportNumber', status: 'filled' as const },
    ];
    const { getByTestId } = render(
      <AutoFillBanner filled={2} total={2} results={results} onDismiss={jest.fn()} />
    );
    expect(getByTestId('autofill-banner-expand-toggle')).toBeTruthy();
  });

  it('detail section is hidden before expand toggle is pressed', () => {
    const results = [{ id: 'surname', status: 'filled' as const }];
    const { queryByTestId } = render(
      <AutoFillBanner filled={1} total={1} results={results} onDismiss={jest.fn()} />
    );
    // Detail section not rendered initially
    expect(queryByTestId('autofill-banner-details')).toBeNull();
  });

  it('shows detail section after pressing expand toggle', () => {
    const results = [
      { id: 'surname', status: 'filled' as const },
      { id: 'departureCity', status: 'failed' as const },
    ];
    const { getByTestId } = render(
      <AutoFillBanner filled={1} total={2} results={results} onDismiss={jest.fn()} />
    );

    // Press expand
    fireEvent.press(getByTestId('autofill-banner-expand-toggle'));

    // Detail section should now be visible
    expect(getByTestId('autofill-banner-details')).toBeTruthy();
    // Individual field results should be rendered
    expect(getByTestId('autofill-result-surname')).toBeTruthy();
    expect(getByTestId('autofill-result-departureCity')).toBeTruthy();
  });

  it('hides detail section after pressing expand toggle a second time', () => {
    const results = [{ id: 'surname', status: 'filled' as const }];
    const { getByTestId, queryByTestId } = render(
      <AutoFillBanner filled={1} total={1} results={results} onDismiss={jest.fn()} />
    );

    // Open
    fireEvent.press(getByTestId('autofill-banner-expand-toggle'));
    expect(getByTestId('autofill-banner-details')).toBeTruthy();

    // Close
    fireEvent.press(getByTestId('autofill-banner-expand-toggle'));
    expect(queryByTestId('autofill-banner-details')).toBeNull();
  });

  it('expand toggle has correct accessibility label when collapsed', () => {
    const results = [{ id: 'surname', status: 'filled' as const }];
    const { getByLabelText } = render(
      <AutoFillBanner filled={1} total={1} results={results} onDismiss={jest.fn()} />
    );
    expect(getByLabelText('Show field details')).toBeTruthy();
  });

  it('expand toggle has correct accessibility label when expanded', () => {
    const results = [{ id: 'surname', status: 'filled' as const }];
    const { getByTestId, getByLabelText } = render(
      <AutoFillBanner filled={1} total={1} results={results} onDismiss={jest.fn()} />
    );
    fireEvent.press(getByTestId('autofill-banner-expand-toggle'));
    expect(getByLabelText('Hide field details')).toBeTruthy();
  });
});
