import { render, fireEvent } from '@testing-library/react-native';
import { Modal } from 'react-native';
import ExportBackupModal from '@/screens/settings/ExportBackupModal/ExportBackupModal';
import { useBackupExport } from '@/hooks/useBackupExport';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('@/hooks/useBackupExport', () => ({
  useBackupExport: jest.fn(),
}));

jest.mock('@/components/ui', () => {
  const { View, Text, TouchableOpacity, TextInput } = require('react-native');
  return {
    Input: ({ label, value, onChangeText, testID, placeholder, secureTextEntry }: any) => (
      <View testID={testID}>
        <Text>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          testID={`${testID}-field`}
        />
      </View>
    ),
    Button: ({ title, onPress, testID, disabled }: any) => (
      <TouchableOpacity onPress={onPress} testID={testID} disabled={disabled}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    Card: ({ children }: any) => <View>{children}</View>,
  };
});

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockSetPassphrase = jest.fn();
const mockSetConfirmPassphrase = jest.fn();
const mockHandleExport = jest.fn();
const mockReset = jest.fn();

function makeHookResult(overrides?: Partial<ReturnType<typeof useBackupExport>>) {
  return {
    passphrase: '',
    confirmPassphrase: '',
    isLoading: false,
    error: null,
    strength: 'weak' as const,
    setPassphrase: mockSetPassphrase,
    setConfirmPassphrase: mockSetConfirmPassphrase,
    handleExport: mockHandleExport,
    reset: mockReset,
    ...overrides,
  };
}

function setupHook(overrides?: Partial<ReturnType<typeof useBackupExport>>) {
  (useBackupExport as unknown as jest.Mock).mockReturnValue(makeHookResult(overrides));
}

// ---------------------------------------------------------------------------
// ExportBackupModal — rendering
// ---------------------------------------------------------------------------

describe('ExportBackupModal — rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHook();
  });

  it('renders the modal with visible=true', () => {
    const { UNSAFE_getByType } = render(
      <ExportBackupModal visible={true} onClose={jest.fn()} />,
    );
    const modal = UNSAFE_getByType(Modal);
    expect(modal.props.visible).toBe(true);
  });

  it('modal is hidden when visible=false', () => {
    const { UNSAFE_getByType } = render(
      <ExportBackupModal visible={false} onClose={jest.fn()} />,
    );
    const modal = UNSAFE_getByType(Modal);
    expect(modal.props.visible).toBe(false);
  });

  it('renders the title "Create Backup"', () => {
    const { getByText } = render(
      <ExportBackupModal visible={true} onClose={jest.fn()} />,
    );
    getByText('Create Backup');
  });

  it('renders passphrase and confirm passphrase inputs', () => {
    const { getByTestId } = render(
      <ExportBackupModal visible={true} onClose={jest.fn()} />,
    );
    getByTestId('passphrase-field');
    getByTestId('confirm-passphrase-field');
  });

  it('renders the export button when not loading', () => {
    const { getByTestId } = render(
      <ExportBackupModal visible={true} onClose={jest.fn()} />,
    );
    getByTestId('export-backup-submit-button');
  });

  it('shows loading indicator instead of export button when isLoading', () => {
    setupHook({ isLoading: true });
    const { queryByTestId, getByText } = render(
      <ExportBackupModal visible={true} onClose={jest.fn()} />,
    );
    expect(queryByTestId('export-backup-submit-button')).toBeNull();
    getByText('Encrypting backup…');
  });
});

// ---------------------------------------------------------------------------
// ExportBackupModal — passphrase interactions
// ---------------------------------------------------------------------------

describe('ExportBackupModal — passphrase interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHook();
  });

  it('calls setPassphrase when typing in passphrase input', () => {
    const { getByTestId } = render(
      <ExportBackupModal visible={true} onClose={jest.fn()} />,
    );
    fireEvent.changeText(getByTestId('passphrase-field-field'), 'mypassword');
    expect(mockSetPassphrase).toHaveBeenCalledWith('mypassword');
  });

  it('calls setConfirmPassphrase when typing in confirm input', () => {
    const { getByTestId } = render(
      <ExportBackupModal visible={true} onClose={jest.fn()} />,
    );
    fireEvent.changeText(getByTestId('confirm-passphrase-field-field'), 'mypassword');
    expect(mockSetConfirmPassphrase).toHaveBeenCalledWith('mypassword');
  });
});

// ---------------------------------------------------------------------------
// ExportBackupModal — strength indicator
// ---------------------------------------------------------------------------

describe('ExportBackupModal — strength indicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows strength indicator when passphrase is non-empty', () => {
    setupHook({ passphrase: 'abc', strength: 'weak' });
    const { getByTestId } = render(
      <ExportBackupModal visible={true} onClose={jest.fn()} />,
    );
    getByTestId('passphrase-strength-indicator');
  });

  it('hides strength indicator when passphrase is empty', () => {
    setupHook({ passphrase: '' });
    const { queryByTestId } = render(
      <ExportBackupModal visible={true} onClose={jest.fn()} />,
    );
    expect(queryByTestId('passphrase-strength-indicator')).toBeNull();
  });

  it('displays "Strong" strength via accessibility label', () => {
    setupHook({ passphrase: 'Str0ng!Pass12', strength: 'strong' });
    const { getByLabelText } = render(
      <ExportBackupModal visible={true} onClose={jest.fn()} />,
    );
    getByLabelText('Passphrase strength: Strong');
  });
});

// ---------------------------------------------------------------------------
// ExportBackupModal — error display
// ---------------------------------------------------------------------------

describe('ExportBackupModal — error display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows error message when error is present', () => {
    setupHook({ error: 'Passphrases do not match.' });
    const { getByTestId, getByText } = render(
      <ExportBackupModal visible={true} onClose={jest.fn()} />,
    );
    getByTestId('export-error-message');
    getByText('Passphrases do not match.');
  });

  it('does not show error message when error is null', () => {
    setupHook({ error: null });
    const { queryByTestId } = render(
      <ExportBackupModal visible={true} onClose={jest.fn()} />,
    );
    expect(queryByTestId('export-error-message')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ExportBackupModal — export and close actions
// ---------------------------------------------------------------------------

describe('ExportBackupModal — actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHook();
  });

  it('calls handleExport when export button is pressed', () => {
    const { getByTestId } = render(
      <ExportBackupModal visible={true} onClose={jest.fn()} />,
    );
    fireEvent.press(getByTestId('export-backup-submit-button'));
    expect(mockHandleExport).toHaveBeenCalledTimes(1);
  });

  it('calls reset and onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <ExportBackupModal visible={true} onClose={onClose} />,
    );
    fireEvent.press(getByTestId('export-backup-close-button'));
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls reset and onClose when cancel button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <ExportBackupModal visible={true} onClose={onClose} />,
    );
    fireEvent.press(getByTestId('export-backup-cancel-button'));
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// ExportBackupModal — validation hints
// ---------------------------------------------------------------------------

describe('ExportBackupModal — validation hints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows checkmark for minimum 8 characters when passphrase is long enough', () => {
    setupHook({ passphrase: '12345678' });
    const { getByText } = render(
      <ExportBackupModal visible={true} onClose={jest.fn()} />,
    );
    getByText(/✓/);
  });

  it('shows matching checkmark when passphrases match', () => {
    setupHook({ passphrase: '12345678', confirmPassphrase: '12345678' });
    const { getAllByText } = render(
      <ExportBackupModal visible={true} onClose={jest.fn()} />,
    );
    // Both "Minimum 8 characters" and "Passphrases match" should have checkmarks
    const checkmarks = getAllByText(/✓/);
    expect(checkmarks.length).toBe(2);
  });
});
