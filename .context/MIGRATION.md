# Knowledge → Context Migration Log

Tracks what happened to every `.knowledge/` file during migration.

## Facts → Moved to .context/external/ (external truths)

| Old path | New path | Reason |
|---|---|---|
| `facts/regulatory/*` (5) | `.context/external/regulatory/` | External law |
| `facts/cognitive/*` (6) | `.context/external/cognitive/` | Human behavior |
| `facts/market/*` (3) | `.context/external/market/` | Competitive landscape |
| `facts/customer/travelers-fill-forms-at-borders.md` | `.context/external/customer/` | User behavior |
| `facts/customer/family-travelers-share-devices.md` | `.context/external/customer/` | User behavior |
| `facts/customer/multi-leg-trips-are-common.md` | `.context/external/customer/` | User behavior |
| `facts/customer/users-dont-understand-portal-jargon.md` | `.context/external/customer/` | User behavior |
| `facts/customer/users-wont-verify-auto-filled-values-carefully.md` | `.context/external/customer/` | User behavior |
| `facts/domain/portals-are-not-apis.md` | `.context/external/countries/` | Government behavior |
| `facts/domain/errors-have-consequences.md` | `.context/external/countries/` | Government behavior |
| `facts/domain/passport-mrz-is-standardized.md` | `.context/external/countries/` | External standard |
| `facts/domain/forms-change-without-notice.md` | `.context/external/countries/` | Government behavior |
| `facts/domain/field-semantics-stable-labels-vary.md` | `.context/external/countries/` | Government behavior |
| `facts/domain/every-country-unique-rules.md` | `.context/external/countries/` | Government behavior |
| `facts/domain/submission-deadlines-vary-widely.md` | `.context/external/countries/` | Government behavior |
| `facts/tool/*` (9) | `.context/external/tools/` | Library/OS properties |

## Facts → Were actually decisions (redundant with decisions/)

| Old path | Covered by | Action |
|---|---|---|
| `facts/organizational/three-tier-storage.md` | `decisions/001-three-tier-storage.md` | Delete |
| `facts/organizational/schema-first-development.md` | `decisions/002-schema-driven-forms.md` | Delete |
| `facts/tool/bare-rn-not-expo.md` | `decisions/005-bare-react-native.md` | Kept in external/tools as tool property |
| `facts/organizational/policies-over-rules.md` | System design choice | Delete |
| `facts/organizational/pipeline-learning-is-mandatory.md` | Process choice, lives in skill instructions | Delete |
| `facts/organizational/structural-tests-enforce-policies.md` | Self-evident from __tests__/structure/ existing | Delete |

## Facts → Were actually beliefs/opinions (moved to beliefs.ts or deleted)

| Old path | Action | Reason |
|---|---|---|
| `facts/craft/tests-are-specifications.md` | In beliefs.ts as testCountIsNotAGoal | Design philosophy |
| `facts/craft/fail-fast.md` | Delete — enforced by test structure itself | Design preference |
| `facts/craft/interfaces-over-implementations.md` | Delete — enforced by dependency-direction.test.ts | Design preference |
| `facts/craft/separation-of-concerns.md` | Delete — enforced by dependency-direction.test.ts | Design preference |
| `facts/craft/size-indicates-scope-creep.md` | Delete — could be ESLint max-lines rule | Heuristic |
| `facts/craft/state-is-the-source-of-bugs.md` | Delete — enforced by store-boundaries test | Strong opinion |
| `facts/craft/naming-enables-automation.md` | Delete — structural tests demonstrate this | Tautology |
| `facts/craft/caching-trades-freshness-for-speed.md` | Delete | CS truism |
| `facts/craft/test-complexity-mirrors-user-complexity.md` | Delete | Design philosophy |
| `facts/organizational/render-tests-catch-no-bugs.md` | Covered by decisions/006 | Opinion |
| `facts/organizational/test-count-inflates-confidence.md` | In beliefs.ts as testCountIsNotAGoal | Opinion |
| `facts/organizational/parameterized-tests-dominate-count.md` | Delete — observable from test output | Current-state measurement |

## Facts → Deletable (current-state measurements, fixed bugs)

| Old path | Action | Reason |
|---|---|---|
| `facts/customer/create-trip-has-12-fields.md` | Delete | Count the screen. Changes when screen changes. |
| `facts/customer/portal-tab-bar-causes-mistaps.md` | Delete | Fixed bug. Fix is in git history. |
| `facts/customer/onboarding-requires-32-interactions.md` | Delete | Count the flow. Changes when flow changes. |
| `facts/customer/family-travelers-need-companion-discovery.md` | Delete | UX observation, lives in the UI itself |
| `facts/organizational/biometric-asymmetric-ux.md` | Delete | Implementation detail in code |
| `facts/organizational/llm-instruction-compliance-is-probabilistic.md` | Keep in .context/external/tools/ | About LLMs, external |
| `facts/craft/hook-stdout-is-token-cost.md` | Keep in .context/external/tools/ | About Claude Code hooks, external |
| `facts/craft/shell-beats-llm-for-deterministic-work.md` | Keep in .context/external/tools/ | About LLM behavior, external |
| `facts/craft/llm-analysis-is-batchable.md` | Keep in .context/external/tools/ | About LLM behavior, external |
| `facts/domain/boolean-fields-default-false.md` | Delete | Schema convention, lives in schema validation test |
| `facts/domain/country-schemas-define-required-fields.md` | Delete | Self-evident from schemas existing |
| `facts/domain/autofill-requires-leg-data.md` | Delete | Implementation detail in formEngine.ts |
| `facts/domain/autofill-value-requires-minimum-data-collection.md` | Delete | Implementation detail in formEngine.ts |

## Temporal facts → Already in schema metadata

| Old path | Lives in | Action |
|---|---|---|
| `facts/temporal/*.md` (14) | `src/schemas/*.json` metadata.lastVerified + country files | Delete (redundant) |

## Beliefs → Graduated to src/config/beliefs.ts

All 12 belief files → `src/config/beliefs.ts` as typed constants.

## Principles → Deleted (absorbed by structural tests + comments)

All 11 principle files deleted. The structural tests they justified exist. Comments on tests reference the external context that justifies them.

## Policies → Already structural tests (no migration needed)

28 policies already have corresponding structural tests. The test IS the policy. Policy files become redundant once test comments reference the external context.

## Models → Already TypeScript types (no migration needed)

8 model files are redundant with TypeScript types in `src/types/`. Delete after adding JSDoc where needed.

## Decisions → Moved to .context/decisions/

6 decision files → `.context/decisions/` unchanged. These are permanent prose.

## Domain countries → Moved to .context/external/countries/

15 country files → `.context/external/countries/` unchanged. External portal behavior.

## Patterns → Moved to .context/patterns/

2 patterns (add-country, add-screen) → `.context/patterns/`. Others deleted or become generators.

## Templates → Deleted

6 template files deleted. LLM reads existing code to learn patterns.

## Rubrics → Deleted

3 rubric files deleted. Quality thresholds live in CI config and skill instructions.
