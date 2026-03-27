/**
 * Types for the Maestro test flow generator.
 *
 * The generator reads screen source files and journey definitions,
 * then emits Maestro YAML flows that stay in sync with the codebase.
 */

// ── Actions that can be taken at each step ──

export type Action =
  | { type: 'tap'; testID: string; scroll?: boolean }
  | { type: 'tapText'; text: string }
  | { type: 'fill'; testID: string; value: string }
  | { type: 'inputText'; text: string }
  | { type: 'select'; testID: string; search: string; optionCode: string }
  | { type: 'date'; testID: string }
  | { type: 'alert'; title: string; tapButton: string }
  | { type: 'assertVisible'; text: string }
  | { type: 'assertVisibleID'; testID: string }
  | { type: 'assertNotVisible'; text: string }
  | { type: 'conditional'; whenVisible: string; actions: Action[] }
  | { type: 'swipe'; from: string; to: string; duration?: number }
  | { type: 'wait'; ms: number }
  | { type: 'runSubflow'; file: string }
  | { type: 'screenshot'; name: string }
  | { type: 'eraseText'; count: number };

// ── Journey step — a screen visit with actions ──

export interface JourneyStep {
  /** Screen name from flow-graph (e.g., 'Welcome', 'PassportScan') */
  screen: string;
  /** Comment explaining this step */
  comment?: string;
  /** Text to wait for before proceeding (screen identification) */
  waitFor?: string | string[];
  /** Timeout in ms for the waitFor assertion (default: 15000) */
  waitTimeout?: number;
  /** Actions to perform on this screen */
  actions: Action[];
}

// ── Journey — a complete test flow ──

export interface Journey {
  /** Flow file name (without .yaml extension) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Whether to clear app state before running */
  clearState: boolean;
  /** Maestro tags for filtering */
  tags: string[];
  /** Ordered list of steps */
  steps: JourneyStep[];
}

// ── Flow graph types (from e2e/screenshots/flow-graph.json) ──

export interface FlowGraph {
  stacks: { name: string; screens: string[] }[];
  tabs: string[];
  edges: { from: string; to: string; type: string; file: string; line: number }[];
  screenFiles: Record<string, string>;
}
