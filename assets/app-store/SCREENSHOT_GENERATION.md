# Screenshot Generation Instructions

## Generated Screenshots

The following screenshot SVG files have been generated for App Store submission:


### iPhone-6.7 (1290x2796)
- 1-welcome-to-borderly.svg
- 2-passport-scanning.svg
- 3-auto-generated-forms.svg
- 4-qr-code-wallet.svg
- 5-government-portal-guide.svg

### iPhone-6.5 (1242x2688)
- 1-welcome-to-borderly.svg
- 2-passport-scanning.svg
- 3-auto-generated-forms.svg
- 4-qr-code-wallet.svg
- 5-government-portal-guide.svg

### iPhone-5.5 (1242x2208)
- 1-welcome-to-borderly.svg
- 2-passport-scanning.svg
- 3-auto-generated-forms.svg
- 4-qr-code-wallet.svg
- 5-government-portal-guide.svg

### iPad-12.9 (2048x2732)
- 1-welcome-to-borderly.svg
- 2-passport-scanning.svg
- 3-auto-generated-forms.svg
- 4-qr-code-wallet.svg
- 5-government-portal-guide.svg

### iPad-11 (1668x2388)
- 1-welcome-to-borderly.svg
- 2-passport-scanning.svg
- 3-auto-generated-forms.svg
- 4-qr-code-wallet.svg
- 5-government-portal-guide.svg


## Converting to PNG

To convert these SVG screenshots to PNG format for App Store submission:

### Option 1: Online Conversion
1. Upload SVG files to https://cloudconvert.com/svg-to-png
2. Set quality to maximum (100%)
3. Download converted PNG files

### Option 2: Command Line (if Inkscape installed)
```bash
# Convert all SVG files to PNG
find assets/app-store/ios/screenshots -name "*.svg" -exec sh -c 'inkscape "$1" --export-type=png --export-filename="${1%.svg}.png"' _ {} \;
```

### Option 3: ImageMagick (if installed)
```bash
# Convert all SVG files to PNG with high quality
find assets/app-store/ios/screenshots -name "*.svg" -exec sh -c 'convert -density 300 "$1" "${1%.svg}.png"' _ {} \;
```

## Production Screenshots

For production release, replace these placeholder screenshots with:

1. **Actual app screenshots** from simulators or devices
2. **Professional device frames** using tools like:
   - [Screenshot.to](https://screenshot.to)
   - [App Store Screenshot Generator](https://www.appstorescreenshot.com)
   - [Previewed](https://previewed.app)

3. **Optimized content** showing:
   - Real passport scanning in action
   - Actual government forms with sample data
   - QR codes and submission workflow
   - Multi-language support (future)

## Required Formats

- **iOS App Store**: PNG only
- **Maximum file size**: 8MB per screenshot
- **Color profile**: sRGB recommended
- **Minimum resolution**: As specified by device size

## Quality Guidelines

- Use high-resolution source images
- Ensure text is readable on all device sizes
- Maintain consistent branding across all screenshots
- Show app's unique value proposition clearly
- Include captions/overlays explaining key features
