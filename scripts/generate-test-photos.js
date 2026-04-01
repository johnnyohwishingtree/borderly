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
      // Generate QR code (CIDetector on iOS supports QR natively, PDF417 needs Vision/GPU)
      const barcodePng = await bwipjs.toBuffer({
        bcid: 'qrcode',
        text: profile.bcbp,
        scale: 6,
        includetext: false,
      });

      // Write PNG for photo library
      const pngPath = path.join(OUT_DIR, `boarding-pass-${profile.name}.png`);
      fs.writeFileSync(pngPath, barcodePng);

      console.log(`  boarding-pass-${profile.name}.png — ${profile.label}`);
    } catch (err) {
      console.error(`  FAILED ${profile.name}: ${err.message}`);
    }
  }

  console.log(`\nDone! Files in ${OUT_DIR}`);
  console.log('Run: pnpm sim:photos');
}

main().catch(console.error);
