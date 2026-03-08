# App Store Assets

This directory contains all assets required for iOS App Store and Google Play Store submissions.

## Directory Structure

```
app-store/
├── ios/
│   ├── icons/
│   │   ├── Icon-20@2x.png           (40x40)
│   │   ├── Icon-20@3x.png           (60x60)
│   │   ├── Icon-29@2x.png           (58x58)
│   │   ├── Icon-29@3x.png           (87x87)
│   │   ├── Icon-40@2x.png           (80x80)
│   │   ├── Icon-40@3x.png           (120x120)
│   │   ├── Icon-60@2x.png           (120x120)
│   │   ├── Icon-60@3x.png           (180x180)
│   │   └── AppStore-1024x1024.png   (1024x1024)
│   ├── screenshots/
│   │   ├── iPhone-6.7/              (Screenshots for iPhone 14 Pro Max)
│   │   ├── iPhone-6.5/              (Screenshots for iPhone 11 Pro Max)
│   │   ├── iPhone-5.5/              (Screenshots for iPhone 8 Plus)
│   │   ├── iPad-12.9/               (Screenshots for iPad Pro 12.9")
│   │   └── iPad-11/                 (Screenshots for iPad Pro 11")
│   └── metadata/
│       ├── description.txt
│       ├── keywords.txt
│       └── release-notes.txt
├── android/
│   ├── icons/
│   │   ├── playstore-icon-512.png   (512x512)
│   │   └── feature-graphic.png      (1024x500)
│   ├── screenshots/
│   │   ├── phone/                   (1080x1920 or higher)
│   │   └── tablet/                  (1200x1920 or higher)
│   └── metadata/
│       ├── short-description.txt
│       ├── full-description.txt
│       └── release-notes.txt
└── marketing/
    ├── press-kit/
    ├── brand-guidelines/
    └── promotional-materials/
```

## Icon Requirements

### iOS Icons
All icons must be:
- PNG format
- No transparency
- No rounded corners (iOS adds them)
- High quality with clear design at all sizes

### Android Icons
- Adaptive icon (foreground + background layers)
- PNG format, 32-bit with alpha
- 512x512 for Play Store
- Feature graphic for store listing

## Screenshot Requirements

### iOS Screenshots
**Required sizes:**
- iPhone 6.7" (1290x2796) - iPhone 14 Pro Max
- iPad 12.9" (2048x2732) - iPad Pro 12.9"

**Recommended additional:**
- iPhone 6.5" (1242x2688) - iPhone 11 Pro Max
- iPhone 5.5" (1242x2208) - iPhone 8 Plus
- iPad 11" (1668x2388) - iPad Pro 11"

### Android Screenshots
- Minimum 2 screenshots, maximum 8
- Phone: 1080x1920 or higher
- Tablet: 1200x1920 or higher
- 16:9 or 9:16 aspect ratio recommended

## Localization

Currently supporting English only for MVP. Future localizations should follow this structure:

```
app-store/
├── locales/
│   ├── en-US/
│   ├── ja-JP/
│   ├── zh-CN/
│   └── ms-MY/
```

## Asset Creation Guidelines

### Screenshots Content
1. **Welcome Screen** - Show onboarding flow
2. **Passport Scanning** - Camera scanning passport MRZ
3. **Trip Creation** - Multi-country trip setup
4. **Form Preview** - Auto-filled government form
5. **QR Wallet** - Stored QR codes from submissions

### Branding
- Use consistent Borderly brand colors
- Include device frames for professional look
- Add descriptive text overlays for key features
- Ensure readability on all screen sizes

### Quality Standards
- Minimum 72 DPI resolution
- RGB color space
- No compression artifacts
- Professional photography quality

## Automation

Use the release preparation script to validate all required assets are present before submission:

```bash
./scripts/prepare-release.sh 1.0.0 1
```

This script checks:
- All required icon sizes exist
- Screenshots for all device types
- Metadata files are complete and within character limits
- Icon quality validation (size, format, transparency)

For detailed submission requirements, see:
- `docs/app-store-submission-guide.md`
- `docs/app-store-submission-checklist.md`