/**
 * Screen metadata extractor.
 *
 * Scans screen source files and their imported components to extract
 * testable metadata: testIDs, component types, screen headings,
 * alert dialogs, and conditional UI blocks.
 *
 * This gives the journey author (human or AI) the information needed
 * to write Maestro test steps without manually reading each screen file.
 *
 * Usage:
 *   npx tsx maestro/generator/screenMetadata.ts          # Print all screens
 *   npx tsx maestro/generator/screenMetadata.ts Welcome   # Print one screen
 */
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve, join } from 'path';
import type { FlowGraph } from './types';

const ROOT = resolve(__dirname, '../..');
const FLOW_GRAPH_PATH = resolve(ROOT, 'e2e/screenshots/flow-graph.json');

// ── Types ──

export interface TestIDEntry {
  /** The testID string (may contain template patterns like `${index}`) */
  testID: string;
  /** Component that owns this testID */
  componentType: 'Button' | 'Input' | 'SearchableSelect' | 'DatePickerField' | 'AddressAutocomplete' | 'Card' | 'View' | 'Text' | 'ScrollView' | 'TravelerSelector' | 'other';
  /** Whether this testID uses a dynamic template (e.g., `leg-${index}-...`) */
  isDynamic: boolean;
  /** Source file where this testID was found */
  sourceFile: string;
  /** Line number in the source file */
  line: number;
}

export interface AlertInfo {
  title: string;
  buttons: string[];
  sourceFile: string;
  line: number;
}

export interface ScreenText {
  text: string;
  type: 'heading' | 'label' | 'body';
  sourceFile: string;
  line: number;
}

export interface ScreenMetadata {
  /** Screen name from the navigator */
  screenName: string;
  /** Path to the screen source file */
  sourceFile: string;
  /** All testIDs found in this screen and its imported components */
  testIDs: TestIDEntry[];
  /** Prominent text content (headings, labels) for waitFor candidates */
  screenTexts: ScreenText[];
  /** Alert.alert() calls with their titles and buttons */
  alerts: AlertInfo[];
  /** Files that this screen imports from (components, hooks) */
  imports: string[];
  /** Navigation actions found in this screen */
  navigatesTo: string[];
}

// ── Source scanning ──

const sourceCache = new Map<string, string>();

function loadSource(filePath: string): string | null {
  const abs = filePath.startsWith('/') ? filePath : resolve(ROOT, filePath);
  if (sourceCache.has(abs)) return sourceCache.get(abs) ?? null;
  if (!existsSync(abs)) return null;
  const content = readFileSync(abs, 'utf-8');
  sourceCache.set(abs, content);
  return content;
}

/**
 * Determine component type from context around a testID.
 * Looks at the surrounding JSX to identify the component.
 */
function inferComponentType(source: string, testIDPos: number): TestIDEntry['componentType'] {
  // Look backwards from the testID position to find the opening JSX tag
  const before = source.substring(Math.max(0, testIDPos - 500), testIDPos);
  const lines = before.split('\n').reverse();

  for (const line of lines) {
    const trimmed = line.trim();
    // Match opening JSX tags: <Button, <Input, <SearchableSelect, etc.
    if (trimmed.startsWith('<')) {
      const match = trimmed.match(/^<(\w+)/);
      if (match) {
        const tag = match[1];
        const knownTypes: TestIDEntry['componentType'][] = [
          'Button', 'Input', 'SearchableSelect', 'DatePickerField',
          'AddressAutocomplete', 'Card', 'View', 'Text', 'ScrollView',
          'TravelerSelector',
        ];
        if (knownTypes.includes(tag as TestIDEntry['componentType'])) {
          return tag as TestIDEntry['componentType'];
        }
        return 'other';
      }
    }
  }
  return 'other';
}

/**
 * Extract all testID values from a source file.
 */
function extractTestIDs(source: string, sourceFile: string): TestIDEntry[] {
  const entries: TestIDEntry[] = [];
  // Match testID="xxx", testID={'xxx'}, testID={`xxx`}
  const patterns = [
    /testID="([^"]+)"/g,
    /testID=\{'([^']+)'\}/g,
    /testID=\{`([^`]+)`\}/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const testID = match[1];
      const lineNum = source.substring(0, match.index).split('\n').length;
      const isDynamic = testID.includes('${');

      entries.push({
        testID,
        componentType: inferComponentType(source, match.index),
        isDynamic,
        sourceFile,
        line: lineNum,
      });
    }
  }

  return entries;
}

/**
 * Extract Alert.alert() calls from source.
 */
function extractAlerts(source: string, sourceFile: string): AlertInfo[] {
  const alerts: AlertInfo[] = [];

  // Match Alert.alert('title', 'message', [...])
  const alertRegex = /Alert\.alert\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = alertRegex.exec(source)) !== null) {
    const title = match[1];
    const lineNum = source.substring(0, match.index).split('\n').length;

    // Try to extract button labels from the array that follows
    const afterAlert = source.substring(match.index, match.index + 1000);
    const buttonLabels: string[] = [];
    const buttonRegex = /text:\s*['"`]([^'"`]+)['"`]/g;
    let btnMatch;
    // Only look within the Alert.alert() call
    const closingParen = findMatchingParen(afterAlert, afterAlert.indexOf('('));
    const alertBody = afterAlert.substring(0, closingParen);
    while ((btnMatch = buttonRegex.exec(alertBody)) !== null) {
      buttonLabels.push(btnMatch[1]);
    }

    alerts.push({ title, buttons: buttonLabels, sourceFile, line: lineNum });
  }

  return alerts;
}

/**
 * Find the position of the closing parenthesis matching the one at startPos.
 */
function findMatchingParen(source: string, startPos: number): number {
  let depth = 0;
  for (let i = startPos; i < source.length; i++) {
    if (source[i] === '(') depth++;
    if (source[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return source.length;
}

/**
 * Extract prominent text content that could be used for waitFor assertions.
 * Looks for large/heading text and section headers.
 */
function extractScreenTexts(source: string, sourceFile: string): ScreenText[] {
  const texts: ScreenText[] = [];
  const seen = new Set<string>();

  // Match Text components with className containing heading-like styles
  // text-2xl, text-3xl, text-xl + font-bold usually indicate headings
  const headingRegex = /<Text[^>]*className="[^"]*(?:text-(?:2xl|3xl|4xl)|text-xl[^"]*font-bold)[^"]*"[^>]*>\s*([^<{]+?)\s*<\/Text>/g;
  let match;
  while ((match = headingRegex.exec(source)) !== null) {
    const text = match[1].trim();
    if (text && !seen.has(text) && text.length > 2) {
      seen.add(text);
      const lineNum = source.substring(0, match.index).split('\n').length;
      texts.push({ text, type: 'heading', sourceFile, line: lineNum });
    }
  }

  // Match section labels (text-sm font-medium, text-base font-semibold)
  const labelRegex = /<Text[^>]*className="[^"]*(?:font-semibold|font-bold)[^"]*"[^>]*>\s*([^<{]+?)\s*<\/Text>/g;
  while ((match = labelRegex.exec(source)) !== null) {
    const text = match[1].trim();
    if (text && !seen.has(text) && text.length > 2) {
      seen.add(text);
      const lineNum = source.substring(0, match.index).split('\n').length;
      texts.push({ text, type: 'label', sourceFile, line: lineNum });
    }
  }

  return texts;
}

/**
 * Extract local import paths from a source file.
 * Only includes paths starting with @/ or ./ (project imports).
 */
function extractImports(source: string): string[] {
  const imports: string[] = [];
  const importRegex = /from\s+['"](@\/[^'"]+|\.\/[^'"]+|\.\.\/[^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(source)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

/**
 * Resolve an import path to a filesystem path.
 * Handles @/ alias → src/ and barrel imports.
 */
function resolveImportPath(importPath: string, fromFile: string): string[] {
  let resolved: string;
  if (importPath.startsWith('@/')) {
    resolved = resolve(ROOT, 'src', importPath.substring(2));
  } else {
    const fromDir = resolve(ROOT, fromFile, '..');
    resolved = resolve(fromDir, importPath);
  }

  const candidates = [
    resolved + '.tsx',
    resolved + '.ts',
    resolved + '/index.tsx',
    resolved + '/index.ts',
  ];

  // If it's a barrel import (e.g., @/components/ui), try to find constituent files
  if (existsSync(resolved) && statSync(resolved).isDirectory()) {
    const indexFiles = ['index.ts', 'index.tsx'];
    for (const idx of indexFiles) {
      const indexPath = join(resolved, idx);
      if (existsSync(indexPath)) {
        const indexSource = loadSource(indexPath);
        if (indexSource) {
          // Extract re-exports to find the actual component files
          const reExports = extractImports(indexSource);
          const resolvedPaths: string[] = [];
          for (const reExport of reExports) {
            const reResolved = resolve(resolved, reExport);
            for (const ext of ['.tsx', '.ts']) {
              if (existsSync(reResolved + ext)) {
                resolvedPaths.push(reResolved + ext);
              }
            }
          }
          if (resolvedPaths.length > 0) return resolvedPaths;
        }
        return [indexPath];
      }
    }
  }

  return candidates.filter(c => existsSync(c));
}

/**
 * Extract metadata for a single screen.
 * Scans the screen file and its first-level component imports for testIDs.
 */
export function extractScreenMetadata(
  screenName: string,
  screenFile: string,
  flowGraph: FlowGraph,
): ScreenMetadata {
  const source = loadSource(screenFile);
  if (!source) {
    return {
      screenName,
      sourceFile: screenFile,
      testIDs: [],
      screenTexts: [],
      alerts: [],
      imports: [],
      navigatesTo: [],
    };
  }

  const testIDs = extractTestIDs(source, screenFile);
  const screenTexts = extractScreenTexts(source, screenFile);
  const alerts = extractAlerts(source, screenFile);
  const imports = extractImports(source);

  // Resolve and scan imported component files for additional testIDs
  const scannedFiles = new Set<string>([resolve(ROOT, screenFile)]);
  for (const importPath of imports) {
    // Only scan component and hook imports, not stores/services/types
    if (importPath.includes('/types') || importPath.includes('/constants')) continue;

    const resolvedPaths = resolveImportPath(importPath, screenFile);
    for (const resolved of resolvedPaths) {
      if (scannedFiles.has(resolved)) continue;
      scannedFiles.add(resolved);

      const importedSource = loadSource(resolved);
      if (importedSource) {
        const relPath = resolved.replace(ROOT + '/', '');
        testIDs.push(...extractTestIDs(importedSource, relPath));
        alerts.push(...extractAlerts(importedSource, relPath));
      }
    }
  }

  // Deduplicate testIDs (same testID from re-exported component)
  const seenTestIDs = new Set<string>();
  const uniqueTestIDs = testIDs.filter(entry => {
    if (seenTestIDs.has(entry.testID)) return false;
    seenTestIDs.add(entry.testID);
    return true;
  });

  // Navigation targets from flow graph
  const navigatesTo = flowGraph.edges
    .filter(e => e.from === screenName && e.to !== '(back)')
    .map(e => e.to);

  return {
    screenName,
    sourceFile: screenFile,
    testIDs: uniqueTestIDs,
    screenTexts,
    alerts,
    imports,
    navigatesTo,
  };
}

/**
 * Extract metadata for all screens in the flow graph.
 */
export function extractAllScreenMetadata(flowGraph: FlowGraph): Map<string, ScreenMetadata> {
  const result = new Map<string, ScreenMetadata>();
  for (const [screenName, screenFile] of Object.entries(flowGraph.screenFiles)) {
    result.set(screenName, extractScreenMetadata(screenName, screenFile, flowGraph));
  }
  return result;
}

// ── CLI entry point ──

if (require.main === module) {
  const flowGraph: FlowGraph = existsSync(FLOW_GRAPH_PATH)
    ? JSON.parse(readFileSync(FLOW_GRAPH_PATH, 'utf-8'))
    : { stacks: [], tabs: [], edges: [], screenFiles: {} };

  const targetScreen = process.argv[2];

  if (targetScreen) {
    const screenFile = flowGraph.screenFiles[targetScreen];
    if (!screenFile) {
      console.error(`Screen "${targetScreen}" not found in flow-graph.json`);
      console.error('Available screens:', Object.keys(flowGraph.screenFiles).join(', '));
      process.exit(1);
    }
    const metadata = extractScreenMetadata(targetScreen, screenFile, flowGraph);
    console.log(JSON.stringify(metadata, null, 2));
  } else {
    const all = extractAllScreenMetadata(flowGraph);
    // Print summary table
    console.log('Screen Metadata Summary');
    console.log('=======================\n');
    for (const [name, meta] of all) {
      const staticIDs = meta.testIDs.filter(t => !t.isDynamic);
      const dynamicIDs = meta.testIDs.filter(t => t.isDynamic);
      console.log(`${name} (${meta.sourceFile})`);
      console.log(`  testIDs: ${staticIDs.length} static, ${dynamicIDs.length} dynamic`);
      if (meta.screenTexts.length > 0) {
        const headings = meta.screenTexts.filter(t => t.type === 'heading').map(t => `"${t.text}"`);
        if (headings.length > 0) console.log(`  headings: ${headings.join(', ')}`);
      }
      if (meta.alerts.length > 0) {
        console.log(`  alerts: ${meta.alerts.map(a => `"${a.title}" [${a.buttons.join(', ')}]`).join(', ')}`);
      }
      if (meta.navigatesTo.length > 0) {
        console.log(`  navigates to: ${meta.navigatesTo.join(', ')}`);
      }
      console.log('');
    }

    // Also write full JSON for programmatic consumption
    const outPath = resolve(ROOT, 'maestro/generator/screen-metadata.json');
    const { writeFileSync } = require('fs');
    const serializable = Object.fromEntries(all);
    writeFileSync(outPath, JSON.stringify(serializable, null, 2));
    console.log(`Full metadata written to ${outPath}`);
  }
}
