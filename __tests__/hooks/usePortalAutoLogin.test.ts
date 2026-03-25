/**
 * Tests for usePortalAutoLogin hook.
 * Covers: initial state, resetForNewPage, auto-login attempt, credential save, error.
 */
import { renderHook, act } from '@testing-library/react-native';
import { usePortalAutoLogin } from '@/hooks/usePortalAutoLogin';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockResolveCredential = jest.fn();
const mockBuildLoginScript = jest.fn();
const mockBuildUsernameExtractionScript = jest.fn();
const mockStoreCredential = jest.fn();

jest.mock('@/services/submission/submissionCoordinator', () => ({
  submissionCoordinator: {
    resolveCredential: (...args: unknown[]) => mockResolveCredential(...args),
    buildLoginScript: (...args: unknown[]) => mockBuildLoginScript(...args),
    buildUsernameExtractionScript: (...args: unknown[]) => mockBuildUsernameExtractionScript(...args),
    storeCredential: (...args: unknown[]) => mockStoreCredential(...args),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderAutoLogin(overrides = {}) {
  const webViewRef = { current: { injectJavaScript: jest.fn() } };

  const defaultProps = {
    webViewRef,
    countryCode: 'JPN',
    schema: { countryCode: 'JPN', portalUrl: 'https://vjw.go.jp' },
    selectedProfileId: 'prof-1',
    primaryProfileId: 'prof-1',
    profileEmail: 'test@example.com',
    ...overrides,
  };

  return { ...renderHook(() => usePortalAutoLogin(defaultProps as any)), webViewRef };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

describe('usePortalAutoLogin', () => {
  describe('initial state', () => {
    it('starts with idle banner and no credential prompt', () => {
      const { result } = renderAutoLogin();

      expect(result.current.autoLoginBannerState).toBe('idle');
      expect(result.current.showSaveCredentialsPrompt).toBe(false);
      expect(result.current.extractedUsername).toBe('');
    });
  });

  describe('resetForNewPage', () => {
    it('resets banner state and refs for new page navigation', () => {
      const { result } = renderAutoLogin();

      // Set banner to failed first
      act(() => {
        result.current.handleAutoLoginResult(false);
      });
      expect(result.current.autoLoginBannerState).toBe('failed');

      // Reset
      act(() => {
        result.current.resetForNewPage();
      });

      expect(result.current.autoLoginBannerState).toBe('idle');
      expect(result.current.autoLoginTriggeredRef.current).toBe(false);
      expect(result.current.prevPageTypeRef.current).toBe('unknown');
    });
  });

  describe('attemptAutoLogin', () => {
    it('resolves credentials and injects login script', async () => {
      const cred = { username: 'user', password: 'pass' };
      mockResolveCredential.mockResolvedValue(cred);
      mockBuildLoginScript.mockReturnValue('javascript:login()');

      const { result, webViewRef } = renderAutoLogin();

      await act(async () => {
        await result.current.attemptAutoLogin();
      });

      expect(mockResolveCredential).toHaveBeenCalled();
      expect(webViewRef.current.injectJavaScript).toHaveBeenCalledWith('javascript:login()');
    });

    it('does not attempt when already attempted', async () => {
      const { result } = renderAutoLogin();

      // First attempt
      mockResolveCredential.mockResolvedValue(null);
      await act(async () => {
        await result.current.attemptAutoLogin();
      });

      // Second attempt — should skip
      mockResolveCredential.mockClear();
      await act(async () => {
        await result.current.attemptAutoLogin();
      });

      expect(mockResolveCredential).not.toHaveBeenCalled();
    });

    it('handles credential resolution failure gracefully', async () => {
      mockResolveCredential.mockRejectedValue(new Error('keychain error'));

      const { result } = renderAutoLogin();

      await act(async () => {
        await result.current.attemptAutoLogin();
      });

      // Should not crash, banner stays idle or goes to failed
      expect(result.current.autoLoginBannerState).not.toBe('in_progress');
    });
  });

  describe('handleAutoLoginResult', () => {
    it('sets banner to failed on unsuccessful login', () => {
      const { result } = renderAutoLogin();

      act(() => {
        result.current.handleAutoLoginResult(false);
      });

      expect(result.current.autoLoginBannerState).toBe('failed');
    });
  });

  describe('handleCredentialSave', () => {
    it('stores credential via coordinator', async () => {
      mockStoreCredential.mockResolvedValue(undefined);

      const { result } = renderAutoLogin();

      await act(async () => {
        await result.current.handleCredentialSave('user', 'pass');
      });

      expect(mockStoreCredential).toHaveBeenCalledWith(
        'prof-1',  // selectedProfileId
        'JPN',     // countryCode
        'user',    // username
        'pass',    // password
      );
    });
  });

  describe('dismissCredentialPrompt', () => {
    it('hides the credential save prompt', () => {
      const { result } = renderAutoLogin();

      act(() => {
        result.current.handleShowCredentialPrompt();
      });

      act(() => {
        result.current.dismissCredentialPrompt();
      });

      expect(result.current.showSaveCredentialsPrompt).toBe(false);
    });
  });
});
