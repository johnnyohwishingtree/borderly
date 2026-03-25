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

## Known gaps
