/**
 * Unit tests for useBugReport hook.
 *
 * Tests cover initial state, state setters, diagnostics generation,
 * submission validation, helper functions, and options constants.
 */

import { renderHook, act } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';

// ── Stable mock data (prevents infinite re-render loops) ─────────────────────

const MOCK_PREFERENCES = {
  language: 'en',
  biometricEnabled: false,
  analyticsEnabled: true,
};

const MOCK_PROFILE = { id: 'profile-1', givenNames: 'Test', surname: 'User' };
const MOCK_TRIPS = [{ id: 'trip-1' }, { id: 'trip-2' }];

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('../../src/stores/useAppStore', () => ({
  useAppStore: () => ({
    preferences: MOCK_PREFERENCES,
    theme: 'light',
  }),
}));

jest.mock('../../src/stores/useProfileStore', () => ({
  useProfileStore: () => ({
    profile: MOCK_PROFILE,
  }),
}));

jest.mock('../../src/stores/useTripStore', () => ({
  useTripStore: () => ({
    trips: MOCK_TRIPS,
  }),
}));

jest.mock('../../src/components/ui/Select', () => ({}));

jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

import { useBugReport } from '../../src/hooks/useBugReport';

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useBugReport', () => {
  it('returns correct initial state values', () => {
    const { result } = renderHook(() => useBugReport());

    expect(result.current.fields.severity).toBe('medium');
    expect(result.current.fields.category).toBe('general');
    expect(result.current.fields.title).toBe('');
    expect(result.current.fields.description).toBe('');
    expect(result.current.fields.stepsToReproduce).toBe('');
    expect(result.current.diagnostics.includeDiagnostics).toBe(true);
    expect(result.current.submission.isSubmitting).toBe(false);
  });

  it('exposes severity and category options', () => {
    const { result } = renderHook(() => useBugReport());

    expect(result.current.options.severityOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'low' }),
        expect.objectContaining({ value: 'medium' }),
        expect.objectContaining({ value: 'high' }),
        expect.objectContaining({ value: 'critical' }),
      ])
    );

    expect(result.current.options.categoryOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'general' }),
        expect.objectContaining({ value: 'passport-scan' }),
      ])
    );
  });

  it('generates diagnostic info on mount', () => {
    const { result } = renderHook(() => useBugReport());

    expect(result.current.diagnostics.diagnosticInfo).not.toBeNull();
    expect(result.current.diagnostics.diagnosticInfo?.platform).toBe(Platform.OS);
    expect(result.current.diagnostics.diagnosticInfo?.language).toBe('en');
    expect(result.current.diagnostics.diagnosticInfo?.theme).toBe('light');
    expect(result.current.diagnostics.diagnosticInfo?.deviceInfo.tripsCount).toBe(2);
    expect(result.current.diagnostics.diagnosticInfo?.deviceInfo.hasProfile).toBe(true);
  });

  it('updates state via setters', () => {
    const { result } = renderHook(() => useBugReport());

    act(() => result.current.fields.setSeverity('high'));
    expect(result.current.fields.severity).toBe('high');

    act(() => result.current.fields.setCategory('passport-scan'));
    expect(result.current.fields.category).toBe('passport-scan');

    act(() => result.current.fields.setTitle('Crash on scan'));
    expect(result.current.fields.title).toBe('Crash on scan');

    act(() => result.current.fields.setDescription('App crashes when scanning'));
    expect(result.current.fields.description).toBe('App crashes when scanning');

    act(() => result.current.fields.setStepsToReproduce('1. Open scanner\n2. Scan'));
    expect(result.current.fields.stepsToReproduce).toBe('1. Open scanner\n2. Scan');

    act(() => result.current.diagnostics.setIncludeDiagnostics(false));
    expect(result.current.diagnostics.includeDiagnostics).toBe(false);
  });

  it('shows alert when title is empty on submit', async () => {
    const { result } = renderHook(() => useBugReport());

    await act(async () => {
      await result.current.submission.handleSubmitBugReport();
    });

    expect(Alert.alert).toHaveBeenCalledWith('Missing Information', 'Please provide a bug title.');
  });

  it('shows alert when description is empty on submit', async () => {
    const { result } = renderHook(() => useBugReport());

    act(() => result.current.fields.setTitle('Some bug'));

    await act(async () => {
      await result.current.submission.handleSubmitBugReport();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Missing Information',
      'Please describe the bug you encountered.'
    );
  });

  it('getSeverityStatus returns correct status', () => {
    const { result } = renderHook(() => useBugReport());

    expect(result.current.helpers.getSeverityStatus('low')).toBe('info');
    expect(result.current.helpers.getSeverityStatus('medium')).toBe('warning');
    expect(result.current.helpers.getSeverityStatus('high')).toBe('error');
    expect(result.current.helpers.getSeverityStatus('critical')).toBe('error');
    expect(result.current.helpers.getSeverityStatus('unknown')).toBe('neutral');
  });

  it('getSeverityEmoji returns correct emoji', () => {
    const { result } = renderHook(() => useBugReport());

    expect(result.current.helpers.getSeverityEmoji('low')).toBe('\u{1F7E2}');
    expect(result.current.helpers.getSeverityEmoji('medium')).toBe('\u{1F7E1}');
    expect(result.current.helpers.getSeverityEmoji('high')).toBe('\u{1F7E0}');
    expect(result.current.helpers.getSeverityEmoji('critical')).toBe('\u{1F534}');
  });
});
