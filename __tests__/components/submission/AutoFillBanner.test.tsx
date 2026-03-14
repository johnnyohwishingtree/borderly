import { render, fireEvent, act } from '@testing-library/react-native';
import { AutoFillBanner } from '../../../src/components/submission/AutoFillBanner';

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  CheckCircle: 'CheckCircle',
  AlertTriangle: 'AlertTriangle',
  X: 'X',
}));

describe('AutoFillBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('does not render when visible is false', () => {
    const { queryByTestId } = render(
      <AutoFillBanner
        visible={false}
        filledCount={3}
        totalCount={5}
        failedCount={0}
        testID="banner"
      />
    );
    expect(queryByTestId('banner')).toBeNull();
  });

  it('renders when visible is true', () => {
    const { getByTestId } = render(
      <AutoFillBanner
        visible={true}
        filledCount={3}
        totalCount={5}
        failedCount={0}
        testID="banner"
      />
    );
    expect(getByTestId('banner')).toBeTruthy();
  });

  it('shows correct message for successful auto-fill', () => {
    const { getByTestId } = render(
      <AutoFillBanner
        visible={true}
        filledCount={3}
        totalCount={3}
        failedCount={0}
        testID="banner"
      />
    );
    const messageEl = getByTestId('banner-message');
    expect(messageEl.props.children).toContain('3 of 3');
  });

  it('shows warning message when there are failures', () => {
    const { getByTestId } = render(
      <AutoFillBanner
        visible={true}
        filledCount={2}
        totalCount={4}
        failedCount={2}
        testID="banner"
      />
    );
    const messageEl = getByTestId('banner-message');
    expect(messageEl.props.children).toContain('2 failed');
  });

  it('includes "already filled" info when skipped > 0', () => {
    // totalCount = filled + failed, skipped is totalCount - filled - failed = 5 - 2 - 0 = 3... wait
    // Let's set: filled=2, total=5, failed=1 → skipped = 5-2-1=2
    const { getByTestId } = render(
      <AutoFillBanner
        visible={true}
        filledCount={2}
        totalCount={5}
        failedCount={1}
        testID="banner"
      />
    );
    const messageEl = getByTestId('banner-message');
    expect(messageEl.props.children).toContain('2 already filled');
  });

  it('calls onDismiss when dismiss button is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <AutoFillBanner
        visible={true}
        filledCount={3}
        totalCount={3}
        failedCount={0}
        onDismiss={onDismiss}
        testID="banner"
      />
    );
    fireEvent.press(getByTestId('banner-dismiss'));
    act(() => { jest.runAllTimers(); });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('auto-dismisses after autoDismissMs', () => {
    const onDismiss = jest.fn();
    render(
      <AutoFillBanner
        visible={true}
        filledCount={1}
        totalCount={1}
        failedCount={0}
        onDismiss={onDismiss}
        autoDismissMs={1000}
        testID="banner"
      />
    );
    act(() => { jest.advanceTimersByTime(1500); });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows message when there are 0 total fields', () => {
    const { getByTestId } = render(
      <AutoFillBanner
        visible={true}
        filledCount={0}
        totalCount={0}
        failedCount={0}
        testID="banner"
      />
    );
    const messageEl = getByTestId('banner-message');
    expect(messageEl.props.children).toContain('No fields to auto-fill');
  });

  it('handles singular "field" correctly', () => {
    const { getByTestId } = render(
      <AutoFillBanner
        visible={true}
        filledCount={1}
        totalCount={1}
        failedCount={0}
        testID="banner"
      />
    );
    const messageEl = getByTestId('banner-message');
    // Should say "field" not "fields" for count of 1
    expect(messageEl.props.children).toContain('1 of 1 field ');
  });
});
