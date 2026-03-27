/**
 * Maestro YAML emitter.
 *
 * Converts Journey objects into valid Maestro YAML flow files.
 * Handles all the Maestro-specific boilerplate: scrollUntilVisible,
 * keyboard dismissal swipes, extended waits, etc.
 */
import type { Action, Journey, JourneyStep } from './types';

const APP_ID = 'com.borderly.app';
const INDENT = '  ';

// ── YAML line helpers ──

function line(depth: number, text: string): string {
  return INDENT.repeat(depth) + text;
}

function comment(depth: number, text: string): string {
  return line(depth, `# ${text}`);
}

// ── Scroll helper ──

/** Emit a scrollUntilVisible block with centerElement to prevent header overlap */
function emitScroll(d: number, testID: string): string[] {
  return [
    line(d, '- scrollUntilVisible:'),
    line(d, '    element:'),
    line(d, `      id: "${testID}"`),
    line(d, '    direction: DOWN'),
    line(d, '    timeout: 15000'),
    line(d, '    visibilityPercentage: 30'),
    line(d, '    centerElement: true'),
  ];
}

// ── Action → YAML lines ──

function emitAction(action: Action, depth = 0): string[] {
  const lines: string[] = [];
  const d = depth;

  switch (action.type) {
    case 'tap':
      if (action.scroll) {
        lines.push(...emitScroll(d, action.testID));
      }
      lines.push(
        line(d, '- tapOn:'),
        line(d, `    id: "${action.testID}"`),
      );
      break;

    case 'tapText':
      lines.push(line(d, `- tapOn: "${action.text}"`));
      break;

    case 'fill':
      lines.push(
        ...emitScroll(d, action.testID),
        line(d, '- tapOn:'),
        line(d, `    id: "${action.testID}"`),
        line(d, `- inputText: "${action.value}"`),
        // Dismiss keyboard with small swipe
        line(d, '- swipe:'),
        line(d, '    start: "50%,40%"'),
        line(d, '    end: "50%,35%"'),
        line(d, '    duration: 200'),
      );
      break;

    case 'select':
      lines.push(
        ...emitScroll(d, action.testID),
        // Center the trigger so dropdown options have room below
        ...emitScroll(d, `${action.testID}-trigger`, 3000),
        line(d, '- swipe:'),
        line(d, '    start: "50%,50%"'),
        line(d, '    end: "50%,40%"'),
        line(d, '    duration: 200'),
        line(d, '- tapOn:'),
        line(d, `    id: "${action.testID}-trigger"`),
        line(d, '- extendedWaitUntil:'),
        line(d, '    visible:'),
        line(d, `      id: "${action.testID}-search"`),
        line(d, '    timeout: 5000'),
        line(d, '- tapOn:'),
        line(d, `    id: "${action.testID}-search"`),
        line(d, '- eraseText: 20'),
        line(d, `- inputText: "${action.search}"`),
        line(d, '- pressKey: Enter'),
        // Scroll to reveal option if below screen edge
        line(d, '- swipe:'),
        line(d, '    start: "50%,70%"'),
        line(d, '    end: "50%,50%"'),
        line(d, '    duration: 200'),
        line(d, '- tapOn:'),
        line(d, `    id: "${action.testID}-option-${action.optionCode}"`),
      );
      break;

    case 'date':
      lines.push(
        ...emitScroll(d, action.testID),
        line(d, '- tapOn:'),
        line(d, `    id: "${action.testID}"`),
        // Retry tap if date picker didn't open (scroll animation can swallow first tap)
        line(d, '- runFlow:'),
        line(d, '    when:'),
        line(d, '      notVisible: "Done"'),
        line(d, '    commands:'),
        line(d, '      - tapOn:'),
        line(d, `          id: "${action.testID}"`),
        // Date picker modal — confirm default date
        line(d, '- extendedWaitUntil:'),
        line(d, '    visible: "Done"'),
        line(d, '    timeout: 10000'),
        line(d, '- tapOn: "Done"'),
      );
      break;

    case 'alert':
      lines.push(
        line(d, '- extendedWaitUntil:'),
        line(d, `    visible: "${action.title}"`),
        line(d, '    timeout: 5000'),
        line(d, `- tapOn: "${action.tapButton}"`),
      );
      break;

    case 'assertVisible':
      lines.push(
        line(d, '- extendedWaitUntil:'),
        line(d, `    visible: "${action.text}"`),
        line(d, '    timeout: 10000'),
      );
      break;

    case 'assertVisibleID':
      lines.push(
        line(d, '- extendedWaitUntil:'),
        line(d, '    visible:'),
        line(d, `      id: "${action.testID}"`),
        line(d, '    timeout: 10000'),
      );
      break;

    case 'assertNotVisible':
      lines.push(
        line(d, '- assertNotVisible: ' + JSON.stringify(action.text)),
      );
      break;

    case 'conditional': {
      // If the condition looks like a testID (no spaces, lowercase/hyphens),
      // use id-based visibility check. Otherwise use text matching.
      const isTestID = /^[a-z0-9-]+$/.test(action.whenVisible);
      lines.push(
        line(d, '- runFlow:'),
        line(d, '    when:'),
      );
      if (isTestID) {
        lines.push(
          line(d, '      visible:'),
          line(d, `        id: "${action.whenVisible}"`),
        );
      } else {
        lines.push(
          line(d, `      visible: "${action.whenVisible}"`),
        );
      }
      lines.push(line(d, '    commands:'));
      for (const sub of action.actions) {
        lines.push(...emitAction(sub, d + 3));
      }
      break;
    }

    case 'swipe':
      lines.push(
        line(d, '- swipe:'),
        line(d, `    start: "${action.from}"`),
        line(d, `    end: "${action.to}"`),
        line(d, `    duration: ${action.duration ?? 300}`),
      );
      break;

    case 'inputText':
      lines.push(line(d, `- inputText: "${action.text}"`));
      break;

    case 'wait':
      // No native Maestro wait — use a no-op assertion as delay
      lines.push(
        line(d, '- extendedWaitUntil:'),
        line(d, `    visible: ""`),
        line(d, `    timeout: ${action.ms}`),
      );
      break;

    case 'runSubflow':
      lines.push(line(d, `- runFlow: ${action.file}`));
      break;

    case 'screenshot':
      lines.push(
        line(d, '- takeScreenshot:'),
        line(d, `    path: "maestro/output/${action.name}"`),
      );
      break;

    case 'eraseText':
      lines.push(line(d, `- eraseText: ${action.count}`));
      break;
  }

  return lines;
}

// ── Step → YAML lines ──

function emitStep(step: JourneyStep): string[] {
  const lines: string[] = [];

  // Section comment
  lines.push('');
  lines.push(comment(0, `=== ${step.comment ?? step.screen.toUpperCase()} ===`));

  // Wait for screen identification text
  if (step.waitFor) {
    const waitTexts = Array.isArray(step.waitFor) ? step.waitFor : [step.waitFor];
    for (const text of waitTexts) {
      lines.push(
        `- extendedWaitUntil:`,
        `    visible: "${text}"`,
        `    timeout: ${step.waitTimeout ?? 15000}`,
      );
    }
  }

  // Dismiss Fast Refresh banner if present (common in dev builds)
  lines.push(
    '- runFlow:',
    '    when:',
    '      visible: "Fast Refresh disconnected"',
    '    commands:',
    '      - tapOn: "Dismiss"',
  );

  // Emit each action
  for (const action of step.actions) {
    lines.push(...emitAction(action));
  }

  return lines;
}

// ── Journey → complete YAML file ──

export function emitJourney(journey: Journey): string {
  const lines: string[] = [];

  // Header comment
  lines.push(`# ${journey.description}`);
  lines.push(`# Generated by maestro/generator — do not edit manually.`);
  lines.push(`# Re-generate with: pnpm maestro:generate`);
  lines.push(`appId: ${APP_ID}`);

  if (journey.tags.length > 0) {
    lines.push('tags:');
    for (const tag of journey.tags) {
      lines.push(`  - ${tag}`);
    }
  }

  lines.push('---');

  // Launch with clear state
  if (journey.clearState) {
    lines.push('- launchApp:');
    lines.push('    clearState: true');
  }

  // Emit each step
  for (const step of journey.steps) {
    lines.push(...emitStep(step));
  }

  // Trailing newline
  lines.push('');

  return lines.join('\n');
}
