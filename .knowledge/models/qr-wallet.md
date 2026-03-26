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

## Invariants
- QR data must be valid (parseable as QR content)
- Deleted QR codes are permanently removed (no soft delete)

## Key Files
- `src/screens/wallet/` — QRWallet, AddQR, QRDetail screens
- `src/components/wallet/QRCodeCard.tsx` — display card
- `src/components/wallet/QRFullScreen.tsx` — full-screen for scanning at gates
