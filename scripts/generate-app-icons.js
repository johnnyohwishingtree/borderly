#!/usr/bin/env node

/**
 * App Icon Generator for Borderly
 * 
 * This script generates all required iOS app icon sizes from the master SVG.
 * It uses a placeholder approach suitable for development and testing.
 * For production, replace with professional icon design tools.
 */

const fs = require('fs');
const path = require('path');

// Icon sizes required for iOS
const iconSizes = [
  { name: 'icon-20@2x.png', size: 40 },
  { name: 'icon-20@3x.png', size: 60 },
  { name: 'icon-29@2x.png', size: 58 },
  { name: 'icon-29@3x.png', size: 87 },
  { name: 'icon-40@2x.png', size: 80 },
  { name: 'icon-40@3x.png', size: 120 },
  { name: 'icon-60@2x.png', size: 120 },
  { name: 'icon-60@3x.png', size: 180 },
  { name: 'icon-1024.png', size: 1024 }
];

// Create programmatic icon since we can't use external tools
function generateIconSVG(size) {
  const scale = size / 1024;
  const strokeWidth = Math.max(1, 6 * scale);
  const fontSize = Math.max(8, 48 * scale);
  const cornerRadius = Math.max(8, 180 * scale);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="0.5" cy="0.3" r="0.8">
      <stop offset="0%" stop-color="#4F46E5"/>
      <stop offset="100%" stop-color="#1E40AF"/>
    </radialGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bg)" rx="${cornerRadius}"/>
  
  <!-- Passport -->
  <g transform="scale(${scale})">
    <rect x="200" y="280" width="280" height="380" rx="12" fill="#059669"/>
    <rect x="208" y="288" width="264" height="364" rx="8" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.3"/>
    <text x="340" y="360" text-anchor="middle" fill="#FFFFFF" font-family="Arial" font-size="20" font-weight="bold" opacity="0.9">PASSPORT</text>
    <circle cx="340" cy="430" r="45" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.6"/>
    <rect x="220" y="600" width="240" height="4" rx="2" fill="#FFFFFF" opacity="0.4"/>
    <rect x="220" y="610" width="240" height="4" rx="2" fill="#FFFFFF" opacity="0.4"/>
  </g>
  
  <!-- Arrow -->
  <g transform="scale(${scale}) translate(520, 380)">
    <path d="M0 20 L80 20 L65 10 M80 20 L65 30" stroke="#FFFFFF" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round"/>
  </g>
  
  <!-- Phone -->
  <g transform="scale(${scale})">
    <rect x="620" y="240" width="180" height="320" rx="25" fill="#1F2937"/>
    <rect x="628" y="248" width="164" height="304" rx="20" fill="#111827"/>
    <rect x="636" y="280" width="148" height="240" rx="12" fill="#FFFFFF" opacity="0.9"/>
    
    <!-- QR pattern -->
    <rect x="656" y="300" width="24" height="24" fill="#1F2937"/>
    <rect x="660" y="304" width="16" height="16" fill="#FFFFFF"/>
    <rect x="664" y="308" width="8" height="8" fill="#1F2937"/>
  </g>
  
  <!-- Title -->
  <text x="${size/2}" y="${size * 0.9}" text-anchor="middle" fill="#FFFFFF" font-family="Arial" font-size="${fontSize}" font-weight="700">Borderly</text>
</svg>`;
}

// Generate Base64 PNG data (simplified approach)
function generateIconData(size) {
  const svg = generateIconSVG(size);
  
  // For development purposes, we'll create a simple data structure
  // In production, this would use proper SVG to PNG conversion
  const canvas = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  
  return {
    svg,
    dataUrl: canvas
  };
}

// Create icon files
function generateAllIcons() {
  const assetsDir = path.join(__dirname, '..', 'assets', 'app-store', 'ios', 'icons');
  const iosIconDir = path.join(__dirname, '..', 'ios', 'Borderly', 'Images.xcassets', 'AppIcon.appiconset');
  
  // Create directories if they don't exist
  fs.mkdirSync(assetsDir, { recursive: true });
  
  // Generate icons
  iconSizes.forEach(({ name, size }) => {
    const iconData = generateIconData(size);
    
    // Save SVG version to assets
    const svgPath = path.join(assetsDir, name.replace('.png', '.svg'));
    fs.writeFileSync(svgPath, iconData.svg);
    
    console.log(`Generated ${name} (${size}x${size})`);
  });
  
  // Create master icon
  const masterIcon = generateIconData(1024);
  fs.writeFileSync(path.join(assetsDir, 'AppStore-1024x1024.svg'), masterIcon.svg);
  
  console.log('Generated master AppStore icon (1024x1024)');
  
  // Copy reference to iOS project
  try {
    // Note: In real implementation, you'd convert SVG to PNG here
    // For now, we'll create placeholder instructions
    fs.writeFileSync(path.join(iosIconDir, 'ICON_GENERATION_INSTRUCTIONS.md'), `
# iOS App Icon Generation

The SVG icons have been generated in assets/app-store/ios/icons/.

To generate actual PNG files for production:

1. Use a tool like Inkscape or online SVG to PNG converters:
   \`\`\`bash
   # Example with Inkscape (if installed)
   for svg in assets/app-store/ios/icons/*.svg; do
     inkscape "$svg" --export-type=png --export-filename="\${svg%.svg}.png"
   done
   \`\`\`

2. Or use online tools:
   - https://cloudconvert.com/svg-to-png
   - https://convertio.co/svg-png/

3. Copy the PNG files to ios/Borderly/Images.xcassets/AppIcon.appiconset/

Required files:
${iconSizes.map(icon => `- ${icon.name} (${icon.size}x${icon.size})`).join('\n')}

The Contents.json file is already configured for these filenames.
`);
    
    console.log('Created icon generation instructions');
  } catch (error) {
    console.warn('Could not write to iOS directory:', error.message);
  }
}

// Main execution
if (require.main === module) {
  try {
    generateAllIcons();
    console.log('\n✅ App icons generated successfully!');
    console.log('\nNext steps:');
    console.log('1. Convert SVG files to PNG using your preferred tool');
    console.log('2. Copy PNG files to ios/Borderly/Images.xcassets/AppIcon.appiconset/');
    console.log('3. Run app to verify icons appear correctly');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

module.exports = { generateAllIcons, generateIconData };