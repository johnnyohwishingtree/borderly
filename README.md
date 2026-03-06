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

## Development

```bash
pnpm install
pnpm ios        # Run on iOS
pnpm android    # Run on Android
pnpm test       # Run tests
pnpm lint       # Lint
pnpm typecheck  # Type check
```

## Autonomous Development Pipeline

This repo uses an automated Claude Code pipeline. See `.github/workflows/` for details.

- Comment `@claude` on any issue to trigger implementation
- Tests auto-run on PRs; failures auto-notify Claude for fixing
- Stories auto-advance when PRs merge
- Pipeline health monitored every 20 minutes

## License

MIT
