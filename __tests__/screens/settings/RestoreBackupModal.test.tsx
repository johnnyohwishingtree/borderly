import { render, fireEvent, act } from '@testing-library/react-native';
import RestoreBackupModal from '@/screens/settings/RestoreBackupModal/RestoreBackupModal';
import { useBackupRestore, type RestoreStep } from '@/hooks/useBackupRestore';
import { useNavigation } from '@react-navigation/native';
import { useProfileStore } from '@/stores/useProfileStore';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('@/hooks/useBackupRestore', () => ({
  useBackupRestore: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@/stores/useProfileStore', () => ({
  useProfileStore: jest.fn(),
}));

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return {
    Shield: () => <View testID="icon-shield" />,
    FileCheck: () => <View testID="icon-file-check" />,
    Eye: () => <View testID="icon-eye" />,
    EyeOff: () => <View testID="icon-eye-off" />,
    CheckCircle: () => <View testID="icon-check-circle" />,
    AlertCircle: () => <View testID="icon-alert-circle" />,
    UploadCloud: () => <View testID="icon-upload-cloud" />,
  };
});

jest.mock('@/components/ui', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
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

const mockPickFile = jest.fn();
const mockSetPassphrase = jest.fn();
const mockToggleSecureEntry = jest.fn();
const mockSubmitPassphrase = jest.fn();
const mockConfirmReplace = jest.fn();
const mockReset = jest.fn();
const mockGoBack = jest.fn();
const mockLoadFamilyProfiles = jest.fn().mockResolvedValue(undefined);
const mockSetOnboardingComplete = jest.fn();

const mockNav = { goBack: mockGoBack };

function makeHookResult(overrides?: Partial<ReturnType<typeof useBackupRestore>>) {
  return {
    step: 'idle' as RestoreStep,
    passphrase: '',
    errorMessage: null,
    secureTextEntry: true,
    pickFile: mockPickFile,
    setPassphrase: mockSetPassphrase,
    toggleSecureEntry: mockToggleSecureEntry,
    submitPassphrase: mockSubmitPassphrase,
    confirmReplace: mockConfirmReplace,
    reset: mockReset,
    ...overrides,
  };
}

function setup(stepOverrides?: Partial<ReturnType<typeof useBackupRestore>>) {
  (useBackupRestore as unknown as jest.Mock).mockReturnValue(makeHookResult(stepOverrides));
  (useNavigation as unknown as jest.Mock).mockReturnValue(mockNav);
  (useProfileStore as unknown as jest.Mock).mockReturnValue({
    loadFamilyProfiles: mockLoadFamilyProfiles,
    setOnboardingComplete: mockSetOnboardingComplete,
  });
}

// ---------------------------------------------------------------------------
// RestoreBackupModal — idle step
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — idle step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup({ step: 'idle' });
  });

  it('renders the idle step with pick file button', () => {
    const { getByTestId } = render(<RestoreBackupModal />);
    getByTestId('restore-step-idle');
    getByTestId('pick-file-button');
  });

  it('calls pickFile when pick file button is pressed', () => {
    const { getByTestId } = render(<RestoreBackupModal />);
    fireEvent.press(getByTestId('pick-file-button'));
    expect(mockPickFile).toHaveBeenCalledTimes(1);
  });

  it('shows "What gets restored" info card', () => {
    const { getByText } = render(<RestoreBackupModal />);
    getByText('What gets restored');
  });
});

// ---------------------------------------------------------------------------
// RestoreBackupModal — passphrase step
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — passphrase step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup({ step: 'passphrase' });
  });

  it('renders the passphrase step', () => {
    const { getByTestId } = render(<RestoreBackupModal />);
    getByTestId('restore-step-passphrase');
  });

  it('renders passphrase input', () => {
    const { getByTestId } = render(<RestoreBackupModal />);
    getByTestId('passphrase-field');
  });

  it('calls setPassphrase on text change', () => {
    const { getByTestId } = render(<RestoreBackupModal />);
    fireEvent.changeText(getByTestId('passphrase-field'), 'mysecret');
    expect(mockSetPassphrase).toHaveBeenCalledWith('mysecret');
  });

  it('renders submit passphrase button', () => {
    const { getByTestId } = render(<RestoreBackupModal />);
    getByTestId('submit-passphrase-button');
  });

  it('submit button is disabled when passphrase is empty', () => {
    setup({ step: 'passphrase', passphrase: '' });
    const { getByTestId } = render(<RestoreBackupModal />);
    expect(getByTestId('submit-passphrase-button').props.disabled).toBe(true);
  });

  it('submit button is enabled when passphrase is non-empty', () => {
    setup({ step: 'passphrase', passphrase: 'secret' });
    const { getByTestId } = render(<RestoreBackupModal />);
    expect(getByTestId('submit-passphrase-button').props.disabled).toBe(false);
  });

  it('calls submitPassphrase when submit button is pressed', () => {
    setup({ step: 'passphrase', passphrase: 'mysecret' });
    const { getByTestId } = render(<RestoreBackupModal />);
    fireEvent.press(getByTestId('submit-passphrase-button'));
    expect(mockSubmitPassphrase).toHaveBeenCalledTimes(1);
  });

  it('calls toggleSecureEntry when eye toggle is pressed', () => {
    const { getByTestId } = render(<RestoreBackupModal />);
    fireEvent.press(getByTestId('toggle-secure-entry'));
    expect(mockToggleSecureEntry).toHaveBeenCalledTimes(1);
  });

  it('calls reset when cancel button is pressed', () => {
    const { getByTestId } = render(<RestoreBackupModal />);
    fireEvent.press(getByTestId('cancel-passphrase-button'));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// RestoreBackupModal — loading step
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — loading step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup({ step: 'loading' });
  });

  it('renders the loading step', () => {
    const { getByTestId } = render(<RestoreBackupModal />);
    getByTestId('restore-step-loading');
  });

  it('shows restoring message', () => {
    const { getByText } = render(<RestoreBackupModal />);
    getByText('Restoring your data…');
  });
});

// ---------------------------------------------------------------------------
// RestoreBackupModal — confirming-replace step
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — confirming-replace step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup({ step: 'confirming-replace' });
  });

  it('renders the conflict step', () => {
    const { getByTestId } = render(<RestoreBackupModal />);
    getByTestId('restore-step-conflict');
  });

  it('shows existing data warning', () => {
    const { getByText } = render(<RestoreBackupModal />);
    getByText('Existing data detected');
  });

  it('calls confirmReplace when replace button is pressed', () => {
    const { getByTestId } = render(<RestoreBackupModal />);
    fireEvent.press(getByTestId('confirm-replace-button'));
    expect(mockConfirmReplace).toHaveBeenCalledTimes(1);
  });

  it('calls reset when cancel button is pressed', () => {
    const { getByTestId } = render(<RestoreBackupModal />);
    fireEvent.press(getByTestId('cancel-replace-button'));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// RestoreBackupModal — success step
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — success step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup({ step: 'success' });
  });

  it('renders the success step', () => {
    const { getByTestId } = render(<RestoreBackupModal />);
    getByTestId('restore-step-success');
  });

  it('shows success message', () => {
    const { getByText } = render(<RestoreBackupModal />);
    getByText('Restore complete!');
  });

  it('calls loadFamilyProfiles, setOnboardingComplete, and goBack on Go to Home', async () => {
    const { getByTestId } = render(<RestoreBackupModal />);
    await act(async () => {
      fireEvent.press(getByTestId('go-to-home-button'));
    });
    expect(mockLoadFamilyProfiles).toHaveBeenCalledTimes(1);
    expect(mockSetOnboardingComplete).toHaveBeenCalledWith(true);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// RestoreBackupModal — error step
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — error step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the error step', () => {
    setup({ step: 'error', errorMessage: 'Incorrect passphrase.' });
    const { getByTestId } = render(<RestoreBackupModal />);
    getByTestId('restore-step-error');
  });

  it('displays the error message', () => {
    setup({ step: 'error', errorMessage: 'Incorrect passphrase.' });
    const { getByTestId } = render(<RestoreBackupModal />);
    expect(getByTestId('error-message').props.children).toBe('Incorrect passphrase.');
  });

  it('shows "Restore failed" heading', () => {
    setup({ step: 'error', errorMessage: 'Something broke' });
    const { getByText } = render(<RestoreBackupModal />);
    getByText('Restore failed');
  });

  it('calls reset when try again button is pressed', () => {
    setup({ step: 'error', errorMessage: 'Error' });
    const { getByTestId } = render(<RestoreBackupModal />);
    fireEvent.press(getByTestId('try-again-button'));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
