/**
 * Unit tests for useBugReport hook.
 *
 * Tests cover initial state, state setters, diagnostics generation,
 * submission validation, helper functions, and options constants.
 */

import { renderHook, act } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('../../src/stores/useAppStore', () => ({
  useAppStore: () => ({
    preferences: {
      language: 'en',
      biometricEnabled: false,
      analyticsEnabled: true,
    },
    theme: 'light',
  }),
}));

jest.mock('../../src/stores/useProfileStore', () => ({
  useProfileStore: () => ({
    profile: { id: 'profile-1', givenNames: 'Test', surname: 'User' },
  }),
}));

jest.mock('../../src/stores/useTripStore', () => ({
  useTripStore: () => ({
    trips: [{ id: 'trip-1' }, { id: 'trip-2' }],
  }),
}));

// Mock Select to avoid pulling in react-native-haptic-feedback
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

  it('setSeverity updates severity', () => {
    const { result } = renderHook(() => useBugReport());
    act(() => { result.current.setSeverity('critical'); });
    expect(result.current.severity).toBe('critical');
  });

  it('setTitle updates title', () => {
    const { result } = renderHook(() => useBugReport());
    act(() => { result.current.setTitle('App crashes'); });
    expect(result.current.title).toBe('App crashes');
  });

  it('setDescription updates description', () => {
    const { result } = renderHook(() => useBugReport());
    act(() => { result.current.setDescription('Bug details'); });
    expect(result.current.description).toBe('Bug details');
  });

  it('generates diagnosticInfo on mount', () => {
    const { result } = renderHook(() => useBugReport());
    expect(result.current.diagnosticInfo).not.toBeNull();
    expect(result.current.diagnosticInfo).toEqual(
      expect.objectContaining({
        platform: Platform.OS,
        appVersion: '1.0.0',
        language: 'en',
        theme: 'light',
        deviceInfo: expect.objectContaining({
          hasProfile: true,
          tripsCount: 2,
        }),
      })
    );
  });

  it('shows alert when title is empty on submit', async () => {
    const { result } = renderHook(() => useBugReport());
    act(() => { result.current.setDescription('Some desc'); });
    await act(async () => { await result.current.handleSubmitBugReport(); });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Missing Information',
      'Please provide a bug title.'
    );
  });

  it('shows alert when description is empty on submit', async () => {
    const { result } = renderHook(() => useBugReport());
    act(() => { result.current.setTitle('Bug title'); });
    await act(async () => { await result.current.handleSubmitBugReport(); });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Missing Information',
      'Please describe the bug you encountered.'
    );
  });

  it('submits successfully and resets form via Alert callback', async () => {
    const { result } = renderHook(() => useBugReport());

    act(() => {
      result.current.setTitle('Crash on scan');
      result.current.setDescription('App crashes');
      result.current.setSeverity('high');
    });

    await act(async () => {
      await result.current.handleSubmitBugReport();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Bug Report Submitted',
      expect.stringContaining('high severity issue'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'OK' }),
      ])
    );

    // Simulate pressing OK
    const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'Bug Report Submitted'
    );
    const okButton = alertCall[2][0];
    act(() => { okButton.onPress(); });

    expect(result.current.title).toBe('');
    expect(result.current.description).toBe('');
    expect(result.current.severity).toBe('medium');
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  describe('getSeverityStatus', () => {
    it('returns correct status for each severity', () => {
      const { result } = renderHook(() => useBugReport());
      expect(result.current.getSeverityStatus('low')).toBe('info');
      expect(result.current.getSeverityStatus('medium')).toBe('warning');
      expect(result.current.getSeverityStatus('high')).toBe('error');
      expect(result.current.getSeverityStatus('critical')).toBe('error');
      expect(result.current.getSeverityStatus('unknown')).toBe('neutral');
    });
  });

  describe('getSeverityEmoji', () => {
    it('returns an emoji for each severity', () => {
      const { result } = renderHook(() => useBugReport());
      expect(result.current.getSeverityEmoji('low')).toBeTruthy();
      expect(result.current.getSeverityEmoji('medium')).toBeTruthy();
      expect(result.current.getSeverityEmoji('high')).toBeTruthy();
      expect(result.current.getSeverityEmoji('critical')).toBeTruthy();
    });
  });

  it('returns severityOptions and categoryOptions', () => {
    const { result } = renderHook(() => useBugReport());
    expect(result.current.severityOptions).toHaveLength(4);
    expect(result.current.categoryOptions).toHaveLength(8);
  });
});
