# Belief: Local-first privacy is a product differentiator

## Status
Working assumption

## Statement
Storing all PII on-device (never on a server) is not just a security measure but a competitive advantage. Users will choose Borderly over alternatives specifically because their passport data never leaves their device.

## Evidence
- 1Password's market position built on local-first trust
- Growing privacy awareness among travelers post-GDPR
- No competitor in the travel form space advertises local-only storage
- Eliminates server breach liability entirely

## What would confirm
- User interviews citing privacy as a reason for choosing Borderly
- App store reviews mentioning trust or privacy positively
- Competitors launching server-based alternatives that fail to gain traction

## What would invalidate
- Users requesting cloud sync/backup of passport data
- Users choosing competitors with cloud features despite privacy tradeoff
- Cross-device sync becoming a hard requirement for adoption

## Referenced by
- `.knowledge/policies/architecture/local-first.md` — enforces this as architecture constraint
- `.knowledge/policies/data/pii-boundary.md` — PII storage rules
- `.knowledge/policies/data/storage-tiers.md` — three-tier storage design
- `src/services/storage/keychain/` — Keychain implementation
