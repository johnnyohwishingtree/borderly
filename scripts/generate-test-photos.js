#!/usr/bin/env node
/**
 * Generate test fixture photos for the iOS simulator.
 *
 * Creates:
 *   - 4 boarding pass images (PDF417 barcode + visible label)
 *
 * Usage:
 *   pnpm generate:test-photos
 *   pnpm sim:photos
 */

const bwipjs = require('bwip-js');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, '../e2e/fixtures/photos');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Family of 4 profiles ───────────────────────────────────────────────────

const family = [
  {
    name: 'dad',
    label: 'Dad — John Smith',
    flight: 'NH 0005  SFO → NRT',
    bcbp: 'M1SMITH/JOHN MICHAEL  EABC123 SFONRTNH 0005 127Y023A0001 100',
  },
  {
    name: 'mom',
    label: 'Mom — Sarah Smith',
    flight: 'NH 0005  SFO → NRT',
    bcbp: 'M1SMITH/SARAH JANE    EDEF456 SFONRTNH 0005 127Y023B0002 100',
  },
  {
    name: 'teen',
    label: 'Teen — Emma Smith',
    flight: 'NH 0005  SFO → NRT',
    bcbp: 'M1SMITH/EMMA          EDEF456 SFONRTNH 0005 127Y023C0003 100',
  },
  {
    name: 'child',
    label: 'Child — Lucas Smith',
    flight: 'NH 0005  SFO → NRT',
    bcbp: 'M1SMITH/LUCAS         EDEF456 SFONRTNH 0005 127Y023D0004 100',
  },
];

// ── Generate labeled boarding pass images ───────────────────────────────────

async function main() {
  console.log('Generating test fixture photos...\n');

  for (const profile of family) {
    try {
      // Generate the barcode
      const barcodePng = await bwipjs.toBuffer({
        bcid: 'pdf417',
        text: profile.bcbp,
        scale: 4,
        height: 12,
        includetext: false,
      });

      // Create an SVG that embeds the barcode PNG + a visible label
      const barcodeBase64 = barcodePng.toString('base64');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="280">
  <rect width="500" height="280" fill="white"/>
  <text x="250" y="30" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="bold" fill="#111">BOARDING PASS</text>
  <text x="250" y="55" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="#444">${profile.label}</text>
  <text x="250" y="75" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#666">${profile.flight}</text>
  <line x1="30" y1="90" x2="470" y2="90" stroke="#ddd" stroke-width="1"/>
  <image x="30" y="100" width="440" height="150" href="data:image/png;base64,${barcodeBase64}"/>
  <text x="250" y="270" text-anchor="middle" font-family="monospace" font-size="9" fill="#999">PDF417 — Scan with Import from Photo</text>
</svg>`;

      // Write as SVG (simulator Photos app accepts SVG via simctl)
      const svgPath = path.join(OUT_DIR, `boarding-pass-${profile.name}.svg`);
      fs.writeFileSync(svgPath, svg);

      // Also write raw PNG for photo library (simctl needs image formats)
      const pngPath = path.join(OUT_DIR, `boarding-pass-${profile.name}.png`);
      fs.writeFileSync(pngPath, barcodePng);

      console.log(`  boarding-pass-${profile.name}.png + .svg — ${profile.label}`);
    } catch (err) {
      console.error(`  FAILED ${profile.name}: ${err.message}`);
    }
  }

  console.log(`\nDone! Files in ${OUT_DIR}`);
  console.log('Run: pnpm sim:photos');
}

main().catch(console.error);
