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

Support **3 countries** to prove the concept:

1. **Japan** — Visit Japan Web (immigration + customs declaration → QR code)
2. **Malaysia** — Malaysia Digital Arrival Card (MDAC)
3. **Singapore** — SG Arrival Card (via ICA)

These three form a common Asia travel corridor and all have digital submission systems.

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
│       └── SGP.test.ts
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
7. Accessibility pass (screen reader labels, contrast)
8. TestFlight / internal testing build

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
