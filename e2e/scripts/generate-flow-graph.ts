/**
 * Static analysis script that generates a navigation flow graph from source code.
 *
 * Parses:
 * 1. Navigation type definitions (src/app/navigation/types.ts) for stacks and screens
 * 2. Screen source files (src/screens/**\/*.tsx) for navigation.navigate() calls
 * 3. Navigator files for tab/stack containment
 *
 * Output: e2e/screenshots/flow-graph.json
 *
 * Uses the TypeScript Compiler API for robust AST-based parsing of types.ts,
 * avoiding fragile regex/brace-counting approaches.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const ROOT = path.resolve(__dirname, '../..');
const TYPES_FILE = path.join(ROOT, 'src/app/navigation/types.ts');
const SCREENS_DIR = path.join(ROOT, 'src/screens');
const OUTPUT_FILE = path.join(ROOT, 'e2e/screenshots/flow-graph.json');

interface StackDefinition {
  name: string;
  screens: string[];
}

interface NavigationEdge {
  from: string;
  to: string;
  type: 'navigate' | 'goBack' | 'tab';
  file: string;
  line: number;
}

interface FlowGraph {
  generatedAt: string;
  stacks: StackDefinition[];
  tabs: string[];
  edges: NavigationEdge[];
  screenFiles: Record<string, string>;
}

/**
 * Parse types.ts using the TypeScript Compiler API to extract stack param lists
 * and their screen names. This is robust against formatting changes and complex
 * type expressions that would trip up regex-based parsers.
 */
function parseStacks(typesFilePath: string): StackDefinition[] {
  const content = fs.readFileSync(typesFilePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    typesFilePath,
    content,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );

  const stacks: StackDefinition[] = [];

  for (const statement of sourceFile.statements) {
    // Look for: export type XxxParamList = { ... }
    if (
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text.endsWith('ParamList') &&
      ts.isTypeLiteralNode(statement.type)
    ) {
      const screens: string[] = [];
      for (const member of statement.type.members) {
        // Each member is a route: PropertySignature with an Identifier name
        if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
          screens.push(member.name.text);
        }
      }
      stacks.push({ name: statement.name.text, screens });
    }
  }

  return stacks;
}

/** Parse tab structure — tabs are the keys in MainTabParamList. */
function parseTabs(stacks: StackDefinition[]): string[] {
  const mainTab = stacks.find(s => s.name === 'MainTabParamList');
  return mainTab ? mainTab.screens : [];
}

/**
 * Derive the initial screen for a tab from the parsed stacks.
 * Looks up the stack named `${tab}StackParamList` and returns its first screen.
 * Also tries stripping a trailing 's' to handle pluralised tab names like
 * "Trips" → "TripStackParamList". Falls back to the tab name if nothing matches.
 */
function resolveTabInitialScreen(tab: string, stacks: StackDefinition[]): string {
  const candidates = [tab, tab.replace(/s$/, '')];
  for (const candidate of candidates) {
    const stack = stacks.find(s => s.name === `${candidate}StackParamList`);
    if (stack && stack.screens.length > 0) return stack.screens[0];
  }
  return tab;
}

/** Recursively find all .tsx files in a directory. */
function findScreenFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findScreenFiles(fullPath));
    } else if (entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Parse a screen file for navigation calls. */
function parseNavigationCalls(filePath: string): NavigationEdge[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const edges: NavigationEdge[] = [];
  const relativePath = path.relative(ROOT, filePath);

  // Derive screen name from filename (e.g., TripListScreen.tsx → TripListScreen)
  const screenName = path.basename(filePath, '.tsx');
  // Normalize to route name (e.g., TripListScreen → TripList)
  const fromScreen = screenName.replace(/Screen$/, '');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Match navigate('ScreenName') or navigate('ScreenName', { ... })
    const navRegex = /\.navigate\(\s*['"](\w+)['"]/g;
    let navMatch;
    while ((navMatch = navRegex.exec(line)) !== null) {
      edges.push({
        from: fromScreen,
        to: navMatch[1],
        type: 'navigate',
        file: relativePath,
        line: lineNum,
      });
    }

    // Match .goBack()
    if (/\.goBack\(\)/.test(line)) {
      edges.push({
        from: fromScreen,
        to: '(back)',
        type: 'goBack',
        file: relativePath,
        line: lineNum,
      });
    }
  }

  return edges;
}

/** Build screen-name → file-path mapping. */
function buildScreenFileMap(screenFiles: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const filePath of screenFiles) {
    const screenName = path.basename(filePath, '.tsx').replace(/Screen$/, '');
    map[screenName] = path.relative(ROOT, filePath);
  }
  return map;
}

function main() {
  // 1. Parse navigation types using TypeScript Compiler API
  const stacks = parseStacks(TYPES_FILE);
  const tabs = parseTabs(stacks);

  // 2. Find and parse all screen files
  const screenFiles = findScreenFiles(SCREENS_DIR);
  const edges: NavigationEdge[] = [];

  for (const file of screenFiles) {
    edges.push(...parseNavigationCalls(file));
  }

  // 3. Add tab edges (each tab is reachable from any other tab)
  // We represent this as edges from a virtual "(tabs)" node.
  // The initial screen for each tab is derived from its corresponding stack.
  for (const tab of tabs) {
    edges.push({
      from: '(tabs)',
      to: resolveTabInitialScreen(tab, stacks),
      type: 'tab',
      file: 'src/app/navigation/MainTabNavigator.tsx',
      line: 0,
    });
  }

  // 4. Build screen file map
  const screenFileMap = buildScreenFileMap(screenFiles);

  // 5. Deduplicate edges (same from→to→type)
  const seen = new Set<string>();
  const uniqueEdges = edges.filter(e => {
    const key = `${e.from}→${e.to}→${e.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 6. Write output
  const graph: FlowGraph = {
    generatedAt: new Date().toISOString(),
    stacks,
    tabs,
    edges: uniqueEdges,
    screenFiles: screenFileMap,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(graph, null, 2) + '\n');

  // Summary
  const navEdges = uniqueEdges.filter(e => e.type === 'navigate');
  const backEdges = uniqueEdges.filter(e => e.type === 'goBack');
  console.log(`Flow graph generated: ${OUTPUT_FILE}`);
  console.log(`  Stacks: ${stacks.length}`);
  console.log(`  Tabs: ${tabs.length}`);
  console.log(`  Navigate edges: ${navEdges.length}`);
  console.log(`  GoBack edges: ${backEdges.length}`);
  console.log(`  Screen files: ${Object.keys(screenFileMap).length}`);
}

main();
