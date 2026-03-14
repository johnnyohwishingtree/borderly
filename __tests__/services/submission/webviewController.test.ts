/**
 * Tests for WebViewController — specifically the real WebView ref wiring
 * added in Story 4 (setWebViewRef + handleWebViewMessage).
 */
import { WebViewController } from '../../../src/services/submission/webviewController';
import type { PortalWebViewHandle } from '../../../src/components/submission/PortalWebView';

function makeMockHandle(onInject?: (script: string) => void): PortalWebViewHandle {
  return {
    injectJavaScript: jest.fn((script: string) => {
      onInject?.(script);
    }),
  };
}

describe('WebViewController.setWebViewRef', () => {
  it('marks the controller as initialized after setWebViewRef', () => {
    const controller = new WebViewController();
    const handle = makeMockHandle();
    expect(controller.isReady()).toBe(false);
    controller.setWebViewRef(handle);
    expect(controller.isReady()).toBe(true);
  });

  it('calls handle.injectJavaScript when executeScript is invoked', async () => {
    const injectedScripts: string[] = [];
    const handle = makeMockHandle((script) => injectedScripts.push(script));
    const controller = new WebViewController();
    controller.setWebViewRef(handle);

    // Fire-and-forget: don't await, just verify the injection call happened
    controller.executeScript({ code: '1 + 1', timeout: 5000, expectsResult: true }).catch(() => {
      // Timeout is expected in test — we only care that injection happened
    });

    // Give a tick for the synchronous injection
    await Promise.resolve();
    expect(injectedScripts.length).toBe(1);
    expect(injectedScripts[0]).toContain('__WVC_RESULT__');
  });

  it('can be called twice (re-wires to a new handle)', () => {
    const controller = new WebViewController();
    const handle1 = makeMockHandle();
    const handle2 = makeMockHandle();

    controller.setWebViewRef(handle1);
    expect(controller.isReady()).toBe(true);

    // Re-wire to a second handle — should not throw
    controller.setWebViewRef(handle2);
    expect(controller.isReady()).toBe(true);
  });
});

describe('WebViewController.handleWebViewMessage', () => {
  it('returns false for non-WVC messages', () => {
    const controller = new WebViewController();
    controller.setWebViewRef(makeMockHandle());
    const handled = controller.handleWebViewMessage(
      JSON.stringify({ type: 'AUTO_FILL_RESULT', filled: ['a'] })
    );
    expect(handled).toBe(false);
  });

  it('returns false for malformed JSON', () => {
    const controller = new WebViewController();
    controller.setWebViewRef(makeMockHandle());
    expect(controller.handleWebViewMessage('not json')).toBe(false);
  });

  it('resolves a pending executeScript promise when matching message arrives', async () => {
    let capturedScript = '';
    const handle = makeMockHandle((script) => { capturedScript = script; });
    const controller = new WebViewController();
    controller.setWebViewRef(handle);

    const scriptPromise = controller.executeScript({
      code: '42',
      timeout: 5000,
      expectsResult: true,
    });

    // Extract the callbackId from the injected script
    await Promise.resolve(); // let the injection happen
    const idMatch = capturedScript.match(/__WVC_RESULT__.*?id.*?([a-z0-9_]+[a-z0-9])/);
    // Alternative: extract via JSON-like parsing
    const idJsonMatch = capturedScript.match(/"id"\s*:\s*"([^"]+)"/);
    expect(idJsonMatch).not.toBeNull();
    const callbackId = idJsonMatch![1];

    // Simulate the WebView posting back the result
    const handled = controller.handleWebViewMessage(
      JSON.stringify({ type: '__WVC_RESULT__', id: callbackId, result: 42 })
    );
    expect(handled).toBe(true);

    const result = await scriptPromise;
    expect(result).toBe(42);
  });

  it('rejects a pending executeScript promise on error message', async () => {
    let capturedScript = '';
    const handle = makeMockHandle((script) => { capturedScript = script; });
    const controller = new WebViewController();
    controller.setWebViewRef(handle);

    const scriptPromise = controller.executeScript({
      code: 'throw new Error("oops")',
      timeout: 5000,
      expectsResult: true,
    });

    await Promise.resolve();
    const idJsonMatch = capturedScript.match(/"id"\s*:\s*"([^"]+)"/);
    expect(idJsonMatch).not.toBeNull();
    const callbackId = idJsonMatch![1];

    controller.handleWebViewMessage(
      JSON.stringify({ type: '__WVC_RESULT__', id: callbackId, error: 'oops' })
    );

    await expect(scriptPromise).rejects.toThrow('oops');
  });
});

describe('AutomationScriptRegistry.getScriptSync', () => {
  it('returns built-in scripts synchronously', () => {
    const { AutomationScriptRegistry } = require('../../../src/services/submission/automationScripts');
    const registry = new AutomationScriptRegistry();
    expect(registry.getScriptSync('JPN')).not.toBeNull();
    expect(registry.getScriptSync('MYS')).not.toBeNull();
    expect(registry.getScriptSync('SGP')).not.toBeNull();
  });

  it('returns null for unknown country codes', () => {
    const { AutomationScriptRegistry } = require('../../../src/services/submission/automationScripts');
    const registry = new AutomationScriptRegistry();
    expect(registry.getScriptSync('ZZZ')).toBeNull();
  });

  it('singleton automationScriptRegistry has the same built-in scripts', () => {
    const { automationScriptRegistry } = require('../../../src/services/submission/automationScripts');
    expect(automationScriptRegistry.getScriptSync('JPN')).not.toBeNull();
    expect(automationScriptRegistry.getScriptSync('SGP')).not.toBeNull();
  });
});
