import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Clipboard } from '@react-native-clipboard/clipboard';
import { trigger } from 'react-native-haptic-feedback';
import CopyableField from '../../../src/components/guide/CopyableField';

// Mock dependencies
jest.mock('@react-native-clipboard/clipboard', () => ({
  Clipboard: {
    setString: jest.fn(),
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

    expect(getByText('Test Field')).toBeTruthy();
    expect(getByText('Test Value')).toBeTruthy();
    expect(getByText('Copy')).toBeTruthy();
  });

  it('displays portal field name when provided', () => {
    const { getByText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
        portalFieldName="Portal Field Name"
      />
    );

    expect(getByText('Portal field: Portal Field Name')).toBeTruthy();
  });

  it('displays help text when provided', () => {
    const { getByText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
        helpText="This is helpful information"
      />
    );

    expect(getByText('This is helpful information')).toBeTruthy();
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

    expect(getByText('Formatted: Original Value')).toBeTruthy();
  });

  it('shows "Not provided" for empty values', () => {
    const { getByText } = render(
      <CopyableField
        label="Test Field"
        value=""
      />
    );

    expect(getByText('Not provided')).toBeTruthy();
  });

  it('copies value to clipboard when pressed', async () => {
    mockedClipboard.setString.mockResolvedValue();

    const { getByText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
      />
    );

    const copyButton = getByText('Copy').parent?.parent;
    if (copyButton) {
      fireEvent.press(copyButton);
    }

    await waitFor(() => {
      expect(mockedClipboard.setString).toHaveBeenCalledWith('Test Value');
    });
  });

  it('shows "Copied!" feedback after successful copy', async () => {
    mockedClipboard.setString.mockResolvedValue();

    const { getByText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
      />
    );

    const copyButton = getByText('Copy').parent?.parent;
    if (copyButton) {
      fireEvent.press(copyButton);
    }

    await waitFor(() => {
      expect(getByText('Copied!')).toBeTruthy();
    });
  });

  it('triggers haptic feedback on successful copy', async () => {
    mockedClipboard.setString.mockResolvedValue();

    const { getByText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
      />
    );

    const copyButton = getByText('Copy').parent?.parent;
    if (copyButton) {
      fireEvent.press(copyButton);
    }

    await waitFor(() => {
      expect(mockedTrigger).toHaveBeenCalledWith(
        'notificationSuccess',
        expect.any(Object)
      );
    });
  });

  it('shows alert when trying to copy empty value', () => {
    const { getByText } = render(
      <CopyableField
        label="Test Field"
        value=""
      />
    );

    const copyButton = getByText('Copy').parent?.parent;
    if (copyButton) {
      fireEvent.press(copyButton);
    }

    expect(mockedAlert.alert).toHaveBeenCalledWith('Cannot Copy', 'No value to copy');
  });

  it('shows alert when clipboard operation fails', async () => {
    mockedClipboard.setString.mockRejectedValue(new Error('Clipboard error'));

    const { getByText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
      />
    );

    const copyButton = getByText('Copy').parent?.parent;
    if (copyButton) {
      fireEvent.press(copyButton);
    }

    await waitFor(() => {
      expect(mockedAlert.alert).toHaveBeenCalledWith(
        'Copy Failed',
        'Unable to copy to clipboard'
      );
    });
  });

  it('handles boolean values correctly', () => {
    const { getByText } = render(
      <CopyableField
        label="Boolean Field"
        value={true}
      />
    );

    expect(getByText('true')).toBeTruthy();
  });

  it('handles number values correctly', () => {
    const { getByText } = render(
      <CopyableField
        label="Number Field"
        value={42}
      />
    );

    expect(getByText('42')).toBeTruthy();
  });

  it('applies accessibility label correctly', () => {
    const { getByLabelText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
        accessibilityLabel="Custom accessibility label"
      />
    );

    expect(getByLabelText('Custom accessibility label')).toBeTruthy();
  });

  it('uses default accessibility label when not provided', () => {
    const { getByLabelText } = render(
      <CopyableField
        label="Test Field"
        value="Test Value"
      />
    );

    expect(getByLabelText('Copy Test Field: Test Value')).toBeTruthy();
  });
});