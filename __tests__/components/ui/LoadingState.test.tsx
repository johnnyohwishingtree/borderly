/**
 * Tests for LoadingState re-export module.
 * Verifies LoadingState correctly re-exports from LoadingStates.
 */

describe('LoadingState', () => {
  it('re-exports default component from LoadingStates', () => {
    const LoadingState = require('../../../src/components/ui/LoadingState').default;
    const LoadingStates = require('../../../src/components/ui/LoadingStates').default;
    expect(LoadingState).toBe(LoadingStates);
  });

  it('re-exports useLoadingState hook', () => {
    const { useLoadingState: fromState } = require('../../../src/components/ui/LoadingState');
    const { useLoadingState: fromStates } = require('../../../src/components/ui/LoadingStates');
    expect(fromState).toBe(fromStates);
  });
});
