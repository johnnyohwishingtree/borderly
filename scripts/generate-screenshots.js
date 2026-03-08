#!/usr/bin/env node

/**
 * Screenshot Generator for App Store
 * 
 * Generates placeholder screenshots for different device sizes.
 * In production, these would be replaced with actual app screenshots.
 */

const fs = require('fs');
const path = require('path');

// Screenshot sizes for iOS devices
const screenshotSizes = [
  { name: 'iPhone-6.7', width: 1290, height: 2796 }, // iPhone 14 Pro Max
  { name: 'iPhone-6.5', width: 1242, height: 2688 }, // iPhone 11 Pro Max  
  { name: 'iPhone-5.5', width: 1242, height: 2208 }, // iPhone 8 Plus
  { name: 'iPad-12.9', width: 2048, height: 2732 },  // iPad Pro 12.9"
  { name: 'iPad-11', width: 1668, height: 2388 }     // iPad Pro 11"
];

// App screens to showcase
const appScreens = [
  {
    title: 'Welcome to Borderly',
    subtitle: 'Fill passport info once, travel everywhere',
    description: 'Simplify customs and immigration forms for Japan, Malaysia, and Singapore',
    color: '#4F46E5'
  },
  {
    title: 'Passport Scanning',
    subtitle: 'Scan your passport with the camera',
    description: 'Uses MRZ (Machine Readable Zone) technology for accurate data capture',
    color: '#059669'
  },
  {
    title: 'Auto-Generated Forms',
    subtitle: 'Smart forms for each destination',
    description: 'Your profile automatically fills country-specific forms',
    color: '#DC2626'
  },
  {
    title: 'QR Code Wallet',
    subtitle: 'Store submission QR codes offline',
    description: 'Keep all your travel QR codes organized and accessible',
    color: '#7C2D12'
  },
  {
    title: 'Government Portal Guide',
    subtitle: 'Step-by-step submission help',
    description: 'Guided walkthrough for each country\'s official portal',
    color: '#1E40AF'
  }
];

function generateScreenshotSVG(width, height, screen, deviceName) {
  const isTablet = deviceName.includes('iPad');
  const scale = isTablet ? 1.2 : 1;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${screen.color}"/>
      <stop offset="100%" stop-color="${screen.color}CC"/>
    </linearGradient>
    <radialGradient id="phoneGlow" cx="0.5" cy="0.3" r="0.8">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.05"/>
    </radialGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#screenGrad)"/>
  <rect width="${width}" height="${height}" fill="url(#phoneGlow)"/>
  
  <!-- Status bar (for phones) -->
  ${!isTablet ? `
  <g fill="#FFFFFF" opacity="0.9">
    <text x="60" y="60" font-family="SF Pro Text, Arial" font-size="32" font-weight="600">9:41</text>
    <circle cx="${width - 80}" r="8" cy="45" fill="#10B981"/>
    <rect x="${width - 120}" y="38" width="25" height="14" rx="3" fill="none" stroke="#FFFFFF" stroke-width="2"/>
    <rect x="${width - 115}" y="42" width="15" height="6" fill="#FFFFFF"/>
  </g>` : ''}
  
  <!-- Main content area -->
  <g transform="translate(${isTablet ? 200 : 80}, ${isTablet ? 200 : 160})">
    <!-- App icon placeholder -->
    <rect x="${(width - (isTablet ? 400 : 160) - 200)/2}" y="100" width="${isTablet ? 200 : 120}" height="${isTablet ? 200 : 120}" rx="${isTablet ? 50 : 25}" fill="#FFFFFF" opacity="0.95"/>
    <rect x="${(width - (isTablet ? 400 : 160) - 180)/2}" y="110" width="${isTablet ? 180 : 100}" height="${isTablet ? 180 : 100}" rx="${isTablet ? 40 : 20}" fill="${screen.color}" opacity="0.8"/>
    
    <!-- Main title -->
    <text x="${(width - (isTablet ? 400 : 160))/2}" y="${isTablet ? 400 : 320}" text-anchor="middle" fill="#FFFFFF" font-family="SF Pro Display, Arial" font-size="${isTablet ? 72 : 48}" font-weight="700">${screen.title}</text>
    
    <!-- Subtitle -->
    <text x="${(width - (isTablet ? 400 : 160))/2}" y="${isTablet ? 480 : 380}" text-anchor="middle" fill="#FFFFFF" font-family="SF Pro Text, Arial" font-size="${isTablet ? 36 : 24}" font-weight="500" opacity="0.9">${screen.subtitle}</text>
    
    <!-- Description -->
    <text x="${(width - (isTablet ? 400 : 160))/2}" y="${isTablet ? 580 : 460}" text-anchor="middle" fill="#FFFFFF" font-family="SF Pro Text, Arial" font-size="${isTablet ? 28 : 18}" font-weight="400" opacity="0.7">${screen.description}</text>
    
    <!-- Feature highlights -->
    <g transform="translate(${(width - (isTablet ? 400 : 160))/2 - (isTablet ? 300 : 200)}, ${isTablet ? 700 : 560})">
      <circle cx="0" cy="0" r="${isTablet ? 15 : 10}" fill="#FFFFFF" opacity="0.9"/>
      <text x="40" y="8" fill="#FFFFFF" font-family="SF Pro Text, Arial" font-size="${isTablet ? 24 : 16}" font-weight="500" opacity="0.8">Secure & Private</text>
      
      <circle cx="0" cy="${isTablet ? 80 : 50}" r="${isTablet ? 15 : 10}" fill="#FFFFFF" opacity="0.9"/>
      <text x="40" y="${isTablet ? 88 : 58}" fill="#FFFFFF" font-family="SF Pro Text, Arial" font-size="${isTablet ? 24 : 16}" font-weight="500" opacity="0.8">Offline First</text>
      
      <circle cx="0" cy="${isTablet ? 160 : 100}" r="${isTablet ? 15 : 10}" fill="#FFFFFF" opacity="0.9"/>
      <text x="40" y="${isTablet ? 168 : 108}" fill="#FFFFFF" font-family="SF Pro Text, Arial" font-size="${isTablet ? 24 : 16}" font-weight="500" opacity="0.8">Multi-Country</text>
    </g>
  </g>
  
  <!-- Footer branding -->
  <text x="${width/2}" y="${height - (isTablet ? 100 : 60)}" text-anchor="middle" fill="#FFFFFF" font-family="SF Pro Display, Arial" font-size="${isTablet ? 32 : 20}" font-weight="600" opacity="0.6">Borderly</text>
</svg>`;
}

function generateAllScreenshots() {
  const screenshotsDir = path.join(__dirname, '..', 'assets', 'app-store');
  
  screenshotSizes.forEach(({ name, width, height }) => {
    const deviceDir = path.join(screenshotsDir, 'ios', 'screenshots', name);
    fs.mkdirSync(deviceDir, { recursive: true });
    
    appScreens.forEach((screen, index) => {
      const svg = generateScreenshotSVG(width, height, screen, name);
      const filename = `${index + 1}-${screen.title.toLowerCase().replace(/\s+/g, '-')}.svg`;
      const filepath = path.join(deviceDir, filename);
      
      fs.writeFileSync(filepath, svg);
      console.log(`Generated ${name}/${filename} (${width}x${height})`);
    });
  });
  
  // Create instructions for converting SVGs to PNGs
  const instructionsPath = path.join(screenshotsDir, 'SCREENSHOT_GENERATION.md');
  fs.writeFileSync(instructionsPath, `# Screenshot Generation Instructions

## Generated Screenshots

The following screenshot SVG files have been generated for App Store submission:

${screenshotSizes.map(size => `
### ${size.name} (${size.width}x${size.height})
${appScreens.map((screen, i) => `- ${i + 1}-${screen.title.toLowerCase().replace(/\s+/g, '-')}.svg`).join('\n')}
`).join('')}

## Converting to PNG

To convert these SVG screenshots to PNG format for App Store submission:

### Option 1: Online Conversion
1. Upload SVG files to https://cloudconvert.com/svg-to-png
2. Set quality to maximum (100%)
3. Download converted PNG files

### Option 2: Command Line (if Inkscape installed)
\`\`\`bash
# Convert all SVG files to PNG
find assets/app-store/ios/screenshots -name "*.svg" -exec sh -c 'inkscape "$1" --export-type=png --export-filename="\${1%.svg}.png"' _ {} \\;
\`\`\`

### Option 3: ImageMagick (if installed)
\`\`\`bash
# Convert all SVG files to PNG with high quality
find assets/app-store/ios/screenshots -name "*.svg" -exec sh -c 'convert -density 300 "$1" "\${1%.svg}.png"' _ {} \\;
\`\`\`

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
`);
  
  console.log('\nCreated screenshot generation instructions');
}

// Main execution
if (require.main === module) {
  try {
    generateAllScreenshots();
    console.log('\n✅ Screenshots generated successfully!');
    console.log('\nNext steps:');
    console.log('1. Convert SVG files to PNG format');
    console.log('2. Replace with actual app screenshots for production');
    console.log('3. Add device frames and professional polish');
  } catch (error) {
    console.error('❌ Error generating screenshots:', error);
    process.exit(1);
  }
}

module.exports = { generateAllScreenshots };