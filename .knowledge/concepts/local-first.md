# Local-First, Zero-Server PII

All user data stays on-device. No server stores passport data.

## Architecture

```
┌──────────────────────────────────────────────┐
│                User's Device                  │
│  ┌────────────┐  ┌────────────┐  ┌────────┐  │
│  │ OS Keychain │  │WatermelonDB│  │  MMKV  │  │
│  │ Passport   │  │ Trips      │  │ Prefs  │  │
│  │ Enc keys   │  │ Form data  │  │ Schemas│  │
│  └────────────┘  └────────────┘  └────────┘  │
│                                               │
│  Form Engine: Profile + Trip → Schema → Form  │
│  Submission Guide: Walkthrough of gov portal  │
└───────────────────────┬───────────────────────┘
                        ↓ (user-initiated, direct)
              Government Portals (Japan, MY, SG)
```

## Rules
- Government portal communication is always direct device-to-government
- No analytics or crash reporting captures PII
- No backend server — schemas ship bundled in app
- All data can be exported/restored via encrypted backup (.borderly files)

