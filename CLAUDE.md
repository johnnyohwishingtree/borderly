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

# Run Web (preview, native modules are mocked)
pnpm web

# E2E smoke tests (Playwright + React Native Web)
pnpm e2e
```

## Testing Strategy

The test pyramid has three layers. All run in CI on every PR.

| Layer | Tool | Runs on | What it catches |
|-------|------|---------|-----------------|
| **Unit tests** | Jest + RNTL | ubuntu (fast) | Logic bugs, component behavior |
| **Bundle check** | Metro bundler | ubuntu (fast) | Missing modules, import errors |
| **E2E smoke tests** | Playwright + RN Web | ubuntu (fast) | Runtime crashes, screens not rendering, navigation broken |

Unit tests mock all native modules, so they **cannot** catch missing dependencies or runtime crashes. The Metro bundle check catches unresolved imports. The E2E smoke tests render the full app in Chromium via React Native Web and verify screens appear correctly.

**When adding new screens:** Add a Playwright test in `e2e/tests/` that verifies the screen renders. If the screen uses a new native module, add a mock in `e2e/mocks/` and wire it up in `webpack.config.js`.

## Implementation Status

### ✅ Sprint 1: Foundation (Complete)
- [x] Project bootstrap with React Native + TypeScript
- [x] Navigation structure (React Navigation v7)
- [x] Storage layer (Keychain + MMKV + WatermelonDB)
- [x] Onboarding flow (Welcome → PassportScan → ConfirmProfile → BiometricSetup)
- [x] Profile CRUD operations
- [x] Secure encrypted storage implementation

### ✅ Sprint 2: Core Form Engine (Complete)
- [x] Country schemas (JPN, MYS, SGP) with full field definitions
- [x] Form Engine with auto-fill logic and smart delta detection
- [x] Field Mapper with dot-notation path resolution
- [x] DynamicForm component with validation
- [x] Trip creation and management
- [x] Leg Form Screen with pre-filled data

### ✅ Sprint 3: Submission Guide & QR Wallet (Complete)
- [x] Step-by-step portal walkthroughs with CopyableField component
- [x] QR capture, import, and display functionality
- [x] MRZ camera scanning with ML Kit integration
- [x] Offline QR code wallet with search and organization
- [x] Submission guide with government portal integration

### 🔄 Sprint 4: Testing & Documentation (In Progress)
- [x] Comprehensive E2E test suite for user workflows
- [x] Performance tests for form generation and camera operations
- [x] Unit tests for all core services and components
- [ ] User guide documentation
- [ ] Implementation status documentation
- [ ] Final polish and error handling improvements

## Skills Reference

Available skills (invoke with `/<skill-name>`):
- `/review-pr` — Perform a comprehensive code review of a PR
- `/epic-planner` — Break a goal into Epic + Story GitHub Issues
- `/plan-feature` — Plan and implement a new feature
- `/test-suite` — Find and fix test coverage gaps
- `/organize` — Reorganize file structure
- `/cleanup` — Remove unused files
- `/update-architecture` — Update architecture diagrams
- `/refactor-design` — Audit and fix architecture issues
- `/qa` — Walk through the app and document bugs

## Autonomous Workflow

When working from a GitHub issue (via the Claude or Gemini GitHub App):
1. Read this file first for project context
2. Read `docs/mvp-proposal.md` for detailed specs, data models, and implementation code
3. Follow the skill referenced in the issue body
4. **Agent Choice**: Use `@claude` for Anthropic's Claude Code or `@gemini` for Google's Gemini CLI. Both are compatible with the project's skills and conventions.
5. Create a PR with `Closes #N` in the body (N = issue number)
6. **Before pushing, verify ALL checks pass:**
   - `pnpm typecheck` — must pass with zero errors
   - `pnpm test` — all unit tests must pass
   - `pnpm e2e` — all E2E tests must pass
7. Verify the Metro bundle builds: `npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output /tmp/bundle.js`
8. If you added/modified screens, add or update a Playwright E2E test in `e2e/tests/`
9. Run `/update-architecture` if code structure changed

### Dual-Model Support

This project supports both **Claude** and **Gemini** as autonomous agents.
- **Trigger**: `@claude` or `@gemini` in issue/PR comments.
- **Skill Compatibility**: Both agents share the same skills in `.claude/skills/`.
- **Handoff**: If one agent hits a usage limit or fails, you can switch to the other by commenting on the same issue.
- **Review Guardian**: An automated system monitors for "Gemini Code Assist" failures. If the standard app fails to summarize or review a PR, it automatically triggers `@gemini` (or the preferred agent) to perform a fallback review.
- **Story Pipeline**: The `orchestrate.yml` pipeline uses the `PREFERRED_AGENT` repository variable (default: `claude`) to decide which agent to trigger for the next story.

### Auto-Fix Workflow (when responding to failing CI comments)

When you receive a comment like "@claude Tests are failing on this PR" (or "@gemini"):
1. Read the error output in the comment carefully
2. Diagnose the root cause — do NOT blindly change code
3. Make the fix
4. **Run ALL of the following and verify they pass before committing:**
   - `pnpm typecheck` — must pass with zero errors
   - `pnpm test` — all unit tests must pass
   - `pnpm e2e` — all E2E tests must pass
5. Only after ALL three pass: git add, git commit, and git push
6. If any check still fails after your fix, debug further — do NOT push failing code hoping CI will pass

### Native Dependency Rules

- **Never add a native dependency without also adding a web mock.** When you add a package that includes native code (e.g., `react-native-haptic-feedback`, `react-native-heroicons`), you MUST also: (1) create a mock in `e2e/mocks/`, (2) add an alias in `webpack.config.js`, and (3) verify `pnpm e2e` passes. Native modules install fine but **crash at runtime in the browser** — webpack won't catch this at build time.
- **Never add a native dependency without linking it for iOS.** After adding a package with native code: (1) run `cd ios && pod install` to link the native module, (2) if the package requires fonts or assets (e.g., `react-native-vector-icons`), register them in `ios/Borderly/Info.plist` under `UIAppFonts`, (3) commit the updated `Podfile.lock` and `Info.plist`.
- **Never bump `react` independently of `react-native`.** React Native pins a specific React version via `react-native-renderer`. Check `node_modules/react-native/package.json` peerDependencies to find the expected React version. Mismatches cause runtime crashes.
- **Never use `|| true` to silence quality checks** (typecheck, lint, bundle). If a check fails, fix the underlying issue.
- **When mocking a native module in `jest.setup.js`**, understand that this hides real import failures. The Metro bundle check in CI is the safety net that catches missing modules.

### TypeScript: Check Types Continuously

- **Run `pnpm typecheck` after writing or modifying every `.ts`/`.tsx` file.** Do NOT wait until you're "done" — check immediately after each file so you catch errors while the code is fresh.
- If typecheck fails, fix the errors before moving to the next file.
- Common mistakes to avoid:
  - Declaring variables you don't use (TS6133) — delete them or use them
  - Assigning `string | undefined` to a `string` field — add a fallback or make the type optional
  - Import conflicts — don't re-import names that are already in scope
  - Using type arguments on untyped functions (TS2347) — add proper type annotations
- **Never commit code that fails `pnpm typecheck`.** This is a hard rule.

### Git Commit Rules

- **Never use `git add -A` or `git add .`** — always add specific files
- **Check `git status` before committing** to verify only intended files are staged
- **Never commit generated files** (`node_modules/`, `ios/Pods/`, `android/build/`, etc.)
- **Run `pnpm typecheck` before every commit.** If it fails, fix the errors first.

### Push Early, Push Often

Commit and push after every 2-3 file changes. Do not wait until the end of a session. But **always run `pnpm typecheck` before each commit** — never push code with type errors.
