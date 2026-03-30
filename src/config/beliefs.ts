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
  confirm?: string;    // what evidence would promote this to confirmed
  invalidate?: string; // what evidence would kill this
}

function belief<T>(
  value: T,
  status: BeliefStatus,
  note: string,
  lifecycle?: { confirm?: string; invalidate?: string },
): Belief<T> {
  return { value, status, note, ...lifecycle };
}

export const BELIEFS = {
  /** @belief Auto-fill below this rate isn't useful enough to show the pill */
  autoFillSufficientThreshold: belief(
    0.5,
    'hypothesis',
    'May be too low for complex forms with 50+ fields',
    {
      confirm: 'User testing shows >= 80% of users proceed when auto-fill rate hits 50%',
      invalidate: 'Users abandon forms even when 50% of fields are auto-filled',
    },
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
    {
      confirm: 'Analytics show higher completion rate with smart delta enabled vs full form',
      invalidate: 'Users toggle smart delta off or miss fields because they were hidden',
    },
  ),

  /** @belief Integration tests catch more real bugs than unit tests for this app */
  integrationTestsOverUnitTests: belief(
    true,
    'working',
    'Got burned when mocked tests passed but real integration failed',
    {
      confirm: 'Integration tests catch 3x more regressions than unit tests over 6 months',
      invalidate: 'Integration tests become too slow (> 30s suite) or too flaky to be useful',
    },
  ),

  /** @belief Privacy as differentiator — users choose us because data stays on device */
  localFirstIsDifferentiator: belief(
    true,
    'working',
    'Hypothesis: users care about passport data privacy. Needs validation.',
    {
      confirm: 'App store reviews or user interviews mention privacy as reason for choosing Borderly',
      invalidate: 'Users ask for cloud sync / cross-device features despite privacy trade-off',
    },
  ),

  /** @belief Southeast Asia is the right first market */
  asiaPacificFirstMarket: belief(
    true,
    'working',
    'Highest volume of cross-border travel, most complex portal landscape',
    {
      confirm: 'First 1000 users are predominantly APAC travelers',
      invalidate: 'European or North American travelers adopt faster despite fewer supported portals',
    },
  ),

  /** @belief Users at borders won't spend 5min on trip setup */
  tripCreationShouldBeLightweight: belief(
    true,
    'working',
    'Create trip should feel quick — minimal required fields upfront',
    {
      confirm: 'Trip creation completion rate > 90% after simplifying to name + country',
      invalidate: 'Users need flight/accommodation at creation time for auto-fill to work on first form view',
    },
  ),

  /** @belief Portal should take full screen — no app chrome competing for attention */
  portalShouldBeFullscreen: belief(
    true,
    'working',
    'Government portals are complex enough without our UI on top',
    {
      confirm: 'Users don\'t try to navigate back to app while filling portal forms',
      invalidate: 'Users get lost in portal and need app guidance overlay to find their way back',
    },
  ),

  /** @belief Onboarding should be passport scan + go, not a wizard */
  minimalOnboarding: belief(
    true,
    'working',
    'Every extra onboarding step loses users. Scan passport, start trip.',
    {
      confirm: 'Onboarding completion rate > 80% with scan-and-go flow',
      invalidate: 'Users need manual profile entry because OCR fails > 30% of the time',
    },
  ),

  /** @belief Constraints should be executable code, not prose documentation */
  constraintsDrivenDevelopment: belief(
    true,
    'working',
    'Validated by knowledge→context migration: 178 prose files → structural tests + typed constants. Prose drifts from code; tests enforce.',
  ),
} as const;
