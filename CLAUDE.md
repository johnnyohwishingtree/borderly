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
- Family/group management with secure multi-profile support

**What's NOT included (Phase 2+):**
- Direct API integration with government systems
- Automated browser submission
- NFC passport scanning
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
├── screens/                         # Each screen in a named folder: <ScreenName>/<ScreenName>.tsx
│   ├── onboarding/                # Welcome, Tutorial, PassportScan, ConfirmProfile, BiometricSetup
│   ├── trips/                     # TripList, CreateTrip, TripDetail, LegForm, SubmissionGuide
│   ├── wallet/                    # QRWallet, QRDetail, AddQR
│   ├── profile/                   # Profile, EditProfile, FamilyManagement, AddFamilyMember
│   ├── settings/                  # Settings, PrivacyPolicy, ExportBackupModal, RestoreBackupModal
│   ├── support/                   # Feedback, BugReport, Help
│   └── help/                      # FAQ, Troubleshooting
│   # Each screen folder may contain __screenshots__/<variant>.png (git-tracked)
├── components/
│   ├── ui/                        # Button, Card, Input, Select, Toggle, StatusBadge, LoadingState
│   ├── passport/                  # MRZScanner, PassportPreview
│   ├── forms/                     # DynamicForm, FormField, FormSection, AutoFilledBadge
│   ├── trips/                     # TripCard, LegCard, CountryFlag, TravelerSelector
│   ├── wallet/                    # QRCodeCard, QRFullScreen
│   ├── profile/                   # FamilyMemberCard, ProfileSelector
│   └── guide/                     # StepCard, CopyableField, GuideProgress
├── services/
│   ├── storage/                   # keychain.ts, mmkv.ts, database.ts
│   ├── passport/                  # mrzParser.ts, mrzScanner.ts
│   ├── forms/                     # formEngine.ts, fieldMapper.ts, validators.ts
│   └── schemas/                   # schemaLoader.ts, schemaRegistry.ts
├── stores/                        # Zustand: useProfileStore, useTripStore, useFormStore, useAppStore
├── schemas/                       # Bundled JSON: JPN.json, MYS.json, SGP.json
├── types/                         # profile.ts, trip.ts, schema.ts, navigation.ts, family.ts
├── utils/                         # crypto.ts, dateUtils.ts, clipboard.ts, constants.ts, familyValidation.ts
└── assets/                        # icons/, flags/, guide screenshots per country

__tests__/
├── services/                      # mrzParser.test.ts, formEngine.test.ts, familyProfileStorage.test.ts
├── components/                    # DynamicForm.test.tsx, family/
├── e2e/                          # family-workflows.test.ts
└── schemas/                       # JPN.test.ts, MYS.test.ts, SGP.test.ts
```

## Key Domain Concepts

- **MRZ (Machine Readable Zone)**: The 2-line code at the bottom of passport photo pages. TD3 format, 44 chars per line. Contains name, passport number, nationality, DOB, gender, expiry.
- **Country Form Schema**: JSON definition of what fields each country requires. Maps universal profile fields to country-specific ones via `autoFillSource` dot-notation paths.
- **Form Engine**: The core algorithm — takes profile + trip leg + country schema, produces a filled/partial form. The engine resolves auto-fill sources, identifies remaining fields, and tracks fill stats.
- **Smart Delta**: Only show the user fields that are country-specific or can't be auto-filled. Most travelers answer 3-5 questions per country instead of 30+.
- **Submission Guide**: Step-by-step walkthrough of each government portal with pre-filled values ready to copy/paste.
- **QR Wallet**: Offline storage for QR codes received after form submission (Visit Japan Web gives QR codes for e-Gate entry).
- **Family Profiles**: Multi-user support allowing up to 8 family members per device. Each family member has their own secure profile stored in separate OS Keychain entries. Supports relationships (self, spouse, child, parent, sibling, other) with data isolation and access control.

## Security Rules

- Passport data NEVER leaves OS Keychain except into memory for form generation
- WatermelonDB encryption key stored in OS Keychain
- iCloud/Google backup EXCLUDED for Keychain items (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`)
- No analytics/crash reporting captures PII
- All government portal communication is direct device-to-government
- Clear copied passport data from clipboard after 60 seconds
- App lock after 5 minutes of inactivity
- **Family Profile Security**: Each family member has isolated storage with unique Keychain entries and encryption keys. Primary profile holder has access control over family member data. Family member deletion securely removes all associated data from device.

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

### ✅ Sprint 4: Testing & Documentation (Complete)
- [x] Comprehensive E2E test suite for user workflows
- [x] Performance tests for form generation and camera operations
- [x] Unit tests for all core services and components
- [x] User guide documentation
- [x] Implementation status documentation
- [x] Final polish and error handling improvements

### ✅ Sprint 5: Pre-Trip Deadline Reminders (Complete)
Part of Epic #529 — Pre-Trip Deadline Reminders and Submission Readiness

- [x] **DeadlineService** (`src/services/deadline/deadlineService.ts`) — Computes per-leg deadline status (5 states: not-started, in-progress, ready, overdue, no-deadline) and urgency level (normal, warning, critical, overdue) from departure date and country schema hours
- [x] **NotificationScheduler** (`src/services/deadline/notificationScheduler.ts`) — Pluggable notification provider interface; schedules 3 triggers per leg (7-day, 48-h, 24-h before submission deadline); persists notification IDs in MMKV for cancellation across app restarts; integrates with TripStore CRUD lifecycle
- [x] **DeadlineBadge component** (`src/components/trips/DeadlineBadge.tsx`) — Pill badge with 6 display states and countdown label; returns null only for no-deadline + normal urgency legs; full accessibility labels
- [x] **LegCard integration** — DeadlineBadge rendered alongside form StatusBadge when deadline data is available
- [x] **TripDetailScreen integration** — Asynchronously computes deadlines for all legs via `computeTripDeadlines`; passes deadline to each LegCard; displays "Trip Readiness: X of N legs ready" summary
- [x] **Unit tests** — `__tests__/services/deadlineService.test.ts` (all 5 statuses, boundary values, overdue path with negative hoursRemaining); `__tests__/services/notificationScheduler.test.ts` (3-trigger scheduling, past-trigger skipping, all-past-triggers path, cancellation, idempotency)
- [x] **E2E smoke tests** — `e2e/tests/deadline-reminders.spec.ts` verifies DeadlineBadge visibility and trip readiness summary. `e2e/tests/trip-detail.spec.ts` also covers readiness summary and leg card rendering

### ✅ Sprint 6: Encrypted Backup & Restore (Complete)
Part of Epic #566 — Backup/Restore Data Flow

- [x] **BackupService** (`src/services/backup/backupService.ts`) — Collects all user data from three storage tiers (OS Keychain, WatermelonDB, MMKV), serialises to a versioned `BackupEnvelope`, encrypts with AES-256-GCM (PBKDF2 key derivation, 100 000 iterations, random salt/IV per export), and packs into a `.borderly` file format
- [x] **BackupTypes** (`src/services/backup/backupTypes.ts`) — `BackupEnvelope`, `BackupPayload`, `ProfileBackupEntry`, `TripBackupData`, `TripLegBackupData`, `QRCodeBackupData` interfaces plus file format constants
- [x] **useBackupExport hook** (`src/hooks/useBackupExport.ts`) — Passphrase + confirm-passphrase state, strength calculation, validation, `handleExport()` calling `backupService.export()` and OS share sheet
- [x] **useBackupRestore hook** (`src/hooks/useBackupRestore.ts`) — File content + passphrase state, validation, `handleRestore()` calling `backupService.import()`, success/error state
- [x] **ExportBackupModal** (`src/screens/settings/ExportBackupModal.tsx`) — Full-screen modal with passphrase inputs, strength indicator, error live region, export button, loading state; fully accessible
- [x] **RestoreBackupModal** (`src/screens/settings/RestoreBackupModal.tsx`) — Full-screen modal with file content textarea, passphrase input, error live region, restore button, success state; fully accessible
- [x] **Unit tests** — `__tests__/services/backupService.test.ts` (round-trip, wrong passphrase, corrupted data, version mismatch, empty profiles, family members, optional fields); `__tests__/hooks/useBackupExport.test.ts`
- [x] **Accessibility tests** — `__tests__/components/settings/ExportBackupModal.a11y.test.tsx` (15 tests); `__tests__/components/settings/RestoreBackupModal.a11y.test.tsx` (18 tests)
- [x] **E2E smoke tests** — `e2e/tests/backup-restore.spec.ts` verifies export modal opens/closes and restore modal renders without crashing
- [x] **Architecture documentation** — `docs/mvp-proposal.md` updated with Backup & Restore section describing data flow, key files, security properties, and test coverage

### ✅ Sprint 7: Push Notifications & Deadline Reminders Coverage (Complete)
Part of Epic #589 — Pre-Trip Deadline Reminders and Submission Readiness

- [x] **PushNotificationProvider** (`src/services/deadline/pushNotificationProvider.ts`) — Production `NotificationProvider` backed by `@notifee/react-native`; creates Android channel on first call; requests OS permission before scheduling; cancels by ID; graceful degradation when permission denied
- [x] **NotificationPermissionScreen** (`src/screens/onboarding/NotificationPermissionScreen.tsx`) — Onboarding screen requesting push notification permission; auto-skips when already granted; "Allow Notifications" and "Skip for Now" CTAs; accessible with proper roles and labels
- [x] **Unit tests** — `__tests__/services/pushNotificationProvider.test.ts` (16 tests covering schedule, cancel, past triggers, permission denied, channel creation, PROVISIONAL status, error resilience); `__tests__/services/notificationScheduler.test.ts` updated with 7 additional integration tests using real `PushNotificationProvider` (backed by mocked notifee)
- [x] **E2E smoke tests** — `e2e/tests/deadline-reminders.spec.ts` updated with 2 new tests verifying notification permission screen is reachable from the onboarding flow and the Allow Notifications button is present and enabled

### ✅ Sprint 8: Passport & Document Validity (Complete)
Part of Epic #608 — Passport & Document Validity

- [x] **DocumentValidityCard** (`src/components/profile/DocumentValidityCard.tsx`) — Card shown on ProfileScreen displaying passport expiry with colour-coded status pill and an 8-country validity grid; returns null when no passport expiry is set
- [x] **PassportExpiryBadge** (`src/components/profile/PassportExpiryBadge.tsx`) — Compact status pill (Valid / Expiring Soon / Expired) with accessible label and days-remaining count
- [x] **PassportValidityWarning** (`src/components/trips/PassportValidityWarning.tsx`) — Inline amber banner shown in LegFormScreen when the active profile's passport does not meet the destination country's minimum validity requirement; `accessibilityRole="alert"` and `accessibilityLiveRegion="polite"` for screen-reader announcement
- [x] **usePassportValidity hook** (`src/hooks/usePassportValidity.ts`) — Reads the active profile from Zustand, resolves the country schema's `passportValidityMonths`, and returns `PassportValidityWarningData | null`; integrated into LegFormScreen
- [x] **checkPassportValidity service** (`src/services/passport/passportValidity.ts`) — Pure function computing `PassportValidityStatus` (isValid, daysUntilExpiry, requiredValidityDays, shortfallDays)
- [x] **ProfileScreen integration** — `DocumentValidityCard` rendered after the profile completeness section using `profile.passportExpiry`
- [x] **LegFormScreen integration** — `PassportValidityWarning` rendered conditionally when `usePassportValidity` returns warning data; uses stable testID `"leg-form-passport-validity-warning"` for E2E testing
- [x] **Unit tests** — `__tests__/components/profile/DocumentValidityCard.test.tsx`; `__tests__/components/trips/PassportValidityWarning.test.tsx`; `__tests__/services/passportValidity.test.ts`; `__tests__/hooks/usePassportValidity.test.ts`
- [x] **Accessibility tests** — `__tests__/components/profile/DocumentValidityCard.a11y.test.tsx` (PassportExpiryBadge + DocumentValidityCard: roles, labels, decorative icon hiding, country grid labels, all statuses); `__tests__/components/trips/PassportValidityWarning.a11y.test.tsx` (alert role, live region, label content, singular/plural, hidden text nodes)
- [x] **E2E smoke tests** — `e2e/tests/document-validity.spec.ts` verifies DocumentValidityCard renders in ProfileScreen and PassportValidityWarning renders in LegFormScreen when expiry is near; `e2e/tests/profile.spec.ts` also covers the Document Validity section

## Accessibility Standards

Borderly follows React Native accessibility (a11y) standards to ensure the app is usable with screen readers (VoiceOver on iOS, TalkBack on Android).

### Core Principles

- **Every interactive element must be accessible**: Buttons, inputs, toggles, and links must have `accessible={true}` and an `accessibilityRole`.
- **Labels describe intent, not appearance**: Use `accessibilityLabel` to describe what a control does, not what it looks like (e.g., "Submit customs declaration form" not "Blue button").
- **Errors are announced via live regions**: Error messages must use `accessibilityLiveRegion="polite"` so screen readers announce them automatically.
- **Decorative elements are hidden**: Visual-only elements (flag icons, dividers, illustrations) must use `accessibilityElementsHidden={true}` or `importantForAccessibility="no-hide-descendants"`.
- **State is communicated**: Disabled, loading (busy), and selected states must be reflected in `accessibilityState`.

### Required Props by Component Type

| Component type | Required a11y props |
|----------------|---------------------|
| Pressable / TouchableOpacity | `accessible={true}`, `accessibilityRole`, `accessibilityLabel` |
| TextInput | `accessibilityLabel` (includes field name + "required" if required) |
| Toggle / Switch | `accessibilityRole="switch"`, `accessibilityLabel`, `accessibilityState.checked` |
| Error text | `accessibilityLiveRegion="polite"`, `accessibilityRole="text"` |
| Progress bar | `accessibilityRole="progressbar"`, `accessibilityValue` |
| Collapsible section header | `accessibilityRole="button"`, `accessibilityState.expanded` |

### Utility Helpers (`src/utils/accessibility.ts`)

- `ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET` — minimum 44×44pt touch target size
- `TouchTargetUtils.getHitSlop()` — expands touch area without changing visual layout
- `AccessibilityStateHelpers.createButtonState(disabled, loading, selected)` — creates correct `accessibilityState` object
- `SemanticUtils.generateFieldLabel(label, required, hasError, errorMsg)` — generates screen-reader-friendly input labels

### Testing Accessibility

All UI components must have corresponding a11y tests in `__tests__/components/<domain>/<Component>.a11y.test.tsx`.

Use RNTL queries in this order of preference:
1. `getByRole` — when RNTL recognizes the host component (Pressable with `accessibilityRole`)
2. `getByLabelText` — for any element with `accessibilityLabel`
3. `getByTestId` + `.props.accessibilityRole` — when host component is mocked (e.g., TouchableOpacity)

**Do not use** `getByRole` on mocked native components (TouchableOpacity, etc.) — use `getByTestId` and check `.props.accessibilityRole` directly instead.

Existing a11y test files:
- `__tests__/components/ui/Button.a11y.test.tsx` — role, label, disabled/busy state, hint
- `__tests__/components/forms/DynamicForm.a11y.test.tsx` — field labels, required, live regions
- `__tests__/components/forms/accessibility.test.tsx` — FormField, FormSection, AutoFilledBadge
- `__tests__/components/trips/TripCard.a11y.test.tsx` — label, role, decorative elements
- `__tests__/components/settings/ExportBackupModal.a11y.test.tsx` — modal props, heading role, close/cancel labels, passphrase input labels, export button label/hint, strength indicator, error live region, loading state
- `__tests__/components/settings/RestoreBackupModal.a11y.test.tsx` — modal props, heading role, close/cancel labels, file input label, passphrase label, restore button label/hint, error live region, success state, loading state
- `__tests__/components/profile/DocumentValidityCard.a11y.test.tsx` — PassportExpiryBadge (role, label, all statuses); DocumentValidityCard (null render, header role, expiry row combined label, country grid roles and labels, decorative icons hidden, accessible=false on text nodes)
- `__tests__/components/trips/PassportValidityWarning.a11y.test.tsx` — null when valid, alert role, polite live region, accessible=true, label content (country, required months, shortfall days, expiry date, guidance), singular/plural month and day, custom testID, decorative elements hidden

## Skills Reference

Available skills (invoke with `/<skill-name>`):
- `/review-pr` — Perform a comprehensive code review of a PR
- `/capture-screens` — Capture screenshots of every screen + generate manifest
- `/visual-audit` — Audit UI/UX using screenshots (read-only analysis)
- `/visual-implement` — Apply UI fixes from an audit, then re-capture to verify
- `/ux-review` — Evaluate user journeys, flow efficiency, and information architecture
- `/ux-implement` — Implement flow-level UX changes (new screens, navigation restructuring)
- `/epic-planner` — Break a goal into Epic + Story GitHub Issues
- `/plan-feature` — Plan and implement a new feature
- `/test-suite` — Find and fix test coverage gaps
- `/organize` — Reorganize file structure
- `/cleanup` — Remove unused files
- `/update-architecture` — Update architecture diagrams
- `/form-optimize` — Audit form inputs for platform autofill hints, keyboard types, and autocomplete
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
10. If you modified `.github/workflows/`, update `docs/pipeline-architecture.md` to match

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
- **After adding a new dependency**, run `pnpm install` and verify the webpack build: `npx webpack --config webpack.config.js`. TypeScript won't catch missing `node_modules` — only webpack/Metro will.

### Git Commit Rules

- **Never use `git add -A` or `git add .`** — always add specific files
- **Check `git status` before committing** to verify only intended files are staged
- **Never commit generated files** (`node_modules/`, `ios/Pods/`, `android/build/`, etc.)
- **Run `pnpm typecheck` before every commit.** If it fails, fix the errors first.
- **Before the final push**, run `pnpm e2e` to verify the webpack build + E2E tests pass. This catches missing modules that `tsc` misses.

### Push Early, Push Often

Commit and push after every 2-3 file changes. Do not wait until the end of a session. While pushing often is encouraged, it's critical that every commit passes `pnpm typecheck` first.
