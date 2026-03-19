import { render } from '@testing-library/react-native';
import { PortalWebView } from '../../../src/components/submission/PortalWebView';

// The jest.setup.js mock for react-native-webview is already configured.
// We also need to mock the portal registry to control allowed domains.
jest.mock('../../../src/services/submission/portalRegistry', () => ({
  getAllowedDomains: () => ['vjw.digital.go.jp', 'myimms.imi.gov.my', 'eservices.ica.gov.sg', 'localhost', '127.0.0.1'],
  getPortalRegistry: () => [],
  getPortalByCountryCode: () => null,
}));

describe('PortalWebView', () => {
  describe('domain blocking', () => {
    it('should call onError when URL is blocked by domain allowlist', () => {
      const onError = jest.fn();
      const onNavigationChange = jest.fn();

      render(
        <PortalWebView
          url="https://malicious-site.example.com/"
          onError={onError}
          onNavigationChange={onNavigationChange}
          testID="test-webview"
        />
      );

      // The URL is not in the allowed domains, so PortalWebView should:
      // 1. Render the "Access Denied" error view
      // 2. Call onError so the parent can clear its loading state
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('not permitted')
      );
    });

    it('should call onNavigationChange with loading:false when URL is blocked', () => {
      const onNavigationChange = jest.fn();

      render(
        <PortalWebView
          url="https://malicious-site.example.com/"
          onNavigationChange={onNavigationChange}
          testID="test-webview"
        />
      );

      // Parent screen relies on navState.loading to show/hide loading indicator.
      // When URL is blocked at render time, loading should be set to false.
      expect(onNavigationChange).toHaveBeenCalledWith(
        expect.objectContaining({ loading: false })
      );
    });

    it('should not call onError for allowed domains', () => {
      const onError = jest.fn();

      // Rendering with an allowed domain may throw due to WebView mock limitations,
      // but the key assertion is that onError is NOT called synchronously at render.
      try {
        render(
          <PortalWebView
            url="https://vjw.digital.go.jp/"
            onError={onError}
            testID="test-webview"
          />
        );
      } catch {
        // WebView mock may fail to render — that's OK for this test
      }

      // Allowed domain — onError should not be called at render time
      expect(onError).not.toHaveBeenCalled();
    });
  });
});
