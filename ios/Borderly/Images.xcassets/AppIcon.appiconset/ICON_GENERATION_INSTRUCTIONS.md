
# iOS App Icon Generation

The SVG icons have been generated in assets/app-store/ios/icons/.

To generate actual PNG files for production:

1. Use a tool like Inkscape or online SVG to PNG converters:
   ```bash
   # Example with Inkscape (if installed)
   for svg in assets/app-store/ios/icons/*.svg; do
     inkscape "$svg" --export-type=png --export-filename="${svg%.svg}.png"
   done
   ```

2. Or use online tools:
   - https://cloudconvert.com/svg-to-png
   - https://convertio.co/svg-png/

3. Copy the PNG files to ios/Borderly/Images.xcassets/AppIcon.appiconset/

Required files:
- icon-20@2x.png (40x40)
- icon-20@3x.png (60x60)
- icon-29@2x.png (58x58)
- icon-29@3x.png (87x87)
- icon-40@2x.png (80x80)
- icon-40@3x.png (120x120)
- icon-60@2x.png (120x120)
- icon-60@3x.png (180x180)
- icon-1024.png (1024x1024)

The Contents.json file is already configured for these filenames.
