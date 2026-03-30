# CLAUDE.md — Borderly: Universal Travel Declaration App

## How to work on this codebase

When the user asks for a change (feature, fix, refactor, improvement):
1. Run `/plan` to write skipped spec tests encoding what should be true
2. Run `/implement` to resolve the skipped tests (1-2 files)
3. If restructuring is needed (new directories, file moves, test migration) → run `/refactor` instead

When the user asks to audit or review: run the relevant audit skill directly.

## Quick Orientation

Borderly is a **local-first mobile app** that stores your travel profile on-device, then auto-generates customs/immigration forms for each destination country. Fill out your info once, travel everywhere. No server stores your passport data.

Read `docs/mvp-proposal.md` for complete technical details.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React Native (bare workflow) |
| **Language** | TypeScript (strict mode) |
| **Navigation** | React Navigation v7 |
| **State** | Zustand |
| **Sensitive Storage** | react-native-keychain (OS Keychain) |
| **App Config** | react-native-mmkv |
| **Local Database** | WatermelonDB (SQLite-backed) |
| **Camera/OCR** | react-native-camera + ML Kit text recognition |
| **Styling** | NativeWind (Tailwind for RN) |
| **Forms** | React Hook Form + Zod |
| **Testing** | Jest + RNTL, Playwright (E2E), mobilecli (native E2E) |
| **Package Manager** | pnpm |

## Project Structure

```
src/
├── app/navigation/          # RootNavigator, MainTabNavigator
├── screens/<domain>/        # Each screen in named folder: <Name>/<Name>.tsx
├── components/<domain>/     # UI components, forms, trips, wallet, profile, guide
├── services/                # storage/, passport/, forms/, schemas/
├── stores/                  # Zustand: useProfileStore, useTripStore, useFormStore, useAppStore
├── schemas/                 # Bundled JSON: JPN.json, MYS.json, SGP.json, ...
├── hooks/                   # Custom hooks extracted from screens
├── types/                   # Shared type definitions
└── utils/                   # Helpers: crypto, dateUtils, clipboard, accessibility

__tests__/                   # Mirrors src/ structure
e2e/                         # Playwright + mocks + webpack config
```

## Run Commands

```bash
pnpm install          # Install dependencies
pnpm ios              # Run iOS
pnpm android          # Run Android
pnpm test             # Run tests
pnpm lint             # Lint
pnpm typecheck        # Type check
pnpm web              # Run web (native modules mocked)
pnpm e2e              # E2E smoke tests (Playwright)
```

## Constraints

Architecture constraints live as JSDoc headers in `__tests__/structure/` test files.
Each structural test IS the constraint — it runs in < 1s at `pnpm test` time.

| Test File | Constraint |
|-----------|-----------|
| `dependency-direction.test.ts` | Screens -> Hooks -> Stores -> Services |
| `storage-boundary.test.ts` | Three-tier storage: Keychain / WatermelonDB / MMKV |
| `pii-boundary.test.ts` | stripPIIFromFormData before DB persist |
| `hooks-barrel.test.ts` | All hooks exported from barrel, use\<Domain\>\<Action\> naming |
| `screen-folder-convention.test.ts` | Screen in named folder: \<Name\>/\<Name\>.tsx |
| `component-testids.test.ts` | testIDs on interactive elements |
| `native-module-mocks.test.ts` | Web mock + Jest mock for every native module |
| `utils-boundary.test.ts` | Utils are pure — no state, no storage |
| `accessibility-props.test.ts` | accessibilityRole + accessibilityLabel on interactive elements |

## Knowledge & Context

| Location | Purpose |
|----------|---------|
| `.context/external/` | Truths about systems we don't control (governments, laws, tools) |
| `.context/decisions/` | Architecture decision records (immutable) |

## Rules

Rules in `.claude/rules/` are auto-loaded every session. Key ones:
- **Bug fix workflow**: Write failing test first, then fix
- **Commit gate**: Run lint + typecheck + tests before every commit
- **File size**: Keep under 500 lines, split when exceeded

## Skills Reference

Key skills:
- `/plan` — Turn any request into skipped spec tests (`test.skip`)
- `/implement` — Resolve skipped spec tests (read spec, implement, unskip, verify)
- `/pipeline` — Autonomous loop: find skipped tests, implement, merge (scheduled hourly)
- `/code-audit` — Scan code vs constraints, write `test.skip` for violations
- `/context-audit` — Drift detection, schema staleness, spec lifecycle
- `/ux-review` — UX flow analysis → write `test.skip` for gaps
- `/test-audit` — Test quality scoring → write `test.skip` for rewrites

## Autonomous Workflow

Borderly is orchestrated by Claude Code scheduled tasks — no GitHub Actions runners.

**To start work:** run `/plan` to write skipped spec tests, then `/implement` to resolve them.

**Scheduled task prompts:**
```
Hourly:     Read CLAUDE.md. Read .claude/skills/pipeline/SKILL.md and follow every step.
1x daily:   Read CLAUDE.md. Read .claude/skills/code-audit/SKILL.md and follow every step.
1x daily:   Read CLAUDE.md. Read .claude/skills/context-audit/SKILL.md and follow every step.
1x daily:   Read CLAUDE.md. Read .claude/skills/ux-review/SKILL.md and follow every step.
1x weekly:  Read CLAUDE.md. Read .claude/skills/test-audit/SKILL.md and follow every step.
```
