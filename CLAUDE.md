# CLAUDE.md — Borderly: Universal Travel Declaration App

## Quick Orientation

Borderly is a **local-first mobile app** that stores your travel profile on-device, then auto-generates customs/immigration forms for each destination country. Fill out your info once, travel everywhere. No server stores your passport data — everything stays on your phone.

Read the full MVP proposal in `docs/mvp-proposal.md` for complete technical details.

## The Problem

Every country has its own customs/immigration declaration system (Visit Japan Web, Malaysia MDAC, Singapore SG Arrival Card). Travelers hitting multiple countries re-enter the same passport info into 3+ janky government UIs. The data is 90% identical across countries.

## MVP Scope (Phase 1)

Support **3 countries**: Japan, Malaysia, Singapore (common Asia travel corridor).

**What's included:**
- Passport OCR via camera (MRZ reading)
- Encrypted on-device profile storage
- Trip creation with multi-country itinerary
- Schema-driven form generation per country
- Smart delta — only surface fields unique to each country/trip
- Pre-filled data ready to copy/paste into government portals
- Step-by-step guided walkthrough of each portal
- Offline QR code wallet for storing submission QR codes

**What's NOT included (Phase 2+):**
- Direct API integration with government systems
- Automated browser submission
- NFC passport scanning
- Family/group management
- Trip sync from email/TripIt/Google Flights
- Backend server (schemas ship bundled in app)

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
| **Testing** | Jest + React Native Testing Library |
| **Package Manager** | pnpm |

## Architecture

### Core Principle: Local-First, Zero-Server PII

```
┌─────────────────────────────────────────────────────┐
│                   User's Device                      │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  OS Keychain  │  │ WatermelonDB │  │   MMKV    │  │
│  │ - Passport   │  │ - Trips      │  │ - Prefs   │  │
│  │   data       │  │ - Form data  │  │ - Schemas │  │
│  │ - Encryption │  │ - QR codes   │  │ - Cache   │  │
│  │   keys       │  │ - Countries  │  │ - Flags   │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │           Form Generation Engine              │    │
│  │  Profile + Trip ──> Country Schema ──> Form   │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │           Submission Guide / WebView           │    │
│  │  Step-by-step walkthrough of gov portal       │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
                        │ (user-initiated, direct)
                        ▼
              ┌───────────────────┐
              │  Government       │
              │  Portals          │
              │  (Japan, MY, SG)  │
              └───────────────────┘
```

### Three-Tier Storage

| Tier | Technology | Contents | Security |
|------|-----------|----------|----------|
| **Sensitive** | OS Keychain | Passport data, encryption keys | Biometric-locked, excluded from backups |
| **Structured** | WatermelonDB | Trips, form data, QR codes | Encrypted at rest (key in Keychain) |
| **Config** | MMKV | Preferences, schemas, flags | Not sensitive |

## Project Structure

```
src/
├── app/
│   ├── App.tsx                    # Root component
│   └── navigation/
│       ├── RootNavigator.tsx       # Auth/Onboarding/Main routing
│       ├── MainTabNavigator.tsx    # Bottom tabs
│       └── types.ts
├── screens/
│   ├── onboarding/                # Welcome, PassportScan, ConfirmProfile, BiometricSetup
│   ├── trips/                     # TripList, CreateTrip, TripDetail, LegForm, SubmissionGuide
│   ├── wallet/                    # QRWallet, QRDetail, AddQR
│   ├── profile/                   # Profile, EditProfile
│   └── settings/                  # Settings
├── components/
│   ├── ui/                        # Button, Card, Input, Select, Toggle, StatusBadge
│   ├── passport/                  # MRZScanner, PassportPreview
│   ├── forms/                     # DynamicForm, FormField, FormSection, AutoFilledBadge
│   ├── trips/                     # TripCard, LegCard, CountryFlag
│   ├── wallet/                    # QRCodeCard, QRFullScreen
│   └── guide/                     # StepCard, CopyableField, GuideProgress
├── services/
│   ├── storage/                   # keychain.ts, mmkv.ts, database.ts
│   ├── passport/                  # mrzParser.ts, mrzScanner.ts
│   ├── forms/                     # formEngine.ts, fieldMapper.ts, validators.ts
│   └── schemas/                   # schemaLoader.ts, schemaRegistry.ts
├── stores/                        # Zustand: useProfileStore, useTripStore, useFormStore, useAppStore
├── schemas/                       # Bundled JSON: JPN.json, MYS.json, SGP.json
├── types/                         # profile.ts, trip.ts, schema.ts, navigation.ts
├── utils/                         # crypto.ts, dateUtils.ts, clipboard.ts, constants.ts
└── assets/                        # icons/, flags/, guide screenshots per country

__tests__/
├── services/                      # mrzParser.test.ts, formEngine.test.ts, fieldMapper.test.ts
├── components/                    # DynamicForm.test.tsx
└── schemas/                       # JPN.test.ts, MYS.test.ts, SGP.test.ts
```

## Key Domain Concepts

- **MRZ (Machine Readable Zone)**: The 2-line code at the bottom of passport photo pages. TD3 format, 44 chars per line. Contains name, passport number, nationality, DOB, gender, expiry.
- **Country Form Schema**: JSON definition of what fields each country requires. Maps universal profile fields to country-specific ones via `autoFillSource` dot-notation paths.
- **Form Engine**: The core algorithm — takes profile + trip leg + country schema, produces a filled/partial form. The engine resolves auto-fill sources, identifies remaining fields, and tracks fill stats.
- **Smart Delta**: Only show the user fields that are country-specific or can't be auto-filled. Most travelers answer 3-5 questions per country instead of 30+.
- **Submission Guide**: Step-by-step walkthrough of each government portal with pre-filled values ready to copy/paste.
- **QR Wallet**: Offline storage for QR codes received after form submission (Visit Japan Web gives QR codes for e-Gate entry).

## Security Rules

- Passport data NEVER leaves OS Keychain except into memory for form generation
- WatermelonDB encryption key stored in OS Keychain
- iCloud/Google backup EXCLUDED for Keychain items (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`)
- No analytics/crash reporting captures PII
- All government portal communication is direct device-to-government
- Clear copied passport data from clipboard after 60 seconds
- App lock after 5 minutes of inactivity

## Run Commands

```bash
# Install dependencies
pnpm install

# Run iOS
pnpm ios

# Run Android
pnpm android

# Run tests
pnpm test

# Run tests with coverage
pnpm test --coverage

# Lint
pnpm lint

# Type check
pnpm typecheck

# E2E smoke tests (requires Maestro + iOS simulator running)
maestro test .maestro/app-smoke.yaml
maestro test .maestro/onboarding-flow.yaml
```

## Testing Strategy

The test pyramid has three layers. All run in CI on every PR.

| Layer | Tool | Runs on | What it catches |
|-------|------|---------|-----------------|
| **Unit tests** | Jest + RNTL | ubuntu (fast) | Logic bugs, component behavior |
| **Bundle check** | Metro bundler | ubuntu (fast) | Missing modules, import errors |
| **E2E smoke tests** | Maestro | macOS (simulator) | Runtime crashes, screens not rendering, navigation broken |

Unit tests mock all native modules, so they **cannot** catch missing dependencies or runtime crashes. The Metro bundle check catches unresolved imports. The E2E smoke tests catch everything else by actually launching the app in a simulator.

**When adding new screens:** Add a Maestro flow in `.maestro/` that navigates to and asserts the screen renders. Keep flows short and focused — they run on macOS runners which are slower and more expensive.

## Implementation Sprints

### Sprint 1: Foundation
Project bootstrap, navigation, storage layer (Keychain + MMKV + WatermelonDB), onboarding flow, profile CRUD.

### Sprint 2: Core Form Engine
Country schemas (JPN, MYS, SGP), Form Engine, Field Mapper, DynamicForm component, trip creation, Leg Form Screen.

### Sprint 3: Submission Guide & QR Wallet
Step-by-step portal walkthroughs, CopyableField, QR capture/import/display, MRZ camera scanning.

### Sprint 4: Polish & Ship
Error handling, empty/loading states, data export/delete, privacy policy, app store assets, TestFlight build.

## Skills Reference

Available skills (invoke with `/<skill-name>`):
- `/epic-planner` — Break a goal into Epic + Story GitHub Issues
- `/plan-feature` — Plan and implement a new feature
- `/test-suite` — Find and fix test coverage gaps
- `/organize` — Reorganize file structure
- `/cleanup` — Remove unused files
- `/update-architecture` — Update architecture diagrams
- `/refactor-design` — Audit and fix architecture issues
- `/qa` — Walk through the app and document bugs

## Autonomous Workflow

When working from a GitHub issue (via the Claude GitHub App):
1. Read this file first for project context
2. Read `docs/mvp-proposal.md` for detailed specs, data models, and implementation code
3. Follow the skill referenced in the issue body
4. Create a PR with `Closes #N` in the body (N = issue number)
5. Ensure all tests pass before pushing (`pnpm test`)
6. Verify the Metro bundle builds: `npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output /tmp/bundle.js`
7. If you added/modified screens, add or update a Maestro E2E flow in `.maestro/`
8. Run `/update-architecture` if code structure changed

### Native Dependency Rules

- **Never add a native dependency without verifying it resolves at bundle time.** After adding a package that includes native code (e.g., `react-native-haptic-feedback`), run `pnpm install` and verify the module resolves by building the app or running the Metro bundler. On CI (ubuntu), the Metro bundle check will catch unresolved modules.
- **Never use `|| true` to silence quality checks** (typecheck, lint, bundle). If a check fails, fix the underlying issue.
- **When mocking a native module in `jest.setup.js`**, understand that this hides real import failures. The Metro bundle check in CI is the safety net that catches missing modules.

### Git Commit Rules

- **Never use `git add -A` or `git add .`** — always add specific files
- **Check `git status` before committing** to verify only intended files are staged
- **Never commit generated files** (`node_modules/`, `ios/Pods/`, `android/build/`, etc.)

### Push Early, Push Often

Commit and push after every 2-3 file changes. Do not wait until the end of a session.
