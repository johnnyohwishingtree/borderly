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

    expect(result.current.severity).toBe('medium');
    expect(result.current.category).toBe('general');
    expect(result.current.title).toBe('');
    expect(result.current.description).toBe('');
    expect(result.current.stepsToReproduce).toBe('');
    expect(result.current.includeDiagnostics).toBe(true);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('exposes severity and category options', () => {
    const { result } = renderHook(() => useBugReport());

    expect(result.current.severityOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'low' }),
        expect.objectContaining({ value: 'medium' }),
        expect.objectContaining({ value: 'high' }),
        expect.objectContaining({ value: 'critical' }),
      ])
    );

    expect(result.current.categoryOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'general' }),
        expect.objectContaining({ value: 'passport-scan' }),
      ])
    );
  });

  it('generates diagnostic info on mount', () => {
    const { result } = renderHook(() => useBugReport());

    expect(result.current.diagnosticInfo).not.toBeNull();
    expect(result.current.diagnosticInfo?.platform).toBe(Platform.OS);
    expect(result.current.diagnosticInfo?.language).toBe('en');
    expect(result.current.diagnosticInfo?.theme).toBe('light');
    expect(result.current.diagnosticInfo?.deviceInfo.tripsCount).toBe(2);
    expect(result.current.diagnosticInfo?.deviceInfo.hasProfile).toBe(true);
  });

  it('updates state via setters', () => {
    const { result } = renderHook(() => useBugReport());

    act(() => result.current.setSeverity('high'));
    expect(result.current.severity).toBe('high');

    act(() => result.current.setCategory('passport-scan'));
    expect(result.current.category).toBe('passport-scan');

    act(() => result.current.setTitle('Crash on scan'));
    expect(result.current.title).toBe('Crash on scan');

    act(() => result.current.setDescription('App crashes when scanning'));
    expect(result.current.description).toBe('App crashes when scanning');

    act(() => result.current.setStepsToReproduce('1. Open scanner\n2. Scan'));
    expect(result.current.stepsToReproduce).toBe('1. Open scanner\n2. Scan');

    act(() => result.current.setIncludeDiagnostics(false));
    expect(result.current.includeDiagnostics).toBe(false);
  });

  it('shows alert when title is empty on submit', async () => {
    const { result } = renderHook(() => useBugReport());

    await act(async () => {
      await result.current.handleSubmitBugReport();
    });

    expect(Alert.alert).toHaveBeenCalledWith('Missing Information', 'Please provide a bug title.');
  });

  it('shows alert when description is empty on submit', async () => {
    const { result } = renderHook(() => useBugReport());

    act(() => result.current.setTitle('Some bug'));

    await act(async () => {
      await result.current.handleSubmitBugReport();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Missing Information',
      'Please describe the bug you encountered.'
    );
  });

  it('getSeverityStatus returns correct status', () => {
    const { result } = renderHook(() => useBugReport());

    expect(result.current.getSeverityStatus('low')).toBe('info');
    expect(result.current.getSeverityStatus('medium')).toBe('warning');
    expect(result.current.getSeverityStatus('high')).toBe('error');
    expect(result.current.getSeverityStatus('critical')).toBe('error');
    expect(result.current.getSeverityStatus('unknown')).toBe('neutral');
  });

  it('getSeverityEmoji returns correct emoji', () => {
    const { result } = renderHook(() => useBugReport());

    expect(result.current.getSeverityEmoji('low')).toBe('\u{1F7E2}');
    expect(result.current.getSeverityEmoji('medium')).toBe('\u{1F7E1}');
    expect(result.current.getSeverityEmoji('high')).toBe('\u{1F7E0}');
    expect(result.current.getSeverityEmoji('critical')).toBe('\u{1F534}');
  });
});
