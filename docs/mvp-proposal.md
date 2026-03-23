# OnePass — Universal Travel Declaration App

## MVP Technical Proposal

**Version:** 0.1.0-MVP  
**Status:** ✅ Implementation Complete (95%)
**Target:** Feed to Claude Code for implementation
**Author:** Johnny + Claude

---

## 1. Product Overview

### Problem

Every country has its own customs/immigration declaration system with its own app or web portal. Travelers hitting multiple countries (e.g., Japan → Malaysia → Singapore) must navigate 3+ completely different UIs, re-entering the same passport and personal information each time. The UX is universally terrible.

### Solution

A local-first mobile app that stores your travel profile on-device, then auto-generates and helps submit the correct customs/immigration forms for each destination country. Fill out your info once, travel everywhere.

### MVP Scope — Phase 1

Support **11 countries** across major travel corridors:

1. **Japan** — Visit Japan Web (immigration + customs declaration → QR code)
2. **Malaysia** — Malaysia Digital Arrival Card (MDAC)
3. **Singapore** — SG Arrival Card (via ICA)
4. **Thailand** — Thailand Digital Arrival Card (TDAC)
5. **Vietnam** — E-declaration via Vietnam Customs
6. **United Kingdom** — UK Electronic Travel Authorisation (ETA)
7. **United States** — ESTA / CBP One
8. **Canada** — Canada eTA
9. **Australia** — ABF Digital Incoming Passenger Card (DIPC)
10. **New Zealand** — New Zealand Traveller Declaration (NZTD)
11. **South Korea** — Korea K-ETA

Phase 1 launched with Japan, Malaysia, and Singapore (common Asia travel corridor). The platform has since expanded to cover major English-speaking destinations and the full Asia-Pacific corridor.

### MVP Scope — What's NOT included in Phase 1

- Direct API integration with government systems (Tier 1)
- Automated browser submission (Tier 2)
- NFC passport scanning (deferred to Phase 2)
- Family/group management (deferred to Phase 2)
- Trip sync from email/TripIt/Google Flights (deferred to Phase 2)
- Push notification reminders (deferred to Phase 2)
- Backend server (ship with bundled schemas, OTA updates later)

### MVP Deliverable — What Phase 1 IS

- Passport OCR via camera (MRZ reading)
- Encrypted on-device profile storage
- Trip creation with multi-country itinerary
- Per-country form preview showing exactly what fields are needed
- Smart delta — only surface fields unique to each country/trip
- Pre-filled data ready to copy/paste or screenshot into each country's portal
- Offline QR code wallet for storing submitted form QR codes
- Step-by-step guided walkthrough of each country's submission portal

---

## 2. Tech Stack

### Mobile App

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | React Native (bare workflow) | Cross-platform iOS + Android. Bare workflow (not Expo managed) for native module access (camera, keychain, future NFC). Large ecosystem, strong Claude Code support with TypeScript. |
| **Language** | TypeScript (strict mode) | Type safety for sensitive data handling. Better DX with Claude Code. |
| **Navigation** | React Navigation v7 | Industry standard for RN. Stack + bottom tab navigators. |
| **State Management** | Zustand | Lightweight, TypeScript-first, no boilerplate. Perfect for local-first where state = persisted data. |
| **Local Storage (sensitive)** | react-native-keychain | OS keychain/keystore for passport data, encryption keys. Biometric unlock support. |
| **Local Storage (general)** | react-native-mmkv | High-performance key-value store. Encrypted mode available. For app preferences, form schemas, non-PII data. |
| **Local Database** | WatermelonDB | Lazy-loading, observable local database built on SQLite. Good for structured trip/form data. Supports future sync if needed. |
| **Camera/OCR** | react-native-camera + ML Kit (Google) | MRZ (Machine Readable Zone) reading from passport photo page. ML Kit's text recognition is free and on-device. |
| **Styling** | NativeWind (Tailwind for RN) | Familiar utility-first CSS. Fast iteration. Consistent cross-platform. |
| **Forms** | React Hook Form + Zod | Type-safe form validation. Zod schemas double as data validation for country form schemas. |
| **Testing** | Jest + React Native Testing Library | Unit + integration tests. Detox for E2E if needed later. |

### Backend (Minimal — Phase 2)

For MVP, there is **no backend**. Country form schemas ship bundled in the app binary. OTA schema updates can come later via a simple CDN-hosted JSON file the app polls on launch.

When a backend becomes necessary (for OTA schema updates, analytics, feature flags):

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Runtime** | Node.js + TypeScript | Same language as mobile app. Shared Zod schemas. |
| **Framework** | Hono | Lightweight, edge-first. Runs on Cloudflare Workers, Vercel Edge, or standalone Node. |
| **Hosting** | Cloudflare Workers (free tier) | Zero cold starts, global edge deployment, generous free tier. No PII stored here — only serves schema configs. |
| **Schema hosting** | Cloudflare R2 or S3 | Static JSON schema files. Versioned. App fetches latest on launch. |

### Development Tooling

| Tool | Purpose |
|------|---------|
| **Claude Code** | Primary development agent |
| **pnpm** | Package manager (faster, stricter than npm) |
| **ESLint + Prettier** | Code quality + formatting |
| **Husky + lint-staged** | Pre-commit hooks |
| **TypeScript strict mode** | Catch errors at compile time |
| **React Native Debugger** | Dev debugging |

---

## 3. Architecture

### Core Principle: Local-First, Zero-Server PII

```
┌─────────────────────────────────────────────────────┐
│                   User's Device                      │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  OS Keychain  │  │ WatermelonDB │  │   MMKV    │  │
│  │              │  │              │  │           │  │
│  │ - Passport   │  │ - Trips      │  │ - Prefs   │  │
│  │   data       │  │ - Form data  │  │ - Schemas │  │
│  │ - Encryption │  │ - QR codes   │  │ - Cache   │  │
│  │   keys       │  │ - Countries  │  │ - Flags   │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │           Form Generation Engine              │    │
│  │                                               │    │
│  │  Profile + Trip ──→ Country Schema ──→ Form   │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │           Submission Guide / WebView           │    │
│  │                                               │    │
│  │  Step-by-step walkthrough of gov portal       │    │
│  │  with pre-filled data ready to paste          │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
                        │
                        │ (future: OTA schema updates only)
                        ▼
              ┌───────────────────┐
              │  CDN / Edge (no   │
              │  PII, schemas     │
              │  only)            │
              └───────────────────┘
                        │
                        │ (user-initiated, direct from device)
                        ▼
              ┌───────────────────┐
              │  Government       │
              │  Portals          │
              │  (Japan, MY, SG)  │
              └───────────────────┘
```

### Data Flow

1. User scans passport → MRZ data extracted on-device → stored in OS Keychain (encrypted, biometric-locked)
2. User creates trip → trip metadata stored in WatermelonDB
3. User taps "Prepare forms for Japan" → Form Engine reads profile from Keychain + trip from DB → applies Japan schema → generates filled form preview
4. User reviews pre-filled data → app shows step-by-step guide for Visit Japan Web with data ready to copy
5. After submission to government portal → user screenshots/saves QR code → stored locally in app's QR wallet

### OTA Schema Update System

Country form schemas ship bundled in the app binary (inside `src/schemas/`), but can be silently updated over-the-air via a CDN-hosted manifest. This means bug-fixes to government portal field mappings reach users without an App Store release.

#### Architecture

```
App Launch (cold start)
       │
       ▼
SchemaUpdateService.checkForUpdates()
       │
       ├─── 1. Fetch manifest.json from CDN
       │          https://schemas.borderly.app/v1/manifest.json
       │          {
       │            "version": "1.0.0",
       │            "schemas": {
       │              "JPN": { "version": "2.0.0", "checksum": "sha256:...", "url": "..." }
       │            }
       │          }
       │
       ├─── 2. Compare cached version vs manifest version (per country)
       │          ┌─ versions match ──► skip (no download)
       │          └─ versions differ ─► fetch schema from manifest URL
       │
       ├─── 3. Validate SHA-256 checksum of downloaded schema
       │          ┌─ checksum OK  ──► store in MMKV under "schema:<code>"
       │          └─ checksum BAD ──► discard, keep existing cached/bundled schema
       │
       └─── 4. Return { updated: string[], failed: string[] }

Read path (form generation):
  SchemaUpdateService.getSchema(countryCode)
       ├─ MMKV has "schema:<code>" ──► return parsed OTA schema (preferred)
       └─ MMKV empty / corrupted  ──► return bundled schema (fallback)
```

#### Key Files

| File | Purpose |
|------|---------|
| `src/schemas/manifest.json` | Bundled manifest; also served from CDN at `SCHEMA_MANIFEST_URL` |
| `src/schemas/<ISO>.json` | Bundled schema files (fallback when OTA cache is empty) |
| `src/services/schemas/schemaUpdateService.ts` | OTA download, checksum validation, MMKV persistence |
| `src/services/schemas/schemaLoader.ts` | MMKV-first schema loading with bundled fallback |
| `src/services/schemas/schemaRegistry.ts` | In-memory registry; hot-swaps newer MMKV schemas |
| `src/utils/constants.ts` | `SCHEMA_CDN_BASE_URL`, `SCHEMA_MANIFEST_URL`, `SCHEMA_MMKV_KEY_PREFIX` |

#### Storage Keys (MMKV)

| Key | Value |
|-----|-------|
| `schema:<COUNTRY_CODE>` | JSON string of the OTA-fetched schema (e.g. `schema:JPN`) |
| `schema_manifest_cache` | JSON string of the last fetched manifest |
| `app_theme` | User's colour-scheme preference: `"system"` \| `"light"` \| `"dark"` (default: `"system"`). Absent key means system default. Written by `useAppStore.setTheme()`, read at startup by `loadPersistedAppState()`. |

#### Security Properties

- **Checksum enforcement**: SHA-256 is computed on the downloaded payload and compared to the manifest entry. A mismatch causes the schema to be silently discarded — the existing cached or bundled schema remains in use.
- **No PII in transit**: Schemas contain no user data. CDN communication is schema-config-only.
- **Offline resilience**: `checkForUpdates()` never throws. Network errors return `{ updated: [], failed: [] }` so the app continues with cached/bundled schemas.
- **Manifest caching**: The last successfully fetched manifest is stored in MMKV. Subsequent `fetchSchema()` calls use it to avoid a redundant manifest request.

#### Version Comparison Logic

The service compares `schemaVersion` (from the MMKV-cached schema) against the `version` field in the manifest entry using strict string equality — not semantic versioning. If the cached version string equals the manifest version string exactly, the download is skipped. Any mismatch (including a fresh install with no cache) triggers a download. The term "download-if-outdated" in the UI refers to this check: any version that does not exactly match the latest manifest is considered outdated.

### Security Architecture

```
┌─ Sensitive Data (OS Keychain, biometric-locked) ──────────┐
│  passport_number, full_name, date_of_birth, nationality,   │
│  passport_expiry, gender, photo_page_image                  │
└─────────────────────────────────────────────────────────────┘

┌─ Structured Data (WatermelonDB, encrypted at rest) ────────┐
│  trips, form_submissions, qr_codes, declaration_answers,    │
│  accommodation_addresses, flight_details                     │
└─────────────────────────────────────────────────────────────┘

┌─ App Config (MMKV, not sensitive) ─────────────────────────┐
│  country_schemas, app_preferences, feature_flags,           │
│  onboarding_state, theme, last_schema_check_timestamp       │
└─────────────────────────────────────────────────────────────┘
```

**Critical security rules:**
- Passport data NEVER leaves OS Keychain except into memory for form generation
- WatermelonDB encryption key stored in OS Keychain
- iCloud/Google backup EXCLUDED for Keychain items (set `accessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY`)
- No analytics/crash reporting SDK captures PII — custom sanitization layer required
- No server-side logging of any user data
- All government portal communication is direct device ↔ government (app is never a proxy)

---

## 4. Data Models

### 4.1 Traveler Profile

Stored in OS Keychain as encrypted JSON.

```typescript
interface TravelerProfile {
  id: string; // UUID
  // From passport MRZ scan
  passportNumber: string;
  surname: string;
  givenNames: string;
  nationality: string; // ISO 3166-1 alpha-3
  dateOfBirth: string; // ISO 8601 date
  gender: 'M' | 'F' | 'X';
  passportExpiry: string; // ISO 8601 date
  issuingCountry: string; // ISO 3166-1 alpha-3

  // User-provided (not on passport)
  email?: string;
  phoneNumber?: string;
  homeAddress?: Address;
  occupation?: string;

  // Common declaration defaults
  defaultDeclarations: DeclarationDefaults;

  createdAt: string; // ISO 8601
  updatedAt: string;
}

interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string; // ISO 3166-1 alpha-3
}

interface DeclarationDefaults {
  hasItemsToDeclar: boolean; // usually false
  carryingCurrency: boolean; // usually false
  carryingProhibitedItems: boolean; // usually false
  visitedFarm: boolean; // usually false
  hasCriminalRecord: boolean; // usually false
  carryingCommercialGoods: boolean; // usually false
}
```

### 4.2 Trip

Stored in WatermelonDB.

```typescript
interface Trip {
  id: string; // UUID
  name: string; // User-defined, e.g., "Asia Summer 2025"
  status: 'upcoming' | 'active' | 'completed';
  legs: TripLeg[];
  createdAt: string;
  updatedAt: string;
}

interface TripLeg {
  id: string;
  tripId: string;
  destinationCountry: string; // ISO 3166-1 alpha-3
  arrivalDate: string; // ISO 8601
  departureDate?: string;
  flightNumber?: string;
  airlineCode?: string; // IATA 2-letter code
  arrivalAirport?: string; // IATA 3-letter code
  accommodation: Accommodation;
  formStatus: 'not_started' | 'in_progress' | 'ready' | 'submitted';
  formData?: Record<string, unknown>; // Country-specific form answers
  qrCodes?: SavedQRCode[];
  order: number; // Leg ordering within trip
}

interface Accommodation {
  name: string;
  address: Address;
  phone?: string;
  bookingReference?: string;
}

interface SavedQRCode {
  id: string;
  legId: string;
  type: 'immigration' | 'customs' | 'health' | 'combined';
  imageBase64: string; // Stored locally
  savedAt: string;
  label: string; // e.g., "Visit Japan Web - Customs QR"
}
```

### 4.3 Country Form Schema

Bundled in app as static JSON. This is the core abstraction — it defines what each country needs and how it maps from the universal profile.

```typescript
interface CountryFormSchema {
  countryCode: string; // ISO 3166-1 alpha-3
  countryName: string;
  schemaVersion: string; // Semver
  lastUpdated: string; // ISO 8601
  portalUrl: string; // Government portal URL
  portalName: string; // e.g., "Visit Japan Web"

  // Timing requirements
  submission: {
    earliestBeforeArrival: string; // e.g., "14d" (14 days)
    latestBeforeArrival: string; // e.g., "0h" (can do on arrival)
    recommended: string; // e.g., "72h"
  };

  // Form sections
  sections: FormSection[];

  // Step-by-step submission guide
  submissionGuide: SubmissionStep[];
}

interface FormSection {
  id: string;
  title: string; // e.g., "Personal Information"
  fields: FormField[];
}

interface FormField {
  id: string;
  label: string; // Display label
  type: 'text' | 'date' | 'select' | 'boolean' | 'number' | 'textarea';
  required: boolean;

  // Mapping from universal profile
  autoFillSource?: string; // Dot-notation path, e.g., "profile.passportNumber", "trip.accommodation.address.line1"

  // If autoFillSource is null, this is a country-specific field the user must fill
  countrySpecific: boolean;

  // For select fields
  options?: { value: string; label: string }[];

  // Validation
  validation?: {
    pattern?: string; // Regex
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };

  // Help text explaining what this field means
  helpText?: string;

  // What to show in the government portal walkthrough
  portalFieldName?: string; // The label used in the actual government form
  portalScreenshot?: string; // Asset reference for walkthrough
}

interface SubmissionStep {
  order: number;
  title: string;
  description: string;
  screenshotAsset?: string;
  fieldsOnThisScreen: string[]; // Field IDs visible on this portal screen
  tips?: string[];
}
```

---

## 5. Example Country Schema — Japan

```json
{
  "countryCode": "JPN",
  "countryName": "Japan",
  "schemaVersion": "1.0.0",
  "lastUpdated": "2025-06-01T00:00:00Z",
  "portalUrl": "https://vjw-lp.digital.go.jp/en/",
  "portalName": "Visit Japan Web",
  "submission": {
    "earliestBeforeArrival": "14d",
    "latestBeforeArrival": "0h",
    "recommended": "72h"
  },
  "sections": [
    {
      "id": "personal",
      "title": "Personal Information",
      "fields": [
        {
          "id": "surname",
          "label": "Surname (as on passport)",
          "type": "text",
          "required": true,
          "autoFillSource": "profile.surname",
          "countrySpecific": false,
          "portalFieldName": "Last Name"
        },
        {
          "id": "givenNames",
          "label": "Given Names (as on passport)",
          "type": "text",
          "required": true,
          "autoFillSource": "profile.givenNames",
          "countrySpecific": false,
          "portalFieldName": "First Name / Middle Name"
        },
        {
          "id": "dateOfBirth",
          "label": "Date of Birth",
          "type": "date",
          "required": true,
          "autoFillSource": "profile.dateOfBirth",
          "countrySpecific": false
        },
        {
          "id": "nationality",
          "label": "Nationality",
          "type": "text",
          "required": true,
          "autoFillSource": "profile.nationality",
          "countrySpecific": false
        },
        {
          "id": "passportNumber",
          "label": "Passport Number",
          "type": "text",
          "required": true,
          "autoFillSource": "profile.passportNumber",
          "countrySpecific": false
        },
        {
          "id": "gender",
          "label": "Gender",
          "type": "select",
          "required": true,
          "autoFillSource": "profile.gender",
          "countrySpecific": false,
          "options": [
            { "value": "M", "label": "Male" },
            { "value": "F", "label": "Female" }
          ]
        }
      ]
    },
    {
      "id": "travel",
      "title": "Travel Information",
      "fields": [
        {
          "id": "arrivalDate",
          "label": "Planned Arrival Date",
          "type": "date",
          "required": true,
          "autoFillSource": "leg.arrivalDate",
          "countrySpecific": false
        },
        {
          "id": "flightNumber",
          "label": "Flight Number",
          "type": "text",
          "required": true,
          "autoFillSource": "leg.flightNumber",
          "countrySpecific": false,
          "helpText": "Enter only the numeric part, e.g., for NH0123 enter 0123"
        },
        {
          "id": "airlineCode",
          "label": "Airline Company",
          "type": "text",
          "required": true,
          "autoFillSource": "leg.airlineCode",
          "countrySpecific": false
        },
        {
          "id": "departureCity",
          "label": "City of Departure",
          "type": "text",
          "required": true,
          "countrySpecific": false,
          "helpText": "The city where your first flight departs (even if connecting)"
        },
        {
          "id": "purposeOfVisit",
          "label": "Purpose of Visit",
          "type": "select",
          "required": true,
          "countrySpecific": true,
          "options": [
            { "value": "tourism", "label": "Tourism" },
            { "value": "business", "label": "Business" },
            { "value": "visiting_relatives", "label": "Visiting Relatives" },
            { "value": "transit", "label": "Transit" },
            { "value": "other", "label": "Other" }
          ]
        },
        {
          "id": "durationOfStay",
          "label": "Duration of Stay (days)",
          "type": "number",
          "required": true,
          "countrySpecific": false,
          "helpText": "Auto-calculated from arrival/departure dates",
          "autoFillSource": "leg._calculatedDuration"
        }
      ]
    },
    {
      "id": "accommodation",
      "title": "Accommodation in Japan",
      "fields": [
        {
          "id": "hotelName",
          "label": "Hotel / Accommodation Name",
          "type": "text",
          "required": true,
          "autoFillSource": "leg.accommodation.name",
          "countrySpecific": false
        },
        {
          "id": "hotelAddress",
          "label": "Address of Accommodation",
          "type": "text",
          "required": true,
          "autoFillSource": "leg.accommodation.address._formatted",
          "countrySpecific": false
        },
        {
          "id": "hotelPhone",
          "label": "Phone Number of Accommodation",
          "type": "text",
          "required": false,
          "autoFillSource": "leg.accommodation.phone",
          "countrySpecific": false
        }
      ]
    },
    {
      "id": "customs_declarations",
      "title": "Customs Declarations",
      "fields": [
        {
          "id": "carryingProhibitedItems",
          "label": "Are you carrying any prohibited items? (drugs, firearms, etc.)",
          "type": "boolean",
          "required": true,
          "autoFillSource": "profile.defaultDeclarations.carryingProhibitedItems",
          "countrySpecific": false
        },
        {
          "id": "currencyOver1M",
          "label": "Are you carrying cash/securities exceeding ¥1,000,000?",
          "type": "boolean",
          "required": true,
          "countrySpecific": true,
          "helpText": "Japan-specific threshold. Equivalent to roughly $7,000 USD."
        },
        {
          "id": "commercialGoods",
          "label": "Are you carrying commercial goods or samples?",
          "type": "boolean",
          "required": true,
          "autoFillSource": "profile.defaultDeclarations.carryingCommercialGoods",
          "countrySpecific": false
        },
        {
          "id": "meatProducts",
          "label": "Are you carrying any meat products?",
          "type": "boolean",
          "required": true,
          "countrySpecific": true,
          "helpText": "Japan strictly prohibits all meat products including sausage, ham, bacon, jerky."
        },
        {
          "id": "plantProducts",
          "label": "Are you carrying any plants, fruits, or vegetables?",
          "type": "boolean",
          "required": true,
          "countrySpecific": true,
          "helpText": "Fresh fruits, vegetables, and plants are restricted."
        },
        {
          "id": "itemsToDeclareDuty",
          "label": "Are you carrying items exceeding duty-free allowances?",
          "type": "boolean",
          "required": true,
          "autoFillSource": "profile.defaultDeclarations.hasItemsToDeclar",
          "countrySpecific": false,
          "helpText": "Duty-free: 3 bottles of alcohol (760ml each), 400 cigarettes, ¥200,000 worth of goods."
        }
      ]
    }
  ],
  "submissionGuide": [
    {
      "order": 1,
      "title": "Create Account on Visit Japan Web",
      "description": "Go to the Visit Japan Web portal and create an account with your email address. You only need to do this once — your account works for all future trips to Japan.",
      "fieldsOnThisScreen": [],
      "tips": [
        "Use a personal email you'll have access to while traveling",
        "The account creation is separate from the form — do this first"
      ]
    },
    {
      "order": 2,
      "title": "Register Your Details",
      "description": "Enter your passport information. The portal will ask you to scan your passport or enter details manually.",
      "fieldsOnThisScreen": ["surname", "givenNames", "dateOfBirth", "nationality", "passportNumber", "gender"],
      "tips": [
        "Use EXACTLY the name shown on your passport",
        "You only need to enter this once per passport"
      ]
    },
    {
      "order": 3,
      "title": "Register Your Trip",
      "description": "Click 'Register new planned entry/return' and enter your travel details.",
      "fieldsOnThisScreen": ["arrivalDate", "flightNumber", "airlineCode", "departureCity", "purposeOfVisit", "durationOfStay"],
      "tips": [
        "If connecting, enter the flight number of the plane landing in Japan",
        "Departure city is where your FIRST flight departs"
      ]
    },
    {
      "order": 4,
      "title": "Enter Accommodation",
      "description": "Provide your hotel or accommodation details in Japan.",
      "fieldsOnThisScreen": ["hotelName", "hotelAddress", "hotelPhone"],
      "tips": [
        "If staying at multiple places, enter the first one",
        "Hotel phone number is optional but helpful"
      ]
    },
    {
      "order": 5,
      "title": "Complete Immigration & Customs Declaration",
      "description": "Answer the customs declaration questions. For most tourists, the answer to all questions is 'No'.",
      "fieldsOnThisScreen": ["carryingProhibitedItems", "currencyOver1M", "commercialGoods", "meatProducts", "plantProducts", "itemsToDeclareDuty"],
      "tips": [
        "Answer truthfully — false declarations can result in penalties",
        "All meat products are banned — including beef jerky, salami, etc.",
        "Prescription medications containing codeine or pseudoephedrine are prohibited"
      ]
    },
    {
      "order": 6,
      "title": "Get Your QR Code",
      "description": "After completing all sections, your QR code will be generated. Save it to this app's QR wallet or take a screenshot.",
      "fieldsOnThisScreen": [],
      "tips": [
        "Screenshot the QR code so you can access it offline",
        "You'll show this QR code at the e-Gate terminals after landing",
        "The QR code is valid for the trip dates you specified"
      ]
    }
  ]
}
```

---

## 6. Screen Map & Navigation

### Navigation Structure

```
App
├── Onboarding (first launch only)
│   ├── Welcome
│   ├── Scan Passport (camera MRZ)
│   ├── Confirm Profile Data
│   └── Set Up Biometric Lock
│
├── Main (Bottom Tab Navigator)
│   ├── Tab: Trips
│   │   ├── Trip List
│   │   ├── Create Trip
│   │   │   ├── Add Trip Name + Dates
│   │   │   └── Add Legs (country + flight + hotel per leg)
│   │   └── Trip Detail
│   │       ├── Leg Cards (Japan ✓, Malaysia ◯, Singapore ◯)
│   │       └── Per-Leg Form Screen
│   │           ├── Auto-filled form preview
│   │           ├── Country-specific fields to fill
│   │           ├── "Ready to Submit" review
│   │           └── Submission Guide (step-by-step walkthrough)
│   │
│   ├── Tab: QR Wallet
│   │   ├── Active QR Codes (upcoming trips)
│   │   ├── QR Detail (full-screen display, offline)
│   │   └── Add QR (camera capture or screenshot import)
│   │
│   ├── Tab: Profile
│   │   ├── Passport Data (biometric-locked view)
│   │   ├── Default Declarations
│   │   ├── Home Address
│   │   └── Re-scan Passport
│   │
│   └── Tab: Settings
│       ├── Biometric Lock toggle
│       ├── Data Management (export/delete all data)
│       ├── Supported Countries
│       └── About / Privacy Policy
```

### Key Screens (MVP)

#### 1. Onboarding — Passport Scan

```
┌──────────────────────────────────────┐
│                                      │
│     Point your camera at the         │
│     bottom of your passport's        │
│     photo page                       │
│                                      │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  │     [ Camera Viewfinder ]      │  │
│  │                                │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │ P<USAJOHNSON<<JOHNNY<<<< │  │  │
│  │  │ L898902C36UTO7408122M120 │  │  │
│  │  └──────────────────────────┘  │  │
│  │     ↑ MRZ Detection Zone       │  │
│  └────────────────────────────────┘  │
│                                      │
│  Detected:                           │
│  Name: JOHNNY JOHNSON               │
│  Passport: L898902C3                 │
│  Nationality: USA                    │
│                                      │
│         [ Confirm & Save ]           │
│                                      │
└──────────────────────────────────────┘
```

#### 2. Trip Detail

```
┌──────────────────────────────────────┐
│  ← Back          Asia Trip 2025      │
│──────────────────────────────────────│
│                                      │
│  Jun 10 - Jun 22, 2025              │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 🇯🇵  Japan          Jun 10-15  │  │
│  │ Visit Japan Web                │  │
│  │ Status: ● Ready to submit      │  │
│  │ [Review Form]  [Start Guide]   │  │
│  └────────────────────────────────┘  │
│           ↓                          │
│  ┌────────────────────────────────┐  │
│  │ 🇲🇾  Malaysia       Jun 15-18  │  │
│  │ MDAC                           │  │
│  │ Status: ○ 2 fields remaining   │  │
│  │ [Continue Form]                │  │
│  └────────────────────────────────┘  │
│           ↓                          │
│  ┌────────────────────────────────┐  │
│  │ 🇸🇬  Singapore      Jun 18-22  │  │
│  │ SG Arrival Card                │  │
│  │ Status: ○ Not started          │  │
│  │ [Start Form]                   │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

#### 3. Form Screen (Per Country)

```
┌──────────────────────────────────────┐
│  ← Back     Japan - Customs Form     │
│──────────────────────────────────────│
│                                      │
│  ✅ Auto-filled from your profile    │
│  ┌────────────────────────────────┐  │
│  │ Surname        JOHNSON         │  │
│  │ Given Names    JOHNNY          │  │
│  │ Passport       L898902C3       │  │
│  │ Nationality    USA             │  │
│  │ DOB            1990-04-08      │  │
│  │ Flight         NH 0107         │  │
│  │ Hotel          Park Hyatt Tok. │  │
│  └────────────────────────────────┘  │
│                                      │
│  ⚠️  Needs your input (Japan-specific)│
│  ┌────────────────────────────────┐  │
│  │ Purpose of Visit               │  │
│  │ [ Tourism              ▼]     │  │
│  │                                │  │
│  │ Carrying >¥1M cash?            │  │
│  │ ( ) Yes  (●) No                │  │
│  │                                │  │
│  │ Carrying meat products?        │  │
│  │ ( ) Yes  (●) No                │  │
│  │ ℹ️ All meat banned incl. jerky  │  │
│  └────────────────────────────────┘  │
│                                      │
│  [ Mark as Ready ]                   │
│  [ Open Submission Guide → ]         │
│                                      │
└──────────────────────────────────────┘
```

---

## 7. Project Structure

```
onepass/
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── index.js
│
├── src/
│   ├── app/
│   │   ├── App.tsx                    # Root component
│   │   └── navigation/
│   │       ├── RootNavigator.tsx       # Auth/Onboarding/Main routing
│   │       ├── MainTabNavigator.tsx    # Bottom tabs
│   │       └── types.ts               # Navigation type definitions
│   │
│   ├── screens/
│   │   ├── onboarding/
│   │   │   ├── WelcomeScreen.tsx
│   │   │   ├── PassportScanScreen.tsx
│   │   │   ├── ConfirmProfileScreen.tsx
│   │   │   └── BiometricSetupScreen.tsx
│   │   ├── trips/
│   │   │   ├── TripListScreen.tsx
│   │   │   ├── CreateTripScreen.tsx
│   │   │   ├── TripDetailScreen.tsx
│   │   │   ├── LegFormScreen.tsx
│   │   │   └── SubmissionGuideScreen.tsx
│   │   ├── wallet/
│   │   │   ├── QRWalletScreen.tsx
│   │   │   ├── QRDetailScreen.tsx
│   │   │   └── AddQRScreen.tsx
│   │   ├── profile/
│   │   │   ├── ProfileScreen.tsx
│   │   │   └── EditProfileScreen.tsx
│   │   └── settings/
│   │       └── SettingsScreen.tsx
│   │
│   ├── components/
│   │   ├── ui/                        # Generic reusable components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Toggle.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── passport/
│   │   │   ├── MRZScanner.tsx          # Camera + MRZ detection
│   │   │   └── PassportPreview.tsx
│   │   ├── forms/
│   │   │   ├── DynamicForm.tsx         # Renders form from country schema
│   │   │   ├── FormField.tsx           # Individual field renderer
│   │   │   ├── FormSection.tsx
│   │   │   └── AutoFilledBadge.tsx     # Visual indicator for auto-filled fields
│   │   ├── trips/
│   │   │   ├── TripCard.tsx
│   │   │   ├── LegCard.tsx
│   │   │   └── CountryFlag.tsx
│   │   ├── wallet/
│   │   │   ├── QRCodeCard.tsx
│   │   │   └── QRFullScreen.tsx
│   │   └── guide/
│   │       ├── StepCard.tsx
│   │       ├── CopyableField.tsx       # Tap to copy pre-filled value
│   │       └── GuideProgress.tsx
│   │
│   ├── services/
│   │   ├── storage/
│   │   │   ├── keychain.ts            # OS Keychain wrapper (passport data)
│   │   │   ├── mmkv.ts               # MMKV instance (app config)
│   │   │   └── database.ts           # WatermelonDB setup + models
│   │   ├── passport/
│   │   │   ├── mrzParser.ts           # Parse MRZ text into structured data
│   │   │   └── mrzScanner.ts          # Camera integration for MRZ detection
│   │   ├── forms/
│   │   │   ├── formEngine.ts          # Core: profile + trip + schema → filled form
│   │   │   ├── fieldMapper.ts         # Resolves autoFillSource paths
│   │   │   └── validators.ts          # Zod schemas for form validation
│   │   └── schemas/
│   │       ├── schemaLoader.ts        # Load bundled schemas, check for updates
│   │       └── schemaRegistry.ts      # Registry of all country schemas
│   │
│   ├── stores/
│   │   ├── useProfileStore.ts         # Zustand store for profile state
│   │   ├── useTripStore.ts            # Zustand store for trips
│   │   ├── useFormStore.ts            # Zustand store for active form editing
│   │   └── useAppStore.ts             # App-level state (onboarding, theme)
│   │
│   ├── schemas/                       # Bundled country form schemas
│   │   ├── JPN.json                   # Japan - Visit Japan Web
│   │   ├── MYS.json                   # Malaysia - MDAC
│   │   ├── SGP.json                   # Singapore - SG Arrival Card
│   │   ├── THA.json                   # Thailand - TDAC
│   │   ├── VNM.json                   # Vietnam - E-declaration
│   │   ├── GBR.json                   # United Kingdom - ETA
│   │   ├── USA.json                   # United States - ESTA
│   │   ├── CAN.json                   # Canada - eTA
│   │   ├── AUS.json                   # Australia - DIPC
│   │   ├── NZL.json                   # New Zealand - NZTD
│   │   ├── KOR.json                   # South Korea - K-ETA
│   │   └── index.ts                   # Schema registry export
│   │
│   ├── types/
│   │   ├── profile.ts                 # TravelerProfile, Address, etc.
│   │   ├── trip.ts                    # Trip, TripLeg, Accommodation, etc.
│   │   ├── schema.ts                  # CountryFormSchema, FormField, etc.
│   │   └── navigation.ts
│   │
│   ├── utils/
│   │   ├── crypto.ts                  # Encryption helpers
│   │   ├── dateUtils.ts               # Date formatting, duration calc
│   │   ├── clipboard.ts              # Copy to clipboard helper
│   │   └── constants.ts              # App-wide constants
│   │
│   └── assets/
│       ├── icons/
│       ├── flags/                     # Country flag images
│       └── guide/                     # Submission guide screenshots (per country)
│           ├── JPN/
│           ├── MYS/
│           └── SGP/
│
├── __tests__/
│   ├── services/
│   │   ├── mrzParser.test.ts
│   │   ├── formEngine.test.ts
│   │   └── fieldMapper.test.ts
│   ├── components/
│   │   └── DynamicForm.test.tsx
│   └── schemas/
│       ├── JPN.test.ts                # Validate Japan schema completeness
│       ├── MYS.test.ts
│       ├── SGP.test.ts
│       ├── THA.test.ts
│       ├── VNM.test.ts
│       ├── GBR.test.ts
│       ├── USA.test.ts
│       ├── CAN.test.ts
│       ├── AUS.test.ts                # Australia DIPC — auto-fill coverage >= 70%
│       ├── NZL.test.ts                # New Zealand NZTD — auto-fill coverage >= 70%
│       └── KOR.test.ts                # South Korea K-ETA — processing time verification
│
├── android/
├── ios/
└── .github/
    └── workflows/
        └── ci.yml
```

---

## 8. Core Engine Implementation Guide

### 8.1 Form Engine (most important piece)

The Form Engine is the heart of the app. It takes a traveler profile, a trip leg, and a country schema, then produces a fully or partially filled form.

```typescript
// src/services/forms/formEngine.ts

import { TravelerProfile } from '@/types/profile';
import { TripLeg } from '@/types/trip';
import { CountryFormSchema, FormField } from '@/types/schema';
import { resolveAutoFillPath } from './fieldMapper';

export interface FilledFormField extends FormField {
  currentValue: unknown;
  source: 'auto' | 'user' | 'default' | 'empty';
  needsUserInput: boolean;
}

export interface FilledForm {
  countryCode: string;
  countryName: string;
  portalName: string;
  portalUrl: string;
  sections: {
    id: string;
    title: string;
    fields: FilledFormField[];
  }[];
  stats: {
    totalFields: number;
    autoFilled: number;
    userFilled: number;
    remaining: number;
  };
}

export function generateFilledForm(
  profile: TravelerProfile,
  leg: TripLeg,
  schema: CountryFormSchema,
  existingFormData?: Record<string, unknown>
): FilledForm {
  const context = { profile, leg };
  let autoFilled = 0;
  let userFilled = 0;
  let remaining = 0;
  let totalFields = 0;

  const sections = schema.sections.map(section => ({
    id: section.id,
    title: section.title,
    fields: section.fields.map(field => {
      totalFields++;

      // Check if user already provided this value
      if (existingFormData?.[field.id] !== undefined) {
        userFilled++;
        return {
          ...field,
          currentValue: existingFormData[field.id],
          source: 'user' as const,
          needsUserInput: false,
        };
      }

      // Try auto-fill from profile/trip
      if (field.autoFillSource) {
        const resolved = resolveAutoFillPath(field.autoFillSource, context);
        if (resolved !== undefined && resolved !== null && resolved !== '') {
          autoFilled++;
          return {
            ...field,
            currentValue: resolved,
            source: 'auto' as const,
            needsUserInput: false,
          };
        }
      }

      // Field needs user input
      remaining++;
      return {
        ...field,
        currentValue: field.type === 'boolean' ? false : '',
        source: 'empty' as const,
        needsUserInput: true,
      };
    }),
  }));

  return {
    countryCode: schema.countryCode,
    countryName: schema.countryName,
    portalName: schema.portalName,
    portalUrl: schema.portalUrl,
    sections,
    stats: { totalFields, autoFilled, userFilled, remaining },
  };
}
```

### 8.2 Field Mapper

```typescript
// src/services/forms/fieldMapper.ts

interface FormContext {
  profile: TravelerProfile;
  leg: TripLeg;
}

export function resolveAutoFillPath(
  path: string,
  context: FormContext
): unknown {
  // Handle computed fields
  if (path === 'leg._calculatedDuration') {
    return calculateDuration(context.leg.arrivalDate, context.leg.departureDate);
  }
  if (path === 'leg.accommodation.address._formatted') {
    return formatAddress(context.leg.accommodation.address);
  }

  // Handle dot-notation paths
  const parts = path.split('.');
  let current: unknown = context;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function calculateDuration(arrival: string, departure?: string): number | undefined {
  if (!departure) return undefined;
  const a = new Date(arrival);
  const d = new Date(departure);
  return Math.ceil((d.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatAddress(address?: Address): string | undefined {
  if (!address) return undefined;
  return [address.line1, address.line2, address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(', ');
}
```

### 8.3 MRZ Parser

```typescript
// src/services/passport/mrzParser.ts

export interface MRZResult {
  surname: string;
  givenNames: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: string; // ISO 8601
  gender: 'M' | 'F' | 'X';
  passportExpiry: string; // ISO 8601
  issuingCountry: string;
}

/**
 * Parse a 2-line MRZ (TD3 format) from a passport.
 *
 * Line 1: P<ISSSUERNAME<<GIVENNAMES<<<<<<<<<<<<<<<<<<<<<
 * Line 2: PASSPORTN#CNATIONALITYYYMMDDSYYMMDDECHECKSUMCHECK
 */
export function parseMRZ(line1: string, line2: string): MRZResult | null {
  // Clean input
  line1 = line1.replace(/\s/g, '').toUpperCase();
  line2 = line2.replace(/\s/g, '').toUpperCase();

  if (line1.length < 44 || line2.length < 44) return null;
  if (line1[0] !== 'P') return null;

  // Line 1: Names
  const issuingCountry = line1.substring(2, 5).replace(/</g, '');
  const namePart = line1.substring(5);
  const nameParts = namePart.split('<<');
  const surname = (nameParts[0] || '').replace(/</g, ' ').trim();
  const givenNames = (nameParts[1] || '').replace(/</g, ' ').trim();

  // Line 2: Document info
  const passportNumber = line2.substring(0, 9).replace(/</g, '');
  const nationality = line2.substring(10, 13).replace(/</g, '');
  const dobRaw = line2.substring(13, 19); // YYMMDD
  const gender = line2[20] as 'M' | 'F' | 'X';
  const expiryRaw = line2.substring(21, 27); // YYMMDD

  return {
    surname,
    givenNames,
    passportNumber,
    nationality,
    dateOfBirth: parseMRZDate(dobRaw, true),
    gender: gender === '<' ? 'X' : gender,
    passportExpiry: parseMRZDate(expiryRaw, false),
    issuingCountry,
  };
}

function parseMRZDate(raw: string, isBirthDate: boolean): string {
  const yy = parseInt(raw.substring(0, 2));
  const mm = raw.substring(2, 4);
  const dd = raw.substring(4, 6);

  // Birth dates: 00-99 → 1900-1999 or 2000-2099
  // Expiry dates: always future, so 00-99 → 2000-2099
  let year: number;
  if (isBirthDate) {
    year = yy > 30 ? 1900 + yy : 2000 + yy;
  } else {
    year = 2000 + yy;
  }

  return `${year}-${mm}-${dd}`;
}
```

---

## 9. Implementation Roadmap (Claude Code)

### Sprint 1: Foundation (Week 1)

**Goal:** Bootable app with navigation, storage layer, and profile creation.

1. Initialize React Native bare workflow project with TypeScript
2. Set up NativeWind (Tailwind CSS)
3. Set up navigation structure (React Navigation)
4. Implement storage layer:
   - react-native-keychain wrapper
   - MMKV instance
   - WatermelonDB models
5. Build onboarding flow:
   - Welcome screen
   - Manual passport data entry (camera MRZ comes in Sprint 2)
   - Profile confirmation screen
   - Biometric setup
6. Build Profile tab (view/edit stored passport data)
7. Build Settings tab (skeleton)

**Tests:** Storage encryption, profile CRUD, navigation flow.

### Sprint 2: Core Form Engine (Week 2)

**Goal:** Trip creation and dynamic form generation from country schemas.

1. Create all 3 country schemas (JPN, MYS, SGP) as JSON files
2. Implement schema loader and registry
3. Build Form Engine (generateFilledForm)
4. Build Field Mapper (resolveAutoFillPath)
5. Build DynamicForm component (renders any schema into a form UI)
6. Build trip creation flow:
   - Trip name + dates
   - Add legs with country selection
   - Per-leg: flight + accommodation entry
7. Build Trip List and Trip Detail screens
8. Build Leg Form Screen showing auto-filled + remaining fields

**Tests:** Form Engine unit tests with all 3 schemas, field mapping edge cases.

### Sprint 3: Submission Guide & QR Wallet (Week 3)

**Goal:** End-to-end flow from profile → form → guided submission → QR storage.

1. Build Submission Guide screen (step-by-step walkthrough)
2. Build CopyableField component (tap to copy any pre-filled value)
3. Add "Open Portal" deep link/button per country
4. Build QR Wallet:
   - Camera capture for QR codes
   - Screenshot/image import
   - Full-screen QR display (max brightness, offline)
   - Active vs. archived QR codes
5. Add passport MRZ scanning via camera (ML Kit integration)
6. Polish UI, animations, status indicators
7. Add form status tracking per leg (not started → in progress → ready → submitted)

**Tests:** QR storage/retrieval, MRZ parsing, E2E flow tests.

### Sprint 4: Polish & Ship (Week 4)

**Goal:** App Store / TestFlight ready.

1. Error handling and edge cases
2. Empty states, loading states
3. Data export/delete functionality
4. Privacy policy screen
5. App icon, splash screen, app store assets
6. Performance optimization (lazy loading, list virtualization)
7. Accessibility pass (screen reader labels, contrast) — **complete** (see below)
8. TestFlight / internal testing build

---

## Accessibility Compliance

Borderly implements React Native accessibility standards to ensure usability with VoiceOver (iOS) and TalkBack (Android).

### What is implemented

| Area | Implementation |
|------|----------------|
| **Touch targets** | All interactive elements enforce a minimum 44×44pt touch target via `ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET` and `TouchTargetUtils.getHitSlop()` in `src/utils/accessibility.ts` |
| **Roles** | All `Pressable` / `TouchableOpacity` elements have `accessibilityRole` (button, link, tab, switch, progressbar) |
| **Labels** | Every input has `accessibilityLabel` generated by `SemanticUtils.generateFieldLabel()`, including "required" suffix for required fields |
| **State** | `AccessibilityStateHelpers.createButtonState()` produces correct `disabled`, `busy`, and `selected` states; toggles expose `checked` state |
| **Live regions** | Error messages use `accessibilityLiveRegion="polite"` so screen readers announce validation errors automatically |
| **Decorative hiding** | Visual-only elements (flag icons, decorative dividers) use `accessibilityElementsHidden={true}` or `importantForAccessibility="no-hide-descendants"` |
| **High contrast** | `Button` and form components support a `highContrastMode` prop that switches to a WCAG-AA-compliant black/white color scheme |

### A11y test coverage

Dedicated accessibility test suites verify screen-reader props for all key UI components:

- `__tests__/components/ui/Button.a11y.test.tsx` — 15 tests covering role, label, disabled state, busy (loading) state, accessible prop, hint
- `__tests__/components/forms/DynamicForm.a11y.test.tsx` — 10 tests covering country heading, field labels, required indicators, validation live regions, auto-fill badge labels
- `__tests__/components/forms/accessibility.test.tsx` — 11 tests covering FormField, FormSection (collapsible a11y), AutoFilledBadge
- `__tests__/components/trips/TripCard.a11y.test.tsx` — 12 tests covering label, interactive role, decorative flag hiding, multi-status variants
- `__tests__/components/settings/ExportBackupModal.a11y.test.tsx` — 15 tests covering modal a11y props, heading role, close/cancel labels, passphrase input labels, export button label and hint, strength indicator, error live region, loading state
- `__tests__/components/settings/RestoreBackupModal.a11y.test.tsx` — 18 tests covering modal a11y props, heading role, close/cancel labels, file content input label, passphrase input label, restore button label and hint, error live region, success state, loading state

All tests use `@testing-library/react-native` a11y queries (`getByRole`, `getByLabelText`, `getByTestId`) and run as part of `pnpm test`.

---

## Backup & Restore

Borderly includes an encrypted backup system that lets users export all their data to a `.borderly` file and restore it on the same or a different device. The backup/restore feature follows the same local-first, zero-server privacy model as the rest of the app.

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   Export (backup creation)                       │
│                                                                  │
│  1. Collect data from all three storage tiers:                   │
│     - OS Keychain  → traveler profiles (passport data)          │
│     - WatermelonDB → trips, legs, QR codes                      │
│     - MMKV         → app preferences (excl. ephemeral state)    │
│                                                                  │
│  2. Serialise to a versioned BackupEnvelope (JSON):             │
│     { version, createdAt, payload: { profiles, trips, ... } }   │
│                                                                  │
│  3. Encrypt with AES-256-GCM:                                   │
│     - PBKDF2 key derivation (100 000 iterations, SHA-256)       │
│     - Random 32-byte salt + 12-byte IV per export               │
│     - Pack: [salt][IV][ciphertext] → Base64                     │
│                                                                  │
│  4. File format:                                                 │
│     BORDERLY_BACKUP_V1\n<Base64-encoded binary>                 │
│                                                                  │
│  5. Share via OS share sheet (iOS Share / Android Share)        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Import (backup restore)                        │
│                                                                  │
│  1. User pastes .borderly file content + enters passphrase      │
│  2. Validate header (BORDERLY_BACKUP_V1)                        │
│  3. Base64-decode → unpack salt + IV + ciphertext               │
│  4. Derive key from passphrase via PBKDF2                       │
│  5. Decrypt with AES-256-GCM (wrong passphrase → throws)        │
│  6. JSON-parse → validate version field                         │
│  7. Return BackupEnvelope to caller for data restoration        │
└─────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/services/backup/backupService.ts` | `BackupServiceImpl` with `export()` and `import()` methods |
| `src/services/backup/backupTypes.ts` | `BackupEnvelope`, `BackupPayload`, `ProfileBackupEntry`, `TripBackupData`, `QRCodeBackupData` type definitions |
| `src/services/backup/index.ts` | Barrel export (`backupService` singleton) |
| `src/hooks/useBackupExport.ts` | React hook for export workflow: passphrase state, strength calculation, `handleExport()` |
| `src/hooks/useBackupRestore.ts` | React hook for restore workflow: file content + passphrase state, `handleRestore()` |
| `src/screens/settings/ExportBackupModal.tsx` | Full-screen modal for creating an encrypted backup |
| `src/screens/settings/RestoreBackupModal.tsx` | Full-screen modal for restoring from an encrypted backup |

### Security Properties

- **Encryption:** AES-256-GCM with a PBKDF2-derived key (100 000 iterations, SHA-256 HMAC)
- **Key material:** Cleared from memory after each export/import via `finally` block
- **Unique ciphertext:** Fresh random salt + IV generated for every export, so the same data encrypted twice produces different output
- **Wrong passphrase:** Causes AES-GCM authentication tag verification to fail → descriptive `Error` thrown, no data leaked
- **Version safety:** `import()` validates the `version` field and rejects unsupported versions
- **No server involvement:** The entire encrypt/decrypt cycle runs on-device using the Web Crypto API

### Test Coverage

- `__tests__/services/backupService.test.ts` — unit tests: round-trip, wrong passphrase, corrupted data, version mismatch, empty profiles, family members, optional leg fields
- `__tests__/hooks/useBackupExport.test.ts` — hook unit tests: passphrase strength, validation, success/dismiss/error paths
- `__tests__/components/settings/ExportBackupModal.a11y.test.tsx` — accessibility props for the export modal
- `__tests__/components/settings/RestoreBackupModal.a11y.test.tsx` — accessibility props for the restore modal
- `e2e/tests/backup-restore.spec.ts` — E2E smoke tests: export modal opens/closes, restore modal renders without crash

---

## Passport & Document Validity

Borderly surfaces passport validity information proactively so travelers discover expiry problems before they affect their trip — not at the immigration desk.

### Feature Overview

Two complementary UI surfaces work together:

1. **DocumentValidityCard** (ProfileScreen) — A persistent card showing the passport expiry date, a colour-coded status pill, and an 11-country validity grid that answers "Can I depart today and still be admitted?" for every supported destination.

2. **PassportValidityWarning** (LegFormScreen) — An inline amber banner that appears only when the active traveler's passport does not meet the specific destination country's minimum validity requirement for the chosen departure date. Non-blocking — travelers can still proceed but are clearly warned of the potential entry risk.

### Data Flow

```
OS Keychain (passport expiry)
    │
    ▼
usePassportValidity hook
    │  reads active profile from ProfileStore
    │  reads country schema via schemaRegistry
    │
    ▼
checkPassportValidity() ── pure function
    │  computes isValid, daysUntilExpiry, shortfallDays
    │
    ├──► PassportValidityWarningData | null
    │         │
    │         ▼
    │   PassportValidityWarning (LegFormScreen)
    │   renders only when passport does NOT meet requirement
    │
    └──► (expiry used directly)
              │
              ▼
        DocumentValidityCard (ProfileScreen)
        renders always when passportExpiry is set
```

### Country Validity Rules

All 11 currently supported countries require passport validity beyond the intended departure date:

| Country | Code | Required validity |
|---------|------|-------------------|
| Japan   | JPN  | 6 months          |
| Malaysia| MYS  | 6 months          |
| Singapore| SGP | 6 months          |
| Thailand| THA  | 6 months          |
| Vietnam | VNM  | 6 months          |
| United Kingdom| GBR | 6 months    |
| United States | USA | 6 months    |
| Canada  | CAN  | 6 months          |
| Australia | AUS | 6 months         |
| New Zealand | NZL | 3 months       |
| South Korea | KOR | 6 months       |

The `passportValidityMonths` field in each country's JSON schema (`src/schemas/<ISO>.json`) drives the validation.

### Status Thresholds

`PassportExpiryBadge` uses `computeExpiryStatus()` to colour-code the expiry pill:

| Days remaining | Status        | Colour |
|----------------|---------------|--------|
| ≥ 180          | Valid         | Green  |
| 30–179         | Expiring Soon | Amber  |
| < 30           | Expired       | Red    |

### Accessibility

Both components follow the project's accessibility standards:

- **DocumentValidityCard**: Section title has `accessibilityRole="header"`. Expiry row has a combined `accessibilityLabel` (date + days remaining). Each country row has `accessibilityRole="text"` with label `"<Country>: Valid"` or `"<Country>: Invalid"`. Decorative icons are hidden with `accessibilityElementsHidden`.
- **PassportValidityWarning**: Container uses `accessibilityRole="alert"` and `accessibilityLiveRegion="polite"` so screen readers announce the warning when it appears. All child text nodes use `accessibilityElementsHidden` to prevent double-reading.

### Key Files

| File | Purpose |
|------|---------|
| `src/components/profile/DocumentValidityCard.tsx` | Card component shown on ProfileScreen |
| `src/components/profile/PassportExpiryBadge.tsx` | Colour-coded status pill |
| `src/components/trips/PassportValidityWarning.tsx` | Inline warning banner in LegFormScreen |
| `src/hooks/usePassportValidity.ts` | React hook — resolves active profile + country schema → warning data |
| `src/services/passport/passportValidity.ts` | Pure `checkPassportValidity()` function |
| `src/types/document.ts` | `PassportValidityStatus` interface |
| `src/constants/countries.ts` | `SUPPORTED_COUNTRIES` array driving the validity grid |

### Test Coverage

- `__tests__/components/profile/DocumentValidityCard.test.tsx` — unit tests (null render, expiry status thresholds, country grid, 11 countries)
- `__tests__/components/trips/PassportValidityWarning.test.tsx` — unit tests (null when valid, a11y props, singular/plural labels, different countries)
- `__tests__/components/profile/DocumentValidityCard.a11y.test.tsx` — accessibility tests for DocumentValidityCard and PassportExpiryBadge
- `__tests__/components/trips/PassportValidityWarning.a11y.test.tsx` — accessibility tests for PassportValidityWarning
- `e2e/tests/document-validity.spec.ts` — E2E smoke tests: DocumentValidityCard in ProfileScreen; PassportValidityWarning in LegFormScreen when passport expires near departure

---

## Australia, New Zealand & South Korea (AUS/NZL/KOR) Schema Coverage

These three schemas complete the Asia-Pacific corridor expansion, bringing the app to **11 supported countries**.

### Australia — ABF Digital Incoming Passenger Card (DIPC)

- **Portal:** `https://online.abf.gov.au/incoming-passenger-card/`
- **Submission window:** Up to 72 hours before arrival; no strict deadline (submit any time)
- **Passport validity required:** 6 months
- **Key sections:** Personal (passport fields), Travel (DIPC-specific flight + seat class), Address (Australian accommodation), Health & Biosecurity (food/plant/animal/soil declarations), Customs (goods/currency declarations)
- **Unique fields:** Biosecurity risk declarations (hasFoodItems, hasPlantItems, hasAnimalItems, hasBiosecurityRiskItems, hasSoilOrWater) and 8 Australian state/territory options for the address state field
- **No account required** — each passenger submits independently; no registration needed
- **Auto-fill coverage:** 100% of non-country-specific fields are auto-filled from profile/leg data (passport fields, flight number, arrival date, accommodation address)

### New Zealand — New Zealand Traveller Declaration (NZTD)

- **Portal:** `https://www.nztravellerdeclaration.govt.nz`
- **Submission window:** Must be submitted **at least 24 hours before arrival**; recommended 48–72 hours
- **Passport validity required:** 3 months (lower than most other countries)
- **Key sections:** Personal (passport + email), Travel (NZTD-specific flight + purpose + departure country), Address (NZ accommodation), Biosecurity (food/plant/animal/soil declarations), Goods (currency/controlled items)
- **Email field** is required and auto-fills from `profile.email` — NZL is one of the few schemas that captures the traveler's contact email
- **No account required** — per-trip declarative submission; email used for confirmation only
- **Auto-fill coverage:** 100% of non-country-specific fields have autoFillSource mappings

### South Korea — Korea K-ETA (Electronic Travel Authorisation)

- **Portal:** `https://www.k-eta.go.kr/portal/apply/index.do`
- **Submission window:** Must be submitted **at least 72 hours before departure** — this is both the submission deadline AND the processing time
- **Passport validity required:** 6 months
- **Key sections:** Passport (full passport data), Personal Info (email, phone, occupation, home country), Travel (purpose, arrival date, duration, flight, airport), Accommodation (hotel name + address), Health Declaration (symptoms, infectious disease, outbreak area), Customs Declaration (prohibited items, duty-free, currency, commercial goods)
- **Account required** — each traveler must register on the K-ETA portal with their own email address; `portalFlow.requiresAccount = true`
- **Processing time:** Up to 72 hours — travelers must apply at least 1 week in advance (`recommendedLeadTimeHours: 168`). This is verified by the `submissionWindowNote` field which states "processing takes up to 72 hours"
- **Auto-fill coverage:** 78.1% of all fields and 95.7% of non-country-specific fields have autoFillSource mappings — the highest coverage of all three new schemas
- **Occupation field** is country-specific and required — the K-ETA portal requires travelers to select their occupation from a predefined list

### Schema Tests

| File | Tests | Key verifications |
|------|-------|-------------------|
| `__tests__/schemas/AUS.test.ts` | ~42 tests | Metadata, biosecurity section, 8 AU states, submission timing, auto-fill coverage |
| `__tests__/schemas/NZL.test.ts` | ~40 tests | Metadata, biosecurity section, email field, 24h deadline, auto-fill coverage |
| `__tests__/schemas/KOR.test.ts` | ~44 tests | Metadata, K-ETA account requirement, occupation field, 72h processing time, auto-fill coverage |

### E2E Smoke Tests

`e2e/tests/aus-nzl-kor-leg.spec.ts` — verifies that:
1. Each country's leg card appears in the Trip Detail screen
2. The Leg Form screen renders with `DynamicForm` for each country code

---

## App Lock

Borderly protects stored passport and travel data with an inactivity-based app lock. Once enabled, the app locks automatically when it moves to the background or after a configurable inactivity timeout in the foreground. Unlocking requires biometric authentication (Face ID, Touch ID, or Fingerprint) via the OS Keychain. This ensures that anyone who picks up an unattended device cannot access the app's sensitive data.

### Security Flow

```
┌────────────────────────────────────────────────────────────────┐
│                  App Lock State Machine                         │
│                                                                 │
│  App starts (onboarding complete)                              │
│       │                                                         │
│       ▼                                                         │
│  isAppLocked = false  ◄─────────────────────────────────┐      │
│       │                                                  │      │
│       ├─ App goes to background/inactive                 │      │
│       │    → lock() immediately                          │      │
│       │                                                  │      │
│       ├─ Inactivity timer fires (default: 5 minutes)     │      │
│       │    → lock() on timeout                           │      │
│       │                                                  │      │
│       ▼                                                  │      │
│  isAppLocked = true                                      │      │
│       │                                                  │      │
│       │  LockScreen rendered as full-screen overlay      │      │
│       │                                                  │      │
│       ├─ User presses "Unlock with Face ID / Touch ID"   │      │
│       │    → Keychain.getGenericPassword() (biometric)   │      │
│       │    → On success: unlock() ───────────────────────┘      │
│       │    → On failure: show error, allow retry                │
│       │                                                          │
│       └─ User presses "Use PIN Instead"                         │
│            → Alert: PIN unlock coming in a future version       │
│              (Phase 2 placeholder — not yet implemented)        │
└────────────────────────────────────────────────────────────────┘
```

### Key Behaviours

- **Immediate background lock:** When `AppState` transitions to `'background'` or `'inactive'`, the app locks at once — no grace period.
- **Foreground inactivity timer:** If the user leaves the app open and idle, it locks after the configured timeout (1, 5, 15, or 30 minutes, default 5).
- **Onboarding gate:** `showLockScreen = isOnboardingComplete && isAppLocked` — the lock screen is never shown during onboarding, so fresh installs are never blocked.
- **NavigationContainer never unmounts:** The lock overlay is rendered on top of the normal navigator, preserving deep-link state and navigation stack while locked.
- **biometric auth required to disable:** In Settings, disabling the lock requires a successful biometric prompt — the user must prove identity before weakening security. Enabling the lock does **not** require biometric authentication.
- **Lock configuration persisted:** `isLockEnabled` and `lockTimeoutMinutes` are written to MMKV so they survive app restarts.

### Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useAppLock.ts` | Core hook — monitors `AppState`, manages inactivity timer, exports `unlockWithBiometrics()` |
| `src/stores/useAppStore.ts` | `isAppLocked`, `lock()`, `unlock()`, `isLockEnabled`, `lockTimeoutMinutes` state |
| `src/screens/lock/LockScreen/LockScreen.tsx` | Full-screen overlay shown when `isAppLocked = true` |
| `src/app/navigation/RootNavigator.tsx` | Renders `LockScreen` as an `absoluteFillObject` overlay when locked |
| `src/screens/settings/SettingsScreen/SettingsScreen.tsx` | App Lock settings card (enable/disable toggle + timeout select) |

### Accessibility

- **LockScreen title** uses `accessibilityRole="header"`.
- **Unlock button** uses `accessibilityRole="button"` with a label that includes the detected biometric type (`"Unlock with Face ID"`, `"Unlock with Touch ID"`, etc.) and an `accessibilityHint` describing the action.
- **PIN fallback button** uses `accessibilityRole="button"` with `accessibilityLabel="Use PIN to unlock"` and a hint.
- **Error message** uses `accessibilityRole="alert"` and `accessibilityLiveRegion="polite"` so screen readers announce it automatically when it appears.
- **App logo** is hidden from screen readers with `accessibilityElementsHidden={true}` and `importantForAccessibility="no-hide-descendants"`.

### Test Coverage

- `__tests__/components/lock/LockScreen.test.tsx` — unit tests: rendering, biometry label detection, successful/cancelled/failed unlock, PIN fallback, accessibility props
- `__tests__/components/lock/LockScreen.a11y.test.tsx` — accessibility tests: unlock button role/label, biometric type label variations, error live region (`role="alert"`, `liveRegion="polite"`), PIN retry button role/label, decorative elements hidden, title heading role
- `__tests__/hooks/useAppLock.test.ts` — hook unit tests: constants, AppState transitions, inactivity timer, custom timeout, `resetTimer()`, `unlockWithBiometrics()`, memory-leak prevention
- `__tests__/integration/appLock.test.ts` — integration tests: full lock/unlock lifecycle using real store and hook with mocked AppState; verifies start-unlocked → background-locks → foreground-stays-locked → biometric-unlocks cycle
- `e2e/tests/app-lock.spec.ts` — E2E smoke tests: LockScreen renders when locked, not shown during onboarding, navigation reappears after unlock

---

## Submission Status Tracking

Borderly allows travelers to track whether they have actually submitted each leg's government portal declaration. This is separate from form completion (`formStatus`): a form can be filled out (ready) but not yet submitted to the government portal. Submission tracking gives users a clear per-leg and per-trip view of what has been submitted.

### Status State Machine

```
┌─────────────────────────────────────────────────────────────┐
│              Leg Submission Status State Machine              │
│                                                               │
│  not_started ──► in_progress ──► submitted                    │
│       │                               ▲                       │
│       └───────────────────────────────┘                       │
│                 (direct transition allowed)                    │
│                                                               │
│  not_started  → grey pill   ("Not Started")                   │
│  in_progress  → amber pill  ("In Progress")                   │
│  submitted    → green pill  ("Submitted")                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. Each `TripLeg` has a `submissionStatus: LegSubmissionStatus` field (`'not_started' | 'in_progress' | 'submitted'`), separate from `formStatus` which tracks form completion.
2. `useTripStore.updateLegSubmissionStatus(legId, status)` persists the new status to WatermelonDB and updates in-memory state atomically.
3. `TripDetailScreen` derives a reactive `submissionProgress` via `useMemo` — counting legs where `submissionStatus === 'submitted'`.
4. The "Mark as Submitted" button on each `LegCard` calls `handleMarkAsSubmitted(legId)` in `TripDetailScreen`, which calls `updateLegSubmissionStatus(legId, 'submitted')`.
5. The button is hidden once `leg.submissionStatus === 'submitted'`.

### Key Files

| File | Purpose |
|------|---------|
| `src/types/trip.ts` | `LegSubmissionStatus` type and `TripLeg.submissionStatus` field |
| `src/stores/useTripStore.ts` | `updateLegSubmissionStatus()` and `markLegAsSubmitted()` store actions |
| `src/components/trips/SubmissionStatusBadge.tsx` | Colour-coded pill badge (grey / amber / green) for each `LegSubmissionStatus` |
| `src/components/trips/LegCard.tsx` | Renders `SubmissionStatusBadge` and the "Mark as Submitted" button per leg |
| `src/screens/trips/TripDetailScreen/TripDetailScreen.tsx` | `submissionProgress` summary, `handleMarkAsSubmitted` callback, passes `onMarkAsSubmitted` to each `LegCard` |

### Accessibility

- **SubmissionStatusBadge** uses `accessibilityRole="text"` and an `accessibilityLabel` describing the status (`"Submission not started"`, `"Submission in progress"`, `"Submission complete"`). The visible text node is hidden from screen readers to prevent double-announcement.
- **"Mark as Submitted" button** uses `accessibilityRole="button"` with a label that names the destination (`"Mark Japan leg as submitted"`) and an `accessibilityHint` describing the effect.
- **Submission progress summary** uses `accessibilityRole="text"` with a combined label (`"X of N legs submitted"`); the decorative `X/N` text node is hidden from screen readers.

### Test Coverage

- `__tests__/components/trips/SubmissionStatusBadge.a11y.test.tsx` — accessibility tests: all three states, roles, labels, hidden text nodes
- `__tests__/components/trips/TripCard.test.tsx` — unit tests: zero / partial / full submission count display
- `__tests__/integration/submissionTracking.test.ts` — integration tests: full mark-as-submitted lifecycle using real `useTripStore`; covers `not_started → submitted`, intermediate `in_progress` state, multi-leg isolation, database error handling, sequential submissions, and `markLegAsSubmitted` delegation
- `e2e/tests/trip-detail.spec.ts` — E2E smoke tests (Story #691): `SubmissionStatusBadge` renders, "Mark as Submitted" button renders, submission progress summary displays correct fractions
- `e2e/tests/submission-tracking.spec.ts` — E2E smoke tests (Story #694): dedicated submission-tracking suite covering not-started / submitted / multi-leg scenarios, badge visibility, button presence/absence, progress fractions

---

## Trip Duplication & Templates

Borderly lets travelers reuse their best itineraries. Two complementary features cover this:

1. **Trip Duplication** (`DuplicateTripModal`) — Copy an existing trip with a new departure date. Useful when a traveler makes the same journey (e.g., quarterly business trip) and wants to start from their last filled-in form.
2. **Trip Templates** (`TemplatesScreen`, `SaveTemplateModal`) — Save the country-routing structure of any trip as a named template. Future trips can be started from a template, pre-populating the leg order, country codes, and typical durations.

### Trip Duplication Data Flow

```
TripDetailScreen
  └── "Duplicate Trip" button ──► DuplicateTripModal
        │  departure date picker
        │  confirm / cancel
        └──► useTripStore.duplicateTrip(tripId, newDepartureDate)
               └──► creates new Trip + cloned legs with shifted dates
                    └──► navigates to TripDetailScreen for the new trip
```

### Trip Templates Data Flow

```
TripDetailScreen
  └── "Save as Template" button ──► SaveTemplateModal
        │  name input (pre-filled with trip name)
        │  save / cancel
        └──► tripTemplateService.saveFromTrip(trip, name)
               └──► serialises TripTemplate to MMKV ("trip_templates" key)

TripListScreen header
  └── "Templates" button ──► TemplatesScreen
        │  FlatList of TripTemplate items (TemplateCard)
        │  empty state when no templates exist
        └── TemplateCard actions:
              ├── Rename ──► rename modal ──► tripTemplateService.rename(id, newName)
              ├── Delete ──► Alert confirm ──► tripTemplateService.delete(id)
              └── Use Template ──► navigate('CreateTrip')
                                   (future: pre-fill legs from template)
```

### Storage

Templates are non-sensitive config data stored in **MMKV** under the key `trip_templates` as a JSON-serialised `TripTemplate[]`. No passport PII is stored in templates — only country codes and typical durations.

```typescript
interface TripTemplate {
  id: string;            // "tpl_<timestamp>_<random>"
  name: string;          // user-visible name
  legs: TripTemplateLeg[];
  createdAt: string;     // ISO 8601
}

interface TripTemplateLeg {
  countryCode: string;   // ISO 3-letter, e.g. "JPN"
  typicalDurationDays: number;
  order: number;
}
```

### Key Files

| File | Purpose |
|------|---------|
| `src/services/trips/tripTemplateService.ts` | CRUD operations for `TripTemplate` objects (MMKV-backed) |
| `src/screens/trips/TemplatesScreen/TemplatesScreen.tsx` | FlatList of templates; exports `TemplateCard` for direct testability |
| `src/components/trips/SaveTemplateModal.tsx` | Modal for naming + saving a trip as a template |
| `src/components/trips/DuplicateTripModal.tsx` | Modal for duplicating a trip with a new departure date |

### Accessibility

- **DuplicateTripModal**: `accessibilityViewIsModal={true}`, title `accessibilityRole="header"`, cancel/confirm `accessibilityRole="button"` with descriptive labels (`"Cancel duplicate trip"` / `"Confirm duplicate trip"`), `accessibilityState.disabled` mirrors the `loading` prop, error live region uses `accessibilityLiveRegion="polite"` + `accessibilityRole="text"`.
- **SaveTemplateModal**: `accessibilityViewIsModal={true}`, title `accessibilityRole="header"`, save button exposes `accessibilityHint` describing the save action, name input has `accessibilityLabel="Template name, required"`, BookmarkPlus icon is hidden from screen readers via `accessibilityElementsHidden={true}`.
- **TemplateCard**: Rename and Delete buttons have `accessibilityLabel` including the template name (e.g., `"Rename template Japan Loop"`). Use Template button has `accessibilityHint="Creates a new trip pre-filled with destinations from this template"`. Decorative flag row and leg count text use `accessibilityElementsHidden={true}` + `importantForAccessibility="no-hide-descendants"`.
- **TemplatesScreen FlatList**: `accessibilityLabel="List of saved trip templates"` for screen-reader list navigation.

### Test Coverage

- `__tests__/components/trips/DuplicateTripModal.a11y.test.tsx` — 23 tests: modal `accessibilityViewIsModal`, title header role, cancel/confirm button roles, labels and disabled state, date picker accessibility, error live region, custom testID
- `__tests__/components/trips/SaveTemplateModal.a11y.test.tsx` — 24 tests: modal props, heading role, cancel/save button labels/hints/states, name input label/hint/pre-fill, error live region absence, decorative icon hidden, custom testID prefix propagation
- `__tests__/screens/trips/TemplatesScreen.a11y.test.tsx` — 23 tests: empty state text, FlatList accessible label, template count header, Rename/Delete/Use Template button roles/labels/hints, decorative elements hidden
- `e2e/tests/trip-templates.spec.ts` — 6 E2E smoke tests: templates nav button visible, empty state, Use Template button visible, Use Template navigates to CreateTrip, Save as Template button visible, SaveTemplateModal opens

---

## 10. Key Libraries & Versions

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-native": "^0.76.0",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "zustand": "^5.0.0",
    "react-native-keychain": "^9.0.0",
    "react-native-mmkv": "^3.1.0",
    "@nozbe/watermelondb": "^0.28.0",
    "nativewind": "^4.1.0",
    "react-hook-form": "^7.54.0",
    "zod": "^3.24.0",
    "@hookform/resolvers": "^3.9.0",
    "react-native-camera": "^4.2.0",
    "@react-native-ml-kit/text-recognition": "^2.0.0",
    "react-native-image-picker": "^7.2.0",
    "react-native-clipboard": "^1.14.0",
    "react-native-screens": "^4.4.0",
    "react-native-safe-area-context": "^5.0.0",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/react": "^18.3.0",
    "jest": "^29.7.0",
    "@testing-library/react-native": "^12.9.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0"
  }
}
```

---

## 11. Privacy & Security Checklist

- [ ] All passport data stored in OS Keychain with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`
- [ ] WatermelonDB encrypted with key from Keychain
- [ ] Biometric authentication required to view/edit passport data
- [ ] iCloud/Google backup EXCLUDED for sensitive data
- [ ] No analytics SDK (or custom analytics that strips all PII)
- [ ] No crash reporting captures PII (sanitize before sending)
- [ ] Privacy policy clearly states: "Your passport data never leaves your device"
- [ ] No network calls except direct to government portals (user-initiated)
- [ ] App lock after 5 minutes of inactivity
- [ ] Secure clipboard: clear copied passport data after 60 seconds
- [ ] No screenshots of passport data screens (FLAG_SECURE on Android, hidden on iOS)

---

## 12. Future Phases (Post-MVP)

### Phase 2: Smart Features
- NFC passport scanning (read chip data)
- Family/group management (up to 10 travelers)
- Trip import from email/TripIt/Google Flights
- Push notification reminders ("Submit your Japan form — you land in 48 hours")
- OTA schema updates via CDN
- In-app WebView with auto-fill for government portals (Tier 2 submission)

### Phase 3: Scale
- 20+ country support (expand to EU, Americas, Oceania)
- Declaration intelligence ("you're carrying a drone — here's what each country requires")
- Currency threshold alerts ("Japan limit is ¥1M, Singapore is SGD $20K")
- Duty-free calculator
- Travel insurance integration
- B2B: Travel agency / corporate travel manager dashboard

### Phase 4: Platform
- Direct API integration with government systems (Tier 1)
- Airline partnerships (pre-fill from booking data)
- IATA One ID alignment
- Trusted traveler program integration (Global Entry, etc.)

---

## 13. Success Metrics (MVP)

| Metric | Target |
|--------|--------|
| Time to complete first country form | < 2 minutes (vs. 10-15 min on gov portal) |
| Fields auto-filled per country | > 70% |
| User completes forms for all trip legs | > 80% of trips |
| QR codes saved to wallet | > 1 per trip |
| App rating (TestFlight feedback) | > 4.0 |
| Passport scan → profile in < 30 seconds | > 90% success rate |

---

## Appendix: Claude Code Instructions

When implementing this project:

1. **Start with Sprint 1** — get the project bootstrapped and navigable first
2. **TypeScript strict mode** — no `any` types, full type safety
3. **Test as you go** — write tests for formEngine and mrzParser before building UI
4. **Schema-driven UI** — the DynamicForm component should be able to render ANY country schema without country-specific code
5. **Security first** — never log passport data, never store it outside Keychain
6. **Small commits** — one feature per commit, clear commit messages
7. **Mobile-first UX** — large tap targets, clear visual hierarchy, offline-capable
