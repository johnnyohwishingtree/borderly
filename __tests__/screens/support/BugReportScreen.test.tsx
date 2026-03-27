/**
 * Unit tests for BugReportScreen.
 *
 * Covers rendering of severity/category selects, title/description/steps
 * inputs, diagnostic toggle, and submit button disabled state.
 */
import { render, screen, fireEvent } from '@testing-library/react-native';
import BugReportScreen from '@/screens/support/BugReportScreen/BugReportScreen';

// ── Mock return values (module-level stable references) ───────────────────────

const mockSetSeverity = jest.fn();
const mockSetCategory = jest.fn();
const mockSetTitle = jest.fn();
const mockSetDescription = jest.fn();
const mockSetStepsToReproduce = jest.fn();
const mockSetIncludeDiagnostics = jest.fn();
const mockHandleSubmitBugReport = jest.fn();

interface MockHookReturn {
  fields: {
    severity: string;
    setSeverity: jest.Mock;
    category: string;
    setCategory: jest.Mock;
    title: string;
    setTitle: jest.Mock;
    description: string;
    setDescription: jest.Mock;
    stepsToReproduce: string;
    setStepsToReproduce: jest.Mock;
  };
  diagnostics: {
    includeDiagnostics: boolean;
    setIncludeDiagnostics: jest.Mock;
    diagnosticInfo: {
      platform: string;
      platformVersion: string;
      appVersion: string;
      deviceInfo: { tripsCount: number; hasProfile: boolean };
    } | null;
  };
  submission: {
    isSubmitting: boolean;
    handleSubmitBugReport: jest.Mock;
  };
  options: {
    severityOptions: Array<{ label: string; value: string }>;
    categoryOptions: Array<{ label: string; value: string }>;
  };
  helpers: {
    getSeverityStatus: (s: string) => string;
    getSeverityEmoji: (s: string) => string;
  };
}

let mockHookReturn: MockHookReturn;

function resetMockHook() {
  mockHookReturn = {
    fields: {
      severity: 'medium',
      setSeverity: mockSetSeverity,
      category: 'general',
      setCategory: mockSetCategory,
      title: '',
      setTitle: mockSetTitle,
      description: '',
      setDescription: mockSetDescription,
      stepsToReproduce: '',
      setStepsToReproduce: mockSetStepsToReproduce,
    },
    diagnostics: {
      includeDiagnostics: false,
      setIncludeDiagnostics: mockSetIncludeDiagnostics,
      diagnosticInfo: {
        platform: 'iOS',
        platformVersion: '17.0',
        appVersion: '1.0.0',
        deviceInfo: { tripsCount: 3, hasProfile: true },
      },
    },
    submission: {
      isSubmitting: false,
      handleSubmitBugReport: mockHandleSubmitBugReport,
    },
    options: {
      severityOptions: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Critical', value: 'critical' },
      ],
      categoryOptions: [
        { label: 'General', value: 'general' },
        { label: 'Passport Scanning', value: 'passport' },
        { label: 'Forms', value: 'forms' },
      ],
    },
    helpers: {
      getSeverityStatus: (s: string) => s === 'critical' ? 'error' : 'warning',
      getSeverityEmoji: (s: string) => s === 'critical' ? '🔴' : '🟡',
    },
  };
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../src/hooks/useBugReport', () => ({
  useBugReport: () => mockHookReturn,
}));

jest.mock('../../../src/utils/theme', () => ({
  useTheme: () => ({
    colors: { textPrimary: '#000', textSecondary: '#666', success: '#22c55e', accent: '#3b82f6' },
    isDark: false,
  }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const Icon = ({ testID }: { testID?: string }) => React.createElement('View', { testID });
  return { Lock: Icon };
});

jest.mock('../../../src/components/ui', () => {
  const React = require('react');
  return {
    Button: ({ title, onPress, testID, disabled }: { title: string; onPress?: () => void; testID?: string; disabled?: boolean }) =>
      React.createElement('TouchableOpacity', { onPress: disabled ? undefined : onPress, testID, disabled, accessibilityState: { disabled } },
        React.createElement('Text', null, title)),
    Card: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
    StatusBadge: ({ text }: { text: string; status: string; size: string }) =>
      React.createElement('Text', null, text),
    Select: ({ label, value }: any) =>
      React.createElement('View', { testID: `select-${label}` },
        React.createElement('Text', null, label),
        React.createElement('Text', null, value)),
    Toggle: ({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) =>
      React.createElement('TouchableOpacity', {
        onPress: () => onValueChange(!value),
        testID: 'diagnostics-toggle',
      }, React.createElement('Text', null, value ? 'ON' : 'OFF')),
    ScreenContainer: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  resetMockHook();
});

// ── Header ────────────────────────────────────────────────────────────────────

describe('BugReportScreen — header', () => {
  it('renders title and subtitle', () => {
    render(<BugReportScreen />);
    screen.getByText('Report a Bug');
    screen.getByText('Help us fix issues and improve the app');
  });
});

// ── Severity select ───────────────────────────────────────────────────────────

describe('BugReportScreen — severity', () => {
  it('renders severity section', () => {
    render(<BugReportScreen />);
    screen.getByText('Bug Severity');
    screen.getByText('How severe is this issue?');
  });

  it('renders severity badge with current value', () => {
    render(<BugReportScreen />);
    screen.getByText(/Medium/);
  });
});

// ── Category select ───────────────────────────────────────────────────────────

describe('BugReportScreen — category', () => {
  it('renders category section', () => {
    render(<BugReportScreen />);
    screen.getByText('Bug Category');
    screen.getByText('Which area of the app is affected?');
  });
});

// ── Title input ───────────────────────────────────────────────────────────────

describe('BugReportScreen — title input', () => {
  it('renders title input with placeholder', () => {
    render(<BugReportScreen />);
    screen.getByText('Bug Title');
    screen.getByPlaceholderText(/Brief description of the bug/);
  });

  it('shows character count', () => {
    render(<BugReportScreen />);
    screen.getByText('0/100 characters');
  });

  it('calls setTitle when text is entered', () => {
    render(<BugReportScreen />);
    fireEvent.changeText(screen.getByPlaceholderText(/Brief description of the bug/), 'App crashes');
    expect(mockSetTitle).toHaveBeenCalledWith('App crashes');
  });
});

// ── Description input ─────────────────────────────────────────────────────────

describe('BugReportScreen — description', () => {
  it('renders description input with placeholder', () => {
    render(<BugReportScreen />);
    screen.getByText('Bug Description');
    screen.getByPlaceholderText(/Describe what happened/);
  });

  it('shows character count', () => {
    render(<BugReportScreen />);
    screen.getByText('0/1000 characters');
  });
});

// ── Steps to reproduce ───────────────────────────────────────────────────────

describe('BugReportScreen — steps to reproduce', () => {
  it('renders steps input with label', () => {
    render(<BugReportScreen />);
    screen.getByText('Steps to Reproduce (Optional)');
  });

  it('calls setStepsToReproduce when text is entered', () => {
    render(<BugReportScreen />);
    fireEvent.changeText(screen.getByPlaceholderText(/1\. Open the app/), 'Step 1: open app');
    expect(mockSetStepsToReproduce).toHaveBeenCalledWith('Step 1: open app');
  });
});

// ── Diagnostic toggle ─────────────────────────────────────────────────────────

describe('BugReportScreen — diagnostics toggle', () => {
  it('renders diagnostic toggle', () => {
    render(<BugReportScreen />);
    screen.getByText('Include Diagnostic Info');
    screen.getByTestId('diagnostics-toggle');
  });

  it('calls setIncludeDiagnostics when toggled', () => {
    render(<BugReportScreen />);
    fireEvent.press(screen.getByTestId('diagnostics-toggle'));
    expect(mockSetIncludeDiagnostics).toHaveBeenCalledWith(true);
  });

  it('shows diagnostic info preview when toggle is on', () => {
    mockHookReturn.diagnostics.includeDiagnostics = true;
    render(<BugReportScreen />);
    screen.getByText(/Diagnostic Information Preview/);
    screen.getByText('iOS 17.0');
    screen.getByText('1.0.0');
  });

  it('hides diagnostic info when toggle is off', () => {
    mockHookReturn.diagnostics.includeDiagnostics = false;
    render(<BugReportScreen />);
    expect(screen.queryByText(/Diagnostic Information Preview/)).toBeNull();
  });
});

// ── Submit button ─────────────────────────────────────────────────────────────

describe('BugReportScreen — submit button', () => {
  it('renders submit button', () => {
    render(<BugReportScreen />);
    screen.getByText('Submit Bug Report');
  });

  it('submit button is disabled when title is empty', () => {
    mockHookReturn.fields.title = '';
    mockHookReturn.fields.description = 'Some description';
    render(<BugReportScreen />);

    const submitButton = screen.getByText('Submit Bug Report').parent;
    expect(submitButton?.props.disabled).toBe(true);
  });

  it('submit button is disabled when description is empty', () => {
    mockHookReturn.fields.title = 'Some title';
    mockHookReturn.fields.description = '';
    render(<BugReportScreen />);

    const submitButton = screen.getByText('Submit Bug Report').parent;
    expect(submitButton?.props.disabled).toBe(true);
  });

  it('submit button calls handleSubmitBugReport when title and description are filled', () => {
    mockHookReturn.fields.title = 'App crashes';
    mockHookReturn.fields.description = 'When scanning passport';
    render(<BugReportScreen />);

    fireEvent.press(screen.getByText('Submit Bug Report'));

    expect(mockHandleSubmitBugReport).toHaveBeenCalled();
  });

  it('shows "Submitting Report..." when isSubmitting is true', () => {
    mockHookReturn.submission.isSubmitting = true;
    render(<BugReportScreen />);
    screen.getByText('Submitting Report...');
  });
});

// ── Privacy notice ────────────────────────────────────────────────────────────

describe('BugReportScreen — privacy', () => {
  it('renders privacy notice', () => {
    render(<BugReportScreen />);
    screen.getByText('Privacy & Security');
    screen.getByText(/No passport or personal data is included/);
  });
});
