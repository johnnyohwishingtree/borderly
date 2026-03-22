#!/usr/bin/env npx tsx
/**
 * Maestro flow generator — main entry point.
 *
 * Reads journey definitions from ./journeys/, validates testIDs against
 * source code, and emits Maestro YAML flow files to maestro/flows/generated/.
 *
 * Usage:
 *   pnpm maestro:generate          # Generate all flows
 *   npx tsx maestro/generator      # Same thing
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, relative } from 'path';
import { emitJourney } from './emitter';
import { validateJourney } from './validator';
import { SCREENS } from './screenRegistry';
import { COMPONENT_CATALOG } from './componentCatalog';
import type { FlowGraph, Journey } from './types';
import * as journeys from './journeys';

const ROOT = resolve(__dirname, '../..');
const FLOWS_DIR = resolve(__dirname, '../flows/generated');
const FLOW_GRAPH_PATH = resolve(ROOT, 'e2e/screenshots/flow-graph.json');

function loadFlowGraph(): FlowGraph {
  if (!existsSync(FLOW_GRAPH_PATH)) {
    console.warn('  Warning: flow-graph.json not found. Skipping validation.');
    console.warn('  Generate it with: npx tsx e2e/scripts/generate-flow-graph.ts');
    return { stacks: [], tabs: [], edges: [], screenFiles: {} };
  }
  return JSON.parse(readFileSync(FLOW_GRAPH_PATH, 'utf-8'));
}

function generate() {
  console.log('Maestro Flow Generator');
  console.log('======================\n');

  // Ensure output directory exists
  if (!existsSync(FLOWS_DIR)) {
    mkdirSync(FLOWS_DIR, { recursive: true });
  }

  // Load flow graph for validation
  const flowGraph = loadFlowGraph();

  // Collect all journeys
  const allJourneys: Journey[] = Object.values(journeys);

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const journey of allJourneys) {
    const outPath = resolve(FLOWS_DIR, `${journey.name}.yaml`);
    const relPath = relative(ROOT, outPath);

    // Validate
    const result = validateJourney(journey, flowGraph);
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;

    if (result.errors.length > 0) {
      console.log(`  FAIL  ${relPath}`);
      for (const err of result.errors) {
        console.log(`        ERROR: ${err}`);
      }
    }

    if (result.warnings.length > 0) {
      for (const warn of result.warnings) {
        console.log(`        WARN:  ${warn}`);
      }
    }

    // Generate YAML
    const yaml = emitJourney(journey);
    writeFileSync(outPath, yaml, 'utf-8');

    if (result.errors.length === 0) {
      console.log(`  OK    ${relPath} (${journey.steps.length} steps)`);
    }
  }

  // Summary
  console.log('');
  console.log(`Generated ${allJourneys.length} flows in ${relative(ROOT, FLOWS_DIR)}/`);

  if (totalErrors > 0) {
    console.log(`\n${totalErrors} error(s) — testIDs may be missing from source code.`);
    console.log('Fix the errors above, then re-run the generator.');
    process.exit(1);
  }

  if (totalWarnings > 0) {
    console.log(`\n${totalWarnings} warning(s) — see above for details.`);
  }

  // Write combined metadata (screen registry + component catalog) for skills
  const metadataPath = resolve(__dirname, 'screen-metadata.json');
  const metadata = {
    screens: SCREENS,
    components: Object.fromEntries(
      Object.entries(COMPONENT_CATALOG).map(([k, v]) => [k, {
        subTestIDs: v.subTestIDs,
        dslHelper: v.dslHelper,
        showsKeyboard: v.showsKeyboard,
        usesModal: v.usesModal,
        maestroNotes: v.maestroNotes,
      }]),
    ),
  };
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`\nScreen registry: ${Object.keys(SCREENS).length} screens, ${Object.keys(COMPONENT_CATALOG).length} component types`);
  console.log(`Metadata written to: ${relative(ROOT, metadataPath)}`);

  console.log('\nTo run the generated flows:');
  console.log('  maestro test maestro/flows/generated/');
}

generate();
