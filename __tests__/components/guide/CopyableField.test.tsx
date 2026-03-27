import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { trigger } from 'react-native-haptic-feedback';
import CopyableField from '../../../src/components/guide/CopyableField';

// Mock dependencies
jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: {
    setString: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  HapticFeedbackTypes: {
    notificationSuccess: 'notificationSuccess',
  },
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

const mockedClipboard = jest.mocked(Clipboard);
const mockedTrigger = jest.mocked(trigger);
const mockedAlert = jest.mocked(Alert);

describe('CopyableField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with basic props', () => {
    const { getByText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
      />
    );

    getByText('Test Field');
    getByText('Test Value');
    getByText('Copy');
  });

  it('displays portal field name when provided', () => {
    const { getByText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
        portalFieldName="Portal Field Name"
      />
    );

    getByText('Portal field: Portal Field Name');
  });

  it('displays help text when provided', () => {
    const { getByText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
        helpText="This is helpful information"
      />
    );

    getByText('This is helpful information');
  });

  it('formats value using custom formatter', () => {
    const formatter = (value: string | number | boolean) => `Formatted: ${value}`;
    const { getByText } = render(
      <CopyableField
        label="Test Field"
        value="Original Value"
        formatValue={formatter}
      />
    );

    getByText('Formatted: Original Value');
  });

  it('shows "Not provided" for empty values', () => {
    const { getByText } = render(
      <CopyableField
        label="Test Field"
        value=""
      />
    );

    getByText('Not provided');
  });

  it('copies value to clipboard when pressed', async () => {

    const { getByLabelText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
      />
    );

    const copyButton = getByLabelText('Copy Test Field: Test Value');
    fireEvent.press(copyButton);

    await waitFor(() => {
      expect(mockedClipboard.setString).toHaveBeenCalledWith('Test Value');
    });
  });

  it('shows "Copied!" feedback after successful copy', async () => {

    const { getByLabelText, getByText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
      />
    );

    const copyButton = getByLabelText('Copy Test Field: Test Value');
    fireEvent.press(copyButton);

    await waitFor(() => {
      getByText('Copied!');
    });
  });

  it('triggers haptic feedback on successful copy', async () => {

    const { getByLabelText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
      />
    );

    const copyButton = getByLabelText('Copy Test Field: Test Value');
    fireEvent.press(copyButton);

    await waitFor(() => {
      expect(mockedTrigger).toHaveBeenCalledWith(
        'notificationSuccess',
        expect.any(Object)
      );
    });
  });

  it('shows alert when trying to copy empty value', () => {
    const { getByLabelText } = render(
      <CopyableField
        label="Test Field"
        value=""
      />
    );

    const copyButton = getByLabelText('Copy Test Field: Not provided');
    fireEvent.press(copyButton);

    expect(mockedAlert.alert).toHaveBeenCalledWith('Cannot Copy', 'No value to copy');
  });

  it('shows alert when clipboard operation fails', () => {
    // Clipboard.setString is called synchronously inside copyWithTimeout,
    // so we throw synchronously to trigger the catch branch in handleCopy.
    mockedClipboard.setString.mockReset();
    mockedClipboard.setString.mockImplementation(() => {
      throw new Error('Clipboard error');
    });

    const { getByLabelText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
      />
    );

    const copyButton = getByLabelText('Copy Test Field: Test Value');
    fireEvent.press(copyButton);

    expect(mockedAlert.alert).toHaveBeenCalledWith(
      'Copy Failed',
      'Unable to copy to clipboard'
    );
  });

  it('handles boolean values correctly', () => {
    const { getByText } = render(
      <CopyableField
        label="Boolean Field"
        value={true}
      />
    );

    getByText('true');
  });

  it('handles number values correctly', () => {
    const { getByText } = render(
      <CopyableField
        label="Number Field"
        value={42}
      />
    );

    getByText('42');
  });

  it('applies accessibility label correctly', () => {
    const { getByLabelText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
        accessibilityLabel="Custom accessibility label"
      />
    );

    getByLabelText('Custom accessibility label');
  });

  it('uses default accessibility label when not provided', () => {
    const { getByLabelText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
      />
    );

    getByLabelText('Copy Test Field: Test Value');
  });

  it('copy status area has accessibilityLiveRegion polite for screen reader announcement', () => {
    const { getByTestId } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
      />
    );

    // The View wrapping the copy icon + text should have accessibilityLiveRegion="polite"
    // so screen readers announce the state change when "Copied!" appears.
    const statusArea = getByTestId('copy-status-area');
    expect(statusArea.props.accessibilityLiveRegion).toBe('polite');
  });

  it('copy status area has no accessibilityLabel before copying', () => {
    const { getByTestId } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
      />
    );

    const statusArea = getByTestId('copy-status-area');
    // Before copying, the label is undefined (no announcement needed)
    expect(statusArea.props.accessibilityLabel).toBeUndefined();
  });

  it('copy status area announces "Copied to clipboard" after copy', async () => {
    // Reset any throwing mock implementation from prior tests
    mockedClipboard.setString.mockReset();
    mockedClipboard.setString.mockImplementation(() => undefined);

    const { getByLabelText, getByText, getByTestId } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
      />
    );

    const copyButton = getByLabelText('Copy Test Field: Test Value');
    fireEvent.press(copyButton);

    // First wait for the "Copied!" text to confirm state updated
    await waitFor(() => getByText('Copied!'));

    // Now verify the status area View has the screen-reader announcement label
    const statusArea = getByTestId('copy-status-area');
    expect(statusArea.props.accessibilityLabel).toBe('Copied to clipboard');
  });
});