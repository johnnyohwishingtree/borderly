# Security Boundary

Passport and personal data has strict containment rules.

## Storage tiers

| Tier | Technology | Contents | Security |
|------|-----------|----------|----------|
| Sensitive | OS Keychain | Passport data, encryption keys | Biometric-locked, excluded from backups |
| Structured | WatermelonDB | Trips, form data, QR codes | Encrypted at rest (key in Keychain) |
| Config | MMKV | Preferences, schemas, flags | Not sensitive |

## Rules
- Passport data NEVER leaves OS Keychain except into memory for form generation
- iCloud/Google backup EXCLUDED for Keychain items (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`)
- Clear copied passport data from clipboard after 60 seconds
- App lock after 5 minutes of inactivity
- Each family member has isolated storage with unique Keychain entries and encryption keys
- Family member deletion securely removes all associated data

## Anti-patterns
- **Logging passport data** — never `console.log` PII, even in development
- **Storing PII in MMKV** — MMKV is not encrypted and is included in device backups
- **Sharing Keychain entries across family members** — each member gets isolated entries and keys
- **Leaving clipboard data indefinitely** — auto-clear after 60 seconds
- **Sending PII to analytics/crash reporters** — strip before reporting

