/**
 * Product beliefs — assumptions that shape the codebase.
 *
 * Each belief has a status:
 * - confirmed: validated by evidence, safe to build on
 * - working: reasonable assumption, not yet proven
 * - hypothesis: untested, may be wrong
 *
 * When code references a threshold or design choice that isn't
 * obviously correct, it should import from here. If a belief is
 * invalidated, change it here and the compiler shows every callsite.
 */

export type BeliefStatus = 'confirmed' | 'working' | 'hypothesis';

interface Belief<T> {
  value: T;
  status: BeliefStatus;
  note: string;
}

function belief<T>(value: T, status: BeliefStatus, note: string): Belief<T> {
  return { value, status, note };
}

export const BELIEFS = {
  /** @belief Auto-fill below this rate isn't useful enough to show the pill */
  autoFillSufficientThreshold: belief(
    0.5,
    'hypothesis',
    'May be too low for complex forms with 50+ fields',
  ),

  /** @belief The core product promise — enter data once, fill every form */
  scanOnceFillEverywhere: belief(
    true,
    'confirmed',
    'Entire architecture built around this. No competitor does it.',
  ),

  /** @belief One JSON schema per country scales better than hardcoded components */
  schemaDrivenFormsScale: belief(
    true,
    'confirmed',
    '14 countries proves the pattern works at current scale',
  ),

  /** @belief User must submit, not the app — regulatory + trust */
  guidedSubmissionOverAutomation: belief(
    true,
    'confirmed',
    'Portal ToS prohibit automation. Legal requirement, not preference.',
  ),

  /** @belief Test count is vanity metric — bug-catching ability is what matters */
  testCountIsNotAGoal: belief(
    true,
    'confirmed',
    'Render-only tests inflate count without catching bugs',
  ),

  /** @belief Showing only unfilled fields increases completion rate */
  smartDeltaIncreasesCompletion: belief(
    true,
    'working',
    'Fewer visible fields = less friction. Needs user research to confirm.',
  ),

  /** @belief Integration tests catch more real bugs than unit tests for this app */
  integrationTestsOverUnitTests: belief(
    true,
    'working',
    'Got burned when mocked tests passed but real integration failed',
  ),

  /** @belief Privacy as differentiator — users choose us because data stays on device */
  localFirstIsDifferentiator: belief(
    true,
    'working',
    'Hypothesis: users care about passport data privacy. Needs validation.',
  ),

  /** @belief Southeast Asia is the right first market */
  asiaPacificFirstMarket: belief(
    true,
    'working',
    'Highest volume of cross-border travel, most complex portal landscape',
  ),

  /** @belief Users at borders won't spend 5min on trip setup */
  tripCreationShouldBeLightweight: belief(
    true,
    'working',
    'Create trip should feel quick — minimal required fields upfront',
  ),

  /** @belief Portal should take full screen — no app chrome competing for attention */
  portalShouldBeFullscreen: belief(
    true,
    'working',
    'Government portals are complex enough without our UI on top',
  ),

  /** @belief Onboarding should be passport scan + go, not a wizard */
  minimalOnboarding: belief(
    true,
    'working',
    'Every extra onboarding step loses users. Scan passport, start trip.',
  ),
} as const;
