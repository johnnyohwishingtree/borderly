/**
 * DSL helpers for defining Maestro test journeys.
 *
 * These functions produce typed Action/Step/Journey objects
 * without any YAML concerns — the emitter handles that.
 */
import type { Action, Journey, JourneyStep } from './types';

// ── Action builders ──

export const tap = (testID: string, opts?: { scroll?: boolean }): Action => ({ type: 'tap', testID, scroll: opts?.scroll });
export const tapText = (text: string): Action => ({ type: 'tapText', text });

export const fill = (testID: string, value: string): Action => ({
  type: 'fill', testID, value,
});

/** Interact with a SearchableSelect: tap trigger → search → select option */
export const select = (testID: string, search: string, optionCode: string): Action => ({
  type: 'select', testID, search, optionCode,
});

/** Open a DatePickerField and confirm the default date */
export const date = (testID: string): Action => ({ type: 'date', testID });

/** Wait for an alert and tap a button on it */
export const alert = (title: string, tapButton: string): Action => ({
  type: 'alert', title, tapButton,
});

/** Type text into the currently focused field (no scroll, no keyboard dismiss) */
export const inputText = (text: string): Action => ({ type: 'inputText', text });

export const assertVisible = (text: string): Action => ({ type: 'assertVisible', text });
export const assertVisibleID = (testID: string): Action => ({ type: 'assertVisibleID', testID });
export const assertNotVisible = (text: string): Action => ({ type: 'assertNotVisible', text });

/** Conditionally run actions if an element is visible */
export const conditional = (whenVisible: string, ...actions: Action[]): Action => ({
  type: 'conditional', whenVisible, actions,
});

export const swipe = (from: string, to: string, duration = 300): Action => ({
  type: 'swipe', from, to, duration,
});

export const runSubflow = (file: string): Action => ({ type: 'runSubflow', file });

// ── Step builder ──

export function step(
  screen: string,
  opts: {
    comment?: string;
    waitFor?: string | string[];
    waitTimeout?: number;
    actions: Action[];
  },
): JourneyStep {
  return { screen, ...opts };
}

// ── Journey builder ──

export function journey(
  name: string,
  opts: {
    description: string;
    clearState?: boolean;
    tags?: string[];
    steps: JourneyStep[];
  },
): Journey {
  return {
    name,
    description: opts.description,
    clearState: opts.clearState ?? true,
    tags: opts.tags ?? [],
    steps: opts.steps,
  };
}
