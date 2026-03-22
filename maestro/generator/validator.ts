/**
 * Validator — checks journey definitions against actual source code.
 *
 * Verifies that:
 * 1. Every screen referenced in a journey exists in flow-graph.json
 * 2. Every testID referenced in actions exists in the screen's source file
 * 3. Navigation edges exist between consecutive journey steps
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import type { Action, FlowGraph, Journey } from './types';

const ROOT = resolve(__dirname, '../..');

interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Build a combined source corpus from all .tsx files under src/.
 * Cached after first call. Used for testID validation since testIDs
 * may live in child components, not the screen file itself.
 */
let allSourcesCache: string | null = null;

function getAllSources(): string {
  if (allSourcesCache) return allSourcesCache;
  const srcDir = resolve(ROOT, 'src');
  const files: string[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry !== 'node_modules' && entry !== '__tests__') walk(full);
      } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
        files.push(full);
      }
    }
  }
  walk(srcDir);
  allSourcesCache = files.map((f) => readFileSync(f, 'utf-8')).join('\n');
  return allSourcesCache;
}

/** Extract all testIDs referenced in an action tree */
function extractTestIDs(action: Action): string[] {
  const ids: string[] = [];
  switch (action.type) {
    case 'tap':
    case 'assertVisibleID':
      ids.push(action.testID);
      break;
    case 'fill':
      ids.push(action.testID);
      break;
    case 'select':
      // SearchableSelect generates: testID-trigger, testID-search, testID-option-CODE
      ids.push(action.testID);
      break;
    case 'date':
      ids.push(action.testID);
      break;
    case 'conditional':
      for (const sub of action.actions) {
        ids.push(...extractTestIDs(sub));
      }
      break;
  }
  return ids;
}

/** Check if a testID (or a pattern base) exists in source code */
function testIDExistsInSource(testID: string, source: string): boolean {
  // Direct match: testID="xxx" or testID={'xxx'} or testID={`xxx`}
  if (source.includes(`"${testID}"`) || source.includes(`'${testID}'`)) {
    return true;
  }
  // Template literal pattern: testID={`xxx-${...}`}
  // Check if the static prefix of the testID appears in a template
  const parts = testID.split('-');
  for (let i = parts.length - 1; i >= 1; i--) {
    const prefix = parts.slice(0, i).join('-');
    if (source.includes(`\`${prefix}-`) || source.includes(`"${prefix}-`)) {
      return true;
    }
  }
  return false;
}

export function validateJourney(journey: Journey, flowGraph: FlowGraph): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < journey.steps.length; i++) {
    const step = journey.steps[i];
    const stepLabel = `${journey.name}[${i}] (${step.screen})`;

    // 1. Check screen exists in flow graph
    const screenFile = flowGraph.screenFiles[step.screen];
    if (!screenFile) {
      // Some "screens" are virtual (e.g., the main tab container)
      if (step.screen !== 'TripList' && step.screen !== 'QRWallet') {
        warnings.push(`${stepLabel}: Screen not found in flow-graph.json`);
      }
      continue;
    }

    // 2. Check testIDs exist somewhere in src/
    // TestIDs may be in child components, not the screen file itself.
    const allSources = getAllSources();

    for (const action of step.actions) {
      const testIDs = extractTestIDs(action);
      for (const testID of testIDs) {
        if (!testIDExistsInSource(testID, allSources)) {
          errors.push(
            `${stepLabel}: testID "${testID}" not found in any source file`
          );
        }
      }
    }

    // 3. Check navigation edge to next step
    if (i < journey.steps.length - 1) {
      const nextScreen = journey.steps[i + 1].screen;
      const hasEdge = flowGraph.edges.some(
        (e) => e.from === step.screen && e.to === nextScreen
      );
      // Don't warn for tab switches or navigator swaps
      const isTabSwitch = flowGraph.tabs.includes(nextScreen) || nextScreen === 'TripList';
      const isNavigatorSwap = step.screen === 'NotificationPermission'; // setOnboardingComplete swaps root
      if (!hasEdge && !isTabSwitch && !isNavigatorSwap) {
        warnings.push(
          `${stepLabel}: No navigation edge to "${nextScreen}" in flow-graph`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
