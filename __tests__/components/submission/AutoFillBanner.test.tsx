import { render, fireEvent, act } from '@testing-library/react-native';
import { AutoFillBanner } from '../../../src/components/submission/AutoFillBanner';

jest.mock('lucide-react-native', () => ({
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
});
