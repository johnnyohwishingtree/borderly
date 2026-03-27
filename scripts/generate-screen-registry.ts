#!/usr/bin/env npx tsx
/**
 * Screen Registry Generator — auto-generates screenRegistry from source files.
 *
 * Parses screen .tsx files to extract:
 * - testIDs and their component types
 * - Alert.alert() calls
 * - navigation.navigate() targets
 *
 * Preserves human-authored fields (waitFor, notes) from existing registry.
 *
 * Usage:
 *   npx tsx scripts/generate-screen-registry.ts          # Preview changes
 *   npx tsx scripts/generate-screen-registry.ts --write   # Write to registry file
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { resolve, join, relative, basename, dirname } from 'path';

const ROOT = resolve(__dirname, '..');
const SCREENS_DIR = resolve(ROOT, 'src/screens');
const REGISTRY_PATH = resolve(ROOT, 'maestro/generator/screenRegistry.ts');

// ── Types ──

interface FieldSpec {
  testID: string;
  label: string;
  componentType: string;
  required: boolean;
  dynamic?: boolean;
}

interface AlertSpec {
  title: string;
  buttons: string[];
  happyPathButton?: string;
  trigger: string;
}

interface ButtonSpec {
  testID: string;
  label: string;
  description: string;
}

interface ScreenData {
  name: string;
  sourceFile: string;
  waitFor: string | string[];
  fields: FieldSpec[];
  alerts: AlertSpec[];
  actionButtons: ButtonSpec[];
  navigatesTo: string[];
  notes: string[];
}

// ── Parse a screen file ──

function parseScreenFile(filePath: string): ScreenData | null {
  // Read main file + any sub-component files in the same directory
  let content = readFileSync(filePath, 'utf-8');
  const dir = dirname(filePath);
  const mainName = basename(filePath, '.tsx');
  for (const sibling of readdirSync(dir)) {
    if (sibling.startsWith(mainName + '.') && sibling.endsWith('.tsx') && sibling !== basename(filePath)) {
      content += '\n' + readFileSync(join(dir, sibling), 'utf-8');
    }
  }
  const relPath = relative(ROOT, filePath);

  // Extract screen name from path
  const fileName = basename(filePath, '.tsx');
  // Skip sub-components like TripDetailScreen.Itinerary.tsx
  if (fileName.includes('.')) return null;

  const screenName = fileName.replace(/Screen$/, '');

  // Extract testIDs with their component context
  const fields: FieldSpec[] = [];
  const actionButtons: ButtonSpec[] = [];

  // Find all testID patterns: testID="...", testID: "...", testID={`...`}
  const testIDRegex = /testID[=:]\s*"([^"]+)"|testID=\{`([^`]+)`\}/g;
  let match;
  while ((match = testIDRegex.exec(content)) !== null) {
    const testID = (match[1] || match[2]).replace(/\$\{(\w+)\}/g, '${$1}');
    const pos = match.index;

    // Get surrounding context — look back far enough to find the JSX component tag
    const before = content.slice(Math.max(0, pos - 500), pos);

    // Determine if it's a button or a field
    if (testID.endsWith('-button') || testID.endsWith('-cta-button') || testID.endsWith('-link')) {
      // Extract label from title prop or text content
      const titleMatch = before.match(/title="([^"]+)"/);
      const label = titleMatch ? titleMatch[1] : testID.replace(/-button$|-cta-button$|-link$/, '').replace(/-/g, ' ');
      actionButtons.push({
        testID,
        label,
        description: label,
      });
    } else if (testID.endsWith('-input') || testID.endsWith('-select') || testID.endsWith('-date')) {
      // Determine component type from context
      const componentType = inferComponentType(before, testID);
      const labelMatch = before.match(/label="([^"]+)"/);
      const placeholderMatch = before.match(/placeholder="([^"]+)"/);
      const label = labelMatch?.[1] || placeholderMatch?.[1] || testID.replace(/-input$|-select$|-date$/, '').replace(/-/g, ' ');
      const dynamic = testID.includes('${');
      const required = !before.includes('optional') && !before.includes('Optional');

      fields.push({
        testID,
        label,
        componentType,
        required,
        ...(dynamic ? { dynamic: true } : {}),
      });
    } else {
      // Infer from component context
      const componentType = inferComponentType(before, testID);
      const isField = componentType !== 'Input' ? true : (before.includes('<Input') || before.includes('placeholder=') || before.includes('label='));
      const isButton = before.includes('<Button') || before.includes('<Pressable') || before.includes('onPress');

      if (isField && (before.includes('<Input') || before.includes('<SearchableSelect') || before.includes('<DatePickerField') || before.includes('<AccommodationAutocomplete') || before.includes('<AddressAutocomplete'))) {
        const labelMatch = before.match(/label="([^"]+)"/);
        const label = labelMatch?.[1] || testID.replace(/\$\{[^}]+\}/g, '').replace(/-+/g, ' ').trim();
        const dynamic = testID.includes('${');
        fields.push({ testID, label, componentType, required: true, ...(dynamic ? { dynamic: true } : {}) });
      } else if (isButton) {
        const titleMatch = before.match(/title="([^"]+)"/);
        const label = titleMatch ? titleMatch[1] : testID.replace(/-/g, ' ');
        actionButtons.push({ testID, label, description: label });
      }
      // Skip non-interactive testIDs (containers, cards, views)
    }
  }

  // Alerts are context-dependent — preserve from existing registry
  const alerts: AlertSpec[] = [];

  // Extract navigatesTo
  const navigatesTo: string[] = [];
  const navRegex = /navigate\(\s*['"]([^'"]+)['"]/g;
  while ((match = navRegex.exec(content)) !== null) {
    if (!navigatesTo.includes(match[1])) {
      navigatesTo.push(match[1]);
    }
  }

  return {
    name: screenName,
    sourceFile: relPath,
    waitFor: '', // Human-authored — preserved from existing registry
    fields,
    alerts,
    actionButtons,
    navigatesTo,
    notes: [],   // Human-authored — preserved from existing registry
  };
}

function inferComponentType(before: string, testID: string): string {
  // Check the JSX component wrapping this testID
  if (before.includes('<SearchableSelect') || before.includes('SearchableSelect')) return 'SearchableSelect';
  if (before.includes('<DatePickerField') || before.includes('DatePickerField')) return 'DatePickerField';
  if (before.includes('<AccommodationAutocomplete')) return 'AccommodationAutocomplete';
  if (before.includes('<AddressAutocomplete')) return 'AddressAutocomplete';
  if (before.includes('<Select') && !before.includes('<SearchableSelect')) return 'Select';
  if (before.includes('<Toggle')) return 'Toggle';
  if (before.includes('<Input') || before.includes('placeholder=')) return 'Input';

  // Infer from testID naming
  if (testID.includes('-date')) return 'DatePickerField';
  if (testID.includes('-select')) return 'SearchableSelect';

  return 'Input';
}

// ── Load overrides (human-authored JSON) + existing registry (for waitFor/notes) ──

const OVERRIDES_PATH = resolve(ROOT, 'maestro/generator/registry-overrides.json');

function loadOverrides(): Record<string, Partial<ScreenData>> {
  if (!existsSync(OVERRIDES_PATH)) return {};
  return JSON.parse(readFileSync(OVERRIDES_PATH, 'utf-8'));
}

function loadExistingRegistry(): Record<string, Partial<ScreenData>> {
  if (!existsSync(REGISTRY_PATH)) return {};

  const content = readFileSync(REGISTRY_PATH, 'utf-8');
  const existing: Record<string, Partial<ScreenData>> = {};

  // Parse waitFor and notes from existing registry (simple regex — alerts come from overrides JSON)
  const screenBlocks = content.matchAll(/(\w+):\s*\{[\s\S]*?(?=\n  \w+:|$)/g);
  for (const block of screenBlocks) {
    const name = block[1];
    const text = block[0];

    const waitForMatch = text.match(/waitFor:\s*['"]([^'"]+)['"]/);
    const waitForArrayMatch = text.match(/waitFor:\s*\[([\s\S]*?)\]/);
    let waitFor: string | string[] = '';
    if (waitForMatch) {
      waitFor = waitForMatch[1];
    } else if (waitForArrayMatch) {
      const items = waitForArrayMatch[1].matchAll(/['"]([^'"]+)['"]/g);
      waitFor = [...items].map(i => i[1]);
    }

    const notesMatch = text.match(/notes:\s*\[([\s\S]*?)\]/);
    let notes: string[] = [];
    if (notesMatch) {
      const noteItems = notesMatch[1].matchAll(/['"]([^'"]+)['"]/g);
      notes = [...noteItems].map(n => n[1]);
    }

    existing[name] = { waitFor, notes };
  }

  return existing;
}

// ── Walk screen directories ──

function findScreenFiles(): string[] {
  const files: string[] = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (entry.includes('__test') || entry.includes('__screenshot')) continue;
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (entry.match(/^[A-Z]\w+(Screen)?\.tsx$/) && !entry.includes('.Screen.') && !entry.includes('.Destinations.') && !entry.includes('.LegCard.') && !entry.includes('.Itinerary.') && !entry.includes('.Checklists.')) {
        // Match both FooScreen.tsx and Foo.tsx (some screens don't have Screen suffix)
        // Exclude sub-component files like CreateTripScreen.Destinations.tsx
        files.push(full);
      }
    }
  }

  walk(SCREENS_DIR);
  return files;
}

// ── Main ──

const writeMode = process.argv.includes('--write');
const screenFiles = findScreenFiles();
const existing = loadExistingRegistry();
const overrides = loadOverrides();

console.log(`Scanning ${screenFiles.length} screen files...\n`);

const screens: ScreenData[] = [];

for (const file of screenFiles) {
  const data = parseScreenFile(file);
  if (!data) continue;

  // Merge human-authored fields: waitFor/notes from existing registry, alerts from overrides JSON
  const prev = existing[data.name];
  if (prev) {
    if (prev.waitFor) data.waitFor = prev.waitFor;
    if (prev.notes?.length) data.notes = prev.notes;
  }
  const override = overrides[data.name];
  if (override) {
    if (override.alerts?.length) data.alerts = override.alerts as AlertSpec[];
    if (override.waitFor) data.waitFor = override.waitFor;
    if (override.notes?.length) data.notes = override.notes;
  }

  screens.push(data);

  const fieldCount = data.fields.length;
  const buttonCount = data.actionButtons.length;
  const alertCount = data.alerts.length;
  const navCount = data.navigatesTo.length;
  console.log(`  ${data.name}: ${fieldCount} fields, ${buttonCount} buttons, ${alertCount} alerts, ${navCount} navigatesTo`);

  // Show new/changed testIDs vs existing registry
  if (!prev) {
    console.log(`    NEW SCREEN — not in existing registry`);
  }
}

console.log(`\n${screens.length} screens found.`);

// Report diff vs existing
const existingNames = new Set(Object.keys(existing));
const newNames = new Set(screens.map(s => s.name));
const added = [...newNames].filter(n => !existingNames.has(n));
const removed = [...existingNames].filter(n => !newNames.has(n));

if (added.length) console.log(`\nNew screens: ${added.join(', ')}`);
if (removed.length) console.log(`\nRemoved screens: ${removed.join(', ')}`);

if (writeMode) {
  // Generate TypeScript output
  const lines: string[] = [
    '/**',
    ' * Screen registry — auto-generated from source files.',
    ' *',
    ' * DO NOT EDIT testIDs, fields, buttons, alerts, or navigatesTo manually.',
    ' * These are parsed from screen source files by:',
    ' *   npx tsx scripts/generate-screen-registry.ts --write',
    ' *',
    ' * Human-authored fields (waitFor, notes) are preserved across regenerations.',
    ' * Edit those directly in this file.',
    ' */',
    '',
    '// ── Types ──',
    '',
    'export interface FieldSpec {',
    '  testID: string;',
    '  label: string;',
    '  componentType: string;',
    '  required: boolean;',
    '  dynamic?: boolean;',
    '}',
    '',
    'export interface AlertSpec {',
    '  title: string;',
    '  buttons: string[];',
    '  happyPathButton?: string;',
    '  trigger: string;',
    '}',
    '',
    'export interface ScreenSpec {',
    '  name: string;',
    '  sourceFile: string;',
    '  waitFor: string | string[];',
    '  fields: FieldSpec[];',
    '  alerts: AlertSpec[];',
    '  actionButtons: { testID: string; label: string; description: string }[];',
    '  navigatesTo: string[];',
    '  notes: string[];',
    '}',
    '',
    '// ── Helper ──',
    '',
    'export function getScreen(name: string): ScreenSpec | undefined {',
    '  return SCREENS[name];',
    '}',
    '',
    'export function getRequiredFields(screenName: string): FieldSpec[] {',
    '  const screen = getScreen(screenName);',
    '  if (!screen) return [];',
    '  return screen.fields.filter(f => f.required);',
    '}',
    '',
    '// ── Registry ──',
    '',
    'export const SCREENS: Record<string, ScreenSpec> = {',
  ];

  for (const screen of screens.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`  ${screen.name}: {`);
    lines.push(`    name: '${screen.name}',`);
    lines.push(`    sourceFile: '${screen.sourceFile}',`);

    if (Array.isArray(screen.waitFor)) {
      lines.push(`    waitFor: [${screen.waitFor.map(w => `'${w}'`).join(', ')}],`);
    } else {
      lines.push(`    waitFor: '${screen.waitFor}',`);
    }

    // Fields
    lines.push(`    fields: [`);
    for (const f of screen.fields) {
      const dynStr = f.dynamic ? ', dynamic: true' : '';
      lines.push(`      { testID: '${f.testID}', label: '${f.label.replace(/'/g, "\\'")}', componentType: '${f.componentType}', required: ${f.required}${dynStr} },`);
    }
    lines.push(`    ],`);

    // Alerts
    lines.push(`    alerts: [`);
    for (const a of screen.alerts) {
      lines.push(`      { title: '${a.title}', buttons: [${a.buttons.map(b => `'${b}'`).join(', ')}], happyPathButton: '${a.happyPathButton}', trigger: '${a.trigger}' },`);
    }
    lines.push(`    ],`);

    // Action buttons
    lines.push(`    actionButtons: [`);
    for (const b of screen.actionButtons) {
      lines.push(`      { testID: '${b.testID}', label: '${b.label.replace(/'/g, "\\'")}', description: '${b.description.replace(/'/g, "\\'")}' },`);
    }
    lines.push(`    ],`);

    // navigatesTo
    lines.push(`    navigatesTo: [${screen.navigatesTo.map(n => `'${n}'`).join(', ')}],`);

    // Notes
    if (screen.notes.length) {
      lines.push(`    notes: [`);
      for (const n of screen.notes) {
        lines.push(`      '${n.replace(/'/g, "\\'")}',`);
      }
      lines.push(`    ],`);
    } else {
      lines.push(`    notes: [],`);
    }

    lines.push(`  },`);
    lines.push('');
  }

  lines.push('};');
  lines.push('');

  writeFileSync(REGISTRY_PATH, lines.join('\n'));
  console.log(`\nWritten to ${relative(ROOT, REGISTRY_PATH)}`);
} else {
  console.log('\nDry run — pass --write to update the registry file.');
}
