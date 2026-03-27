import { NavigationController } from '../../../src/services/automation/navigation/navigationController';
import type {
  NavigationFlow,
} from '../../../src/services/automation/navigation/navigationTypes';

// Mock navigation scripts
jest.mock(
  '../../../src/services/automation/navigation/navigationScripts',
  () => ({
    generateNavigationScript: jest
      .fn()
      .mockReturnValue('navigation_script'),
    generateHistoryScript: jest.fn().mockReturnValue('history_script'),
    generatePageLoadScript: jest.fn().mockReturnValue('page_load_script'),
  }),
);

// Mock FlowExecutor
jest.mock(
  '../../../src/services/automation/navigation/flowExecutor',
  () => ({
    FlowExecutor: jest.fn().mockImplementation(() => ({
      executeFlow: jest.fn().mockResolvedValue({
        success: true,
        data: { flowId: 'test-flow', stepsCompleted: 2, duration: 500 },
      }),
    })),
  }),
);

function createFlow(overrides: Partial<NavigationFlow> = {}): NavigationFlow {
  return {
    id: 'test-flow',
    name: 'Test Flow',
    description: 'A test navigation flow',
    steps: [],
    maxDuration: 60000,
    sessionPersistence: false,
    ...overrides,
  };
}

describe('NavigationController', () => {
  let controller: NavigationController;
  let executeScript: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new NavigationController({
      maxHistorySize: 10,
      defaultTimeout: 5000,
      retryAttempts: 2,
      navigationDelay: 100,
      enableStateTracking: true,
      enableScreenshots: false,
    });
    executeScript = jest.fn();
  });

  describe('navigateTo', () => {
    it('updates state and history on successful navigation', async () => {
      executeScript.mockResolvedValue({
        success: true,
        currentUrl: 'https://portal.example.com/form',
        currentTitle: 'Entry Form',
        duration: 200,
      });

      const result = await controller.navigateTo(
        'https://portal.example.com/form',
        executeScript,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({
          url: 'https://portal.example.com/form',
          title: 'Entry Form',
          duration: 200,
        }),
      );

      const state = controller.getState();
      expect(state.currentUrl).toBe('https://portal.example.com/form');
      expect(state.pageTitle).toBe('Entry Form');
      expect(state.isLoading).toBe(false);
      expect(state.steps).toHaveLength(1);
      expect(state.steps[0].success).toBe(true);
    });

    it('adds navigated URL to browser history', async () => {
      executeScript.mockResolvedValue({
        success: true,
        currentUrl: 'https://portal.example.com/step1',
        currentTitle: 'Step 1',
        duration: 100,
      });

      await controller.navigateTo(
        'https://portal.example.com/step1',
        executeScript,
      );

      const history = controller.getHistory();
      expect(history.entries).toHaveLength(1);
      expect(history.entries[0].url).toBe(
        'https://portal.example.com/step1',
      );
      expect(history.currentIndex).toBe(0);
      expect(history.canGoBack).toBe(false);
    });

    it('returns error when navigation script fails', async () => {
      executeScript.mockResolvedValue({
        success: false,
        error: 'Page not found',
      });

      const result = await controller.navigateTo(
        'https://portal.example.com/missing',
        executeScript,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Page not found');

      const state = controller.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Page not found');
    });

    it('returns error when executeScript throws', async () => {
      executeScript.mockRejectedValue(new Error('WebView disconnected'));

      const result = await controller.navigateTo(
        'https://portal.example.com',
        executeScript,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Navigation failed');
      expect(result.error).toContain('WebView disconnected');
    });

    it('emits navigation:success event on successful navigation', async () => {
      const listener = jest.fn();
      controller.addEventListener('navigation:success', listener);

      executeScript.mockResolvedValue({
        success: true,
        currentUrl: 'https://portal.example.com/form',
        currentTitle: 'Form',
        duration: 150,
      });

      await controller.navigateTo(
        'https://portal.example.com/form',
        executeScript,
      );

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          step: expect.objectContaining({ success: true }),
        }),
      );
    });

    it('emits navigation:error event on failed navigation', async () => {
      const listener = jest.fn();
      controller.addEventListener('navigation:error', listener);

      executeScript.mockResolvedValue({
        success: false,
        error: 'Timeout',
      });

      await controller.navigateTo(
        'https://portal.example.com',
        executeScript,
      );

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Timeout' }),
      );
    });

    it('tracks previousUrl when navigating between pages', async () => {
      executeScript
        .mockResolvedValueOnce({
          success: true,
          currentUrl: 'https://portal.example.com/page1',
          currentTitle: 'Page 1',
          duration: 100,
        })
        .mockResolvedValueOnce({
          success: true,
          currentUrl: 'https://portal.example.com/page2',
          currentTitle: 'Page 2',
          duration: 100,
        });

      await controller.navigateTo(
        'https://portal.example.com/page1',
        executeScript,
      );
      await controller.navigateTo(
        'https://portal.example.com/page2',
        executeScript,
      );

      const state = controller.getState();
      expect(state.currentUrl).toBe('https://portal.example.com/page2');
      expect(state.previousUrl).toBe('https://portal.example.com/page1');
    });
  });

  describe('registerFlow', () => {
    it('stores a navigation flow by ID for later execution', async () => {
      const flow = createFlow({ id: 'customs-jpn' });
      controller.registerFlow(flow);

      // Verify we can execute it (FlowExecutor is mocked)
      const result = await controller.executeFlow(
        'customs-jpn',
        executeScript,
      );
      expect(result.success).toBe(true);
    });

    it('returns error when executing an unregistered flow', async () => {
      const result = await controller.executeFlow(
        'nonexistent',
        executeScript,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Navigation flow not found');
    });
  });

  describe('getState', () => {
    it('returns initial state with empty URL and no steps', () => {
      const state = controller.getState();

      expect(state.currentUrl).toBe('');
      expect(state.pageTitle).toBe('');
      expect(state.steps).toHaveLength(0);
      expect(state.isLoading).toBe(false);
      expect(typeof state.sessionId).toBe('string');
      expect(state.sessionId.length).toBeGreaterThan(0);
    });

    it('returns a copy of state that does not mutate internal state', () => {
      const state = controller.getState();
      state.currentUrl = 'https://tampered.com';

      expect(controller.getState().currentUrl).toBe('');
    });
  });

  describe('getHistory', () => {
    it('returns initial empty history', () => {
      const history = controller.getHistory();

      expect(history.canGoBack).toBe(false);
      expect(history.canGoForward).toBe(false);
      expect(history.currentIndex).toBe(-1);
      expect(history.entries).toHaveLength(0);
    });

    it('returns a shallow copy so top-level properties do not mutate internal state', () => {
      const history = controller.getHistory();
      history.canGoBack = true;
      history.currentIndex = 99;

      const fresh = controller.getHistory();
      expect(fresh.canGoBack).toBe(false);
      expect(fresh.currentIndex).toBe(-1);
    });
  });

  describe('goBack', () => {
    it('navigates back in history when previous pages exist', async () => {
      // Navigate to two pages to build history
      executeScript
        .mockResolvedValueOnce({
          success: true,
          currentUrl: 'https://portal.example.com/step1',
          currentTitle: 'Step 1',
          duration: 100,
        })
        .mockResolvedValueOnce({
          success: true,
          currentUrl: 'https://portal.example.com/step2',
          currentTitle: 'Step 2',
          duration: 100,
        });

      await controller.navigateTo(
        'https://portal.example.com/step1',
        executeScript,
      );
      await controller.navigateTo(
        'https://portal.example.com/step2',
        executeScript,
      );

      // Go back
      executeScript.mockResolvedValue({
        success: true,
        currentUrl: 'https://portal.example.com/step1',
      });

      const result = await controller.goBack(executeScript);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({
          url: 'https://portal.example.com/step1',
        }),
      );
    });

    it('returns error when there is no previous page in history', async () => {
      const result = await controller.goBack(executeScript);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot go back');
    });

    it('returns error when executeScript throws during back navigation', async () => {
      // Build history first
      executeScript
        .mockResolvedValueOnce({
          success: true,
          currentUrl: 'https://portal.example.com/p1',
          currentTitle: 'P1',
          duration: 50,
        })
        .mockResolvedValueOnce({
          success: true,
          currentUrl: 'https://portal.example.com/p2',
          currentTitle: 'P2',
          duration: 50,
        });

      await controller.navigateTo(
        'https://portal.example.com/p1',
        executeScript,
      );
      await controller.navigateTo(
        'https://portal.example.com/p2',
        executeScript,
      );

      executeScript.mockRejectedValue(new Error('Script timeout'));

      const result = await controller.goBack(executeScript);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Back navigation failed');
    });
  });

  describe('goForward', () => {
    it('navigates forward after going back', async () => {
      // Build history with two pages
      executeScript
        .mockResolvedValueOnce({
          success: true,
          currentUrl: 'https://portal.example.com/step1',
          currentTitle: 'Step 1',
          duration: 100,
        })
        .mockResolvedValueOnce({
          success: true,
          currentUrl: 'https://portal.example.com/step2',
          currentTitle: 'Step 2',
          duration: 100,
        });

      await controller.navigateTo(
        'https://portal.example.com/step1',
        executeScript,
      );
      await controller.navigateTo(
        'https://portal.example.com/step2',
        executeScript,
      );

      // Go back first
      executeScript.mockResolvedValueOnce({
        success: true,
        currentUrl: 'https://portal.example.com/step1',
      });
      await controller.goBack(executeScript);

      // Now go forward
      executeScript.mockResolvedValueOnce({
        success: true,
        currentUrl: 'https://portal.example.com/step2',
      });

      const result = await controller.goForward(executeScript);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({
          url: 'https://portal.example.com/step2',
        }),
      );
    });

    it('returns error when there is no next page in history', async () => {
      const result = await controller.goForward(executeScript);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot go forward');
    });
  });

  describe('addEventListener / removeEventListener', () => {
    it('calls registered listener when event is emitted', async () => {
      const listener = jest.fn();
      controller.addEventListener('navigation:success', listener);

      executeScript.mockResolvedValue({
        success: true,
        currentUrl: 'https://portal.example.com',
        currentTitle: 'Portal',
        duration: 100,
      });

      await controller.navigateTo(
        'https://portal.example.com',
        executeScript,
      );

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('stops calling listener after removal', async () => {
      const listener = jest.fn();
      controller.addEventListener('navigation:success', listener);
      controller.removeEventListener('navigation:success', listener);

      executeScript.mockResolvedValue({
        success: true,
        currentUrl: 'https://portal.example.com',
        currentTitle: 'Portal',
        duration: 100,
      });

      await controller.navigateTo(
        'https://portal.example.com',
        executeScript,
      );

      expect(listener).not.toHaveBeenCalled();
    });

    it('supports multiple listeners on the same event', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      controller.addEventListener('navigation:success', listener1);
      controller.addEventListener('navigation:success', listener2);

      executeScript.mockResolvedValue({
        success: true,
        currentUrl: 'https://portal.example.com',
        currentTitle: 'Portal',
        duration: 100,
      });

      await controller.navigateTo(
        'https://portal.example.com',
        executeScript,
      );

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset', () => {
    it('clears state, history, and generates a new session ID', async () => {
      executeScript.mockResolvedValue({
        success: true,
        currentUrl: 'https://portal.example.com/form',
        currentTitle: 'Form',
        duration: 100,
      });

      await controller.navigateTo(
        'https://portal.example.com/form',
        executeScript,
      );

      const sessionBefore = controller.getState().sessionId;

      controller.reset();

      const state = controller.getState();
      expect(state.currentUrl).toBe('');
      expect(state.pageTitle).toBe('');
      expect(state.steps).toHaveLength(0);
      expect(state.isLoading).toBe(false);
      expect(state.sessionId).not.toBe(sessionBefore);

      const history = controller.getHistory();
      expect(history.entries).toHaveLength(0);
      expect(history.currentIndex).toBe(-1);
      expect(history.canGoBack).toBe(false);
      expect(history.canGoForward).toBe(false);
    });
  });
});
