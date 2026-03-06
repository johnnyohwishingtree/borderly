# Borderly

Universal travel declaration app — fill out your info once, travel everywhere.

## The Problem

Every country has its own customs/immigration declaration system. Travelers hitting multiple countries re-enter the same passport and personal information into 3+ different janky government UIs. It's maddening.

## The Solution

A local-first mobile app that stores your travel profile on-device, then auto-generates the correct customs/immigration forms for each destination country. Your passport data never leaves your phone.

## MVP — Phase 1

- Passport OCR via camera (MRZ reading)
- Encrypted on-device profile storage (zero-server PII)
- Trip creation with multi-country itinerary
- Schema-driven form generation (Japan, Malaysia, Singapore)
- Smart delta — only shows fields unique to each country
- Step-by-step guided walkthrough of each government portal
- Offline QR code wallet

## Tech Stack

React Native (bare workflow) | TypeScript | Zustand | WatermelonDB | NativeWind | React Hook Form + Zod

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- React Native CLI
- Xcode (for iOS) or Android Studio (for Android)

### Installation

```bash
# Clone and install dependencies
git clone https://github.com/johnnyohwishingtree/borderly.git
cd borderly
pnpm install

# iOS setup (macOS only)
cd ios && pod install && cd ..

# Start Metro bundler
pnpm start

# Run on device/simulator (in another terminal)
pnpm ios        # iOS
pnpm android    # Android
```

## Development Commands

```bash
# Core development
pnpm start      # Start Metro bundler
pnpm ios        # Run iOS app (requires Xcode)
pnpm android    # Run Android app (requires Android Studio)

# Testing and quality
pnpm test       # Run all tests
pnpm test --coverage    # Run tests with coverage report
pnpm test --watch       # Watch mode for development

# Code quality
pnpm lint       # ESLint
pnpm typecheck  # TypeScript compiler check

# Cleanup
pnpm clean      # Clean build artifacts
```

## Project Structure

```
src/
├── app/                 # Root app and navigation
├── screens/             # Screen components (onboarding, trips, profile, etc.)
├── components/          # Reusable UI components
├── services/            # Storage, passport scanning, forms engine
├── stores/              # Zustand state management
├── types/               # TypeScript type definitions
├── utils/               # Shared utilities
└── assets/              # Images, fonts, icons

__tests__/
├── services/            # Service layer tests
├── components/          # Component tests
├── screens/             # Integration tests
├── navigation/          # Navigation flow tests
└── security/            # Security and encryption tests
```

## Security Architecture

### Three-Tier Storage System

1. **Keychain (Sensitive Data)**
   - Passport information
   - Encryption keys
   - Biometric authentication required
   - Excluded from device backups

2. **WatermelonDB (Structured Data)**
   - Trip information
   - Form submissions
   - QR codes
   - Encrypted with keys from Keychain

3. **MMKV (App Configuration)**
   - User preferences
   - Feature flags
   - Cache data
   - Non-sensitive data only

### Privacy Guarantees

- ✅ Passport data never leaves your device
- ✅ No analytics on personal information
- ✅ Biometric authentication for data access
- ✅ Local-first architecture with offline capability
- ✅ Device-only backup exclusion for sensitive data

## Testing

The project maintains comprehensive test coverage across:

- **Unit Tests**: Services, stores, utilities
- **Component Tests**: UI components with all variants
- **Integration Tests**: Full user flows and navigation
- **Security Tests**: Encryption, authentication, data isolation

```bash
# Run specific test suites
pnpm test services/     # Storage and business logic
pnpm test components/   # UI components
pnpm test security/     # Security and encryption

# Test coverage (target: >80%)
pnpm test --coverage --coverageDirectory=coverage
```

## Architecture Decisions

### Why Local-First?

- **Privacy**: Zero server-side PII storage
- **Reliability**: Works offline, no network dependencies  
- **Speed**: Instant form generation without API calls
- **Security**: Reduced attack surface

### Storage Choices

- **react-native-keychain**: Hardware-backed security for sensitive data
- **WatermelonDB**: Performant SQLite with React Native integration
- **MMKV**: Fast key-value storage for app configuration

### Form Generation

Dynamic forms are generated from country-specific JSON schemas that map universal profile fields to local government requirements.

## Autonomous Development Pipeline

This repo uses an automated Claude Code pipeline. See `.github/workflows/` for details.

- Comment `@claude` on any issue to trigger implementation
- Tests auto-run on PRs; failures auto-notify Claude for fixing
- Stories auto-advance when PRs merge
- Pipeline health monitored every 20 minutes

## License

MIT
