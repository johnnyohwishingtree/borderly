import { render, fireEvent } from '@testing-library/react-native';
import { AutoFillPill } from '../../../src/components/submission/AutoFillPill';

jest.mock('lucide-react-native', () => ({
  Sparkles: 'Sparkles',
}));

describe('AutoFillPill — 1Password-style floating icon', () => {
  it('renders with default testID', () => {
    const { getByTestId } = render(
      <AutoFillPill onAutoFill={jest.fn()} onDismiss={jest.fn()} />,
    );
    getByTestId('autofill-pill');
  });

  it('renders with custom testID', () => {
    const { getByTestId } = render(
      <AutoFillPill onAutoFill={jest.fn()} onDismiss={jest.fn()} testID="my-pill" />,
    );
    getByTestId('my-pill');
  });

  it('calls onAutoFill on press (single tap = fill)', () => {
    const onAutoFill = jest.fn();
    const { getByTestId } = render(
      <AutoFillPill onAutoFill={onAutoFill} onDismiss={jest.fn()} />,
    );
    fireEvent.press(getByTestId('autofill-pill-fill-button'));
    expect(onAutoFill).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss on long press', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <AutoFillPill onAutoFill={jest.fn()} onDismiss={onDismiss} />,
    );
    fireEvent(getByTestId('autofill-pill-fill-button'), 'longPress');
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility label', () => {
    const { getByLabelText } = render(
      <AutoFillPill onAutoFill={jest.fn()} onDismiss={jest.fn()} />,
    );
    getByLabelText('Auto-fill all form fields');
  });
});
