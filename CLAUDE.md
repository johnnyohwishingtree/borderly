# CLAUDE.md — Borderly: Universal Travel Declaration App

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
| **Testing** | Jest + RNTL, Playwright (E2E), Maestro (native E2E) |
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

## Knowledge Graph

Project knowledge lives in `.knowledge/` — the pipeline reads and improves these files.

| Engine | Directory | Purpose |
|--------|-----------|---------|
| Policies | `policies/` | ALLOW/DENY/REQUIRE rules (architecture, data, ui, state, testing, platform) |
| Models | `models/` | Business entities (form-engine, passport, qr-wallet, submission-guide) |
| Domain | `domain/countries/` | Per-country portal metadata |
| Patterns | `patterns/` | Multi-step recipes (add-country, add-screen, add-native-dep) |
| Templates | `templates/` | File structure (module, test, story, epic, skill) |
| Rubrics | `rubrics/` | Quality evaluation (code, test, skill) |

See `.knowledge/index.md` for the full system map.

## Rules

Rules in `.claude/rules/` are auto-loaded every session. Key ones:
- **Bug fix workflow**: Write failing test first, then fix
- **Commit gate**: Run lint + typecheck + tests before every commit
- **File size**: Keep under 500 lines, split when exceeded

## Skills Reference

See `.knowledge/index.md` for all 17 skills. Key pipeline skills:
- `/pipeline` — Autonomous story loop (hourly scheduled task)
- `/code-audit` — Code vs policy compliance (3x daily scheduled task)
- `/optimize` — Resolve knowledge gaps, compress bloated files

## Autonomous Workflow

Borderly is orchestrated by Claude Code scheduled tasks — no GitHub Actions runners.

**To start work:** create a GitHub Issue with `story` and `pending` labels.

**Scheduled task prompts:**
```
Hourly:    Read CLAUDE.md. Read .claude/skills/pipeline/SKILL.md and follow every step.
3x daily:  Read CLAUDE.md. Read .claude/skills/code-audit/SKILL.md and follow every step.
```
