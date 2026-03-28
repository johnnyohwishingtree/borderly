/**
 * Maestro YAML emitter.
 *
 * Converts Journey objects into valid Maestro YAML flow files.
 * Screen-aware: uses ScreenLayout metadata to make deterministic
 * scroll decisions. Never scrolls blindly.
 */
import type { Action, Journey, JourneyStep } from './types';
import type { ScreenLayout, ScreenSpec } from './screenRegistry';
import { getScreen } from './screenRegistry';

const APP_ID = 'com.borderly.app';
const INDENT = '  ';

// ── YAML line helpers ──

function line(depth: number, text: string): string {
  return INDENT.repeat(depth) + text;
}

function comment(depth: number, text: string): string {
  return line(depth, `# ${text}`);
}

// ── Scroll emission ──

/** Emit a scrollUntilVisible block.
 * waitToSettleTimeoutMs ensures scroll animation completes before the next action. */
/** Emit a scrollUntilVisible block. */
function emitScrollBlock(d: number, testID: string): string[] {
  return [
    line(d, '- scrollUntilVisible:'),
    line(d, '    element:'),
    line(d, `      id: "${testID}"`),
    line(d, '    direction: DOWN'),
    line(d, '    timeout: 8000'),
    line(d, '    visibilityPercentage: 30'),
    line(d, '    centerElement: true'),
    line(d, '    waitToSettleTimeoutMs: 200'),
  ];
}

// ── Screen-aware scroll decision ──

interface EmitContext {
  screenName: string;
  layout: ScreenLayout;
  screen?: ScreenSpec;
}

const DEFAULT_LAYOUT: ScreenLayout = {
  scrollable: true,
  fitsOnScreen: false,
  elementOrder: [],
};

/**
 * Deterministic scroll decision based on screen layout metadata.
 *
 * Without centerElement, scrollUntilVisible is a no-op for already-visible
 * elements — Maestro checks visibility at runtime and only scrolls if needed.
 * So we emit scrollUntilVisible liberally and let Maestro handle it.
 *
 * We only skip the scroll command entirely when we KNOW it's unnecessary:
 * 1. Action explicitly says scroll: false → don't scroll (manual override)
 * 2. Action explicitly says scroll: true → scroll (manual override)
 * 3. Screen not scrollable (no ScrollView) → don't scroll
 * 4. Element zone is header/footer → don't scroll (fixed position)
 * 5. Default: emit scrollUntilVisible (Maestro skips it if element is visible)
 */
function shouldScroll(
  testID: string,
  explicitScroll: boolean | undefined,
  ctx: EmitContext,
): boolean {
  // 1-2. Manual override takes priority
  if (explicitScroll === false) return false;
  if (explicitScroll === true) return true;

  // 3. Screen has no ScrollView — never scroll
  if (!ctx.layout.scrollable) return false;

  // 4. Check element zone from registry — fixed elements don't scroll
  if (ctx.screen) {
    const field = ctx.screen.fields.find(f => f.testID === testID);
    const button = ctx.screen.actionButtons.find(b => b.testID === testID);
    const zone = field?.zone ?? button?.zone;
    if (zone === 'header' || zone === 'footer') return false;
  }

  // 5. Default: emit scrollUntilVisible — Maestro handles visibility at runtime
  return true;
}

// ── Action → YAML lines ──

function emitAction(action: Action, depth: number, ctx: EmitContext): string[] {
  const lines: string[] = [];
  const d = depth;

  switch (action.type) {
    case 'tap':
      if (shouldScroll(action.testID, action.scroll, ctx)) {
        lines.push(...emitScrollBlock(d, action.testID));
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
      if (shouldScroll(action.testID, action.scroll, ctx)) {
        lines.push(...emitScrollBlock(d, action.testID));
      }
      lines.push(
        line(d, '- tapOn:'),
        line(d, `    id: "${action.testID}"`),
        line(d, `- inputText: "${action.value}"`),
        // Dismiss keyboard
        line(d, '- hideKeyboard'),
      );
      break;

    case 'select':
      // Scroll to the trigger button (not the wrapper View — wrapper may be too large)
      if (shouldScroll(`${action.testID}-trigger`, action.scroll, ctx)) {
        lines.push(...emitScrollBlock(d, `${action.testID}-trigger`));
      }
      lines.push(
        line(d, '- tapOn:'),
        line(d, `    id: "${action.testID}-trigger"`),
        line(d, '- extendedWaitUntil:'),
        line(d, '    visible:'),
        line(d, `      id: "${action.testID}-search"`),
        line(d, '    timeout: 3000'),
        line(d, '- tapOn:'),
        line(d, `    id: "${action.testID}-search"`),
        line(d, '- eraseText: 20'),
        line(d, `- inputText: "${action.search}"`),
        line(d, '- pressKey: Enter'),
        // If Enter selected the only match, dropdown is closed — tap option as fallback
        line(d, '- runFlow:'),
        line(d, '    when:'),
        line(d, '      visible:'),
        line(d, `        id: "${action.testID}-option-${action.optionCode}"`),
        line(d, '    commands:'),
        line(d, '      - tapOn:'),
        line(d, `          id: "${action.testID}-option-${action.optionCode}"`),
      );
      break;

    case 'date':
      if (shouldScroll(action.testID, action.scroll, ctx)) {
        lines.push(...emitScrollBlock(d, action.testID));
      }
      lines.push(
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
        line(d, '    timeout: 3000'),
        line(d, '- tapOn: "Done"'),
      );
      break;

    case 'alert':
      lines.push(
        line(d, '- extendedWaitUntil:'),
        line(d, `    visible: "${action.title}"`),
        line(d, '    timeout: 3000'),
        line(d, `- tapOn: "${action.tapButton}"`),
      );
      break;

    case 'assertVisible':
      lines.push(
        line(d, `- assertVisible: "${action.text}"`),
      );
      break;

    case 'assertVisibleID':
      lines.push(
        line(d, '- assertVisible:'),
        line(d, `    id: "${action.testID}"`),
      );
      break;

    case 'assertNotVisible':
      lines.push(
        line(d, '- assertNotVisible: ' + JSON.stringify(action.text)),
      );
      break;

    case 'conditional': {
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
        lines.push(...emitAction(sub, d + 3, ctx));
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

  // Build screen context for scroll decisions
  const screen = getScreen(step.screen);
  const ctx: EmitContext = {
    screenName: step.screen,
    layout: screen?.layout ?? DEFAULT_LAYOUT,
    screen,
  };

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
        `    timeout: ${step.waitTimeout ?? 3000}`,
      );
    }
  }

  // Emit each action with screen context
  for (const action of step.actions) {
    lines.push(...emitAction(action, 0, ctx));
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

  // Dismiss Fast Refresh banner once at launch (dev builds only)
  lines.push(
    '- runFlow:',
    '    when:',
    '      visible: "Fast Refresh disconnected"',
    '    commands:',
    '      - tapOn: "Dismiss"',
  );

  // Emit each step
  for (const step of journey.steps) {
    lines.push(...emitStep(step));
  }

  // Trailing newline
  lines.push('');

  return lines.join('\n');
}
