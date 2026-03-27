# Model: QR Wallet

## Entities

### QRCode
- Properties: `id`, `data`, `label`, `category`, `createdAt`
- Storage: WatermelonDB
- Captured from: immigration portal responses, camera scan, manual entry

### QRCategory
- Values: immigration, customs, health, boarding, other
- Used for: filtering and organization in wallet view

## Relationships
```
Wallet 1──* QRCode
QRCode *──1 QRCategory
QRCode *──1 Trip (optional association)
```

## Country Requirements
- **QR required** (JPN, PHL, IDN): portal issues a QR code — travelers must present at border control
- **Confirmation code** (SGP, KOR, IND, MYS, NZL, AUS, VNM): portal issues an email confirmation/reference code — travelers should save for reference
- Canonical sets defined in `src/constants/countries.ts` (`QR_REQUIRED_COUNTRY_CODES`, `CONFIRMATION_CODE_COUNTRY_CODES`)
- ReadinessService tracks both as separate categories (`qr`, `confirmation`)

## Invariants
- QR data must be valid (parseable as QR content)
- Deleted QR codes are permanently removed (no soft delete)

## Key Files
- `src/screens/wallet/` — QRWallet, AddQR, QRDetail screens
- `src/components/wallet/QRCodeCard.tsx` — display card
- `src/components/wallet/QRFullScreen.tsx` — full-screen for scanning at gates
