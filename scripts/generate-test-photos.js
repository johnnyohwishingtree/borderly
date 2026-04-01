#!/usr/bin/env node
/**
 * Generate test fixture photos for the iOS simulator.
 *
 * Creates:
 *   - 4 passport MRZ images (family of 4)
 *   - 4 boarding pass barcode images (PDF417)
 *
 * Usage:
 *   node scripts/generate-test-photos.js
 *   pnpm sim:photos   # push to simulator
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
    surname: 'SMITH',
    given: 'JOHN MICHAEL',
    passport: 'L12345678',
    nationality: 'USA',
    dob: '850615', // YYMMDD
    gender: 'M',
    expiry: '320320',
    // Boarding pass: SFO → NRT (Japan)
    bcbp: 'M1SMITH/JOHN MICHAEL  EABC123 SFONRTNH 0005 127Y023A0001 100',
  },
  {
    name: 'mom',
    surname: 'SMITH',
    given: 'SARAH JANE',
    passport: 'L98765432',
    nationality: 'USA',
    dob: '870422',
    gender: 'F',
    expiry: '330115',
    bcbp: 'M1SMITH/SARAH JANE    EDEF456 SFONRTNH 0005 127Y023B0002 100',
  },
  {
    name: 'teen',
    surname: 'SMITH',
    given: 'EMMA',
    passport: 'N55512345',
    nationality: 'USA',
    dob: '100803',
    gender: 'F',
    expiry: '300520',
    bcbp: 'M1SMITH/EMMA          EDEF456 SFONRTNH 0005 127Y023C0003 100',
  },
  {
    name: 'child',
    surname: 'SMITH',
    given: 'LUCAS',
    passport: 'N77798765',
    nationality: 'USA',
    dob: '151210',
    gender: 'M',
    expiry: '310815',
    bcbp: 'M1SMITH/LUCAS         EDEF456 SFONRTNH 0005 127Y023D0004 100',
  },
];

// ── MRZ generation (TD3 format — 2 lines × 44 chars) ───────────────────────

function padRight(str, len, char = '<') {
  return (str + char.repeat(len)).slice(0, len);
}

function computeCheckDigit(str) {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    let val;
    if (ch === '<') val = 0;
    else if (ch >= '0' && ch <= '9') val = parseInt(ch);
    else val = ch.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
    sum += val * weights[i % 3];
  }
  return (sum % 10).toString();
}

function generateMRZ(profile) {
  // Line 1: P<NATIONALITY<SURNAME<<GIVEN<NAMES<<...
  const namePart = `${profile.surname}<<${profile.given.replace(/ /g, '<')}`;
  const line1 = padRight(`P<${profile.nationality}${namePart}`, 44);

  // Line 2: PASSPORT#<CHECK<NATIONALITY<DOB<CHECK<GENDER<EXPIRY<CHECK<PERSONAL<COMPOSITECHECK
  const pn = padRight(profile.passport, 9);
  const pnCheck = computeCheckDigit(pn);
  const dobCheck = computeCheckDigit(profile.dob);
  const expiryCheck = computeCheckDigit(profile.expiry);
  const personal = padRight('', 14);
  const composite = pn + pnCheck + profile.nationality + profile.dob + dobCheck +
    profile.gender + profile.expiry + expiryCheck + personal;
  const compositeCheck = computeCheckDigit(composite);
  const line2 = padRight(
    `${pn}${pnCheck}${profile.nationality}${profile.dob}${dobCheck}${profile.gender}${profile.expiry}${expiryCheck}${personal}${compositeCheck}`,
    44,
  );

  return { line1, line2 };
}

// ── SVG-based image generation (no native canvas needed) ────────────────────

function generateMRZSvg(profile) {
  const mrz = generateMRZ(profile);
  const width = 600;
  const height = 200;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#f5f0e8"/>
    <text x="20" y="40" font-family="monospace" font-size="14" fill="#333">PASSPORT — ${profile.nationality}</text>
    <text x="20" y="70" font-family="monospace" font-size="16" fill="#111">${profile.given} ${profile.surname}</text>
    <line x1="20" y1="120" x2="580" y2="120" stroke="#999" stroke-width="1"/>
    <text x="20" y="150" font-family="'OCR B', monospace" font-size="13" fill="#000">${mrz.line1}</text>
    <text x="20" y="175" font-family="'OCR B', monospace" font-size="13" fill="#000">${mrz.line2}</text>
  </svg>`;
}

// ── Generate all fixtures ───────────────────────────────────────────────────

async function main() {
  console.log('Generating test fixture photos...\n');

  for (const profile of family) {
    // MRZ passport image (SVG → can be imported via photo picker)
    const mrz = generateMRZ(profile);
    const svg = generateMRZSvg(profile);
    const mrzPath = path.join(OUT_DIR, `passport-${profile.name}.svg`);
    fs.writeFileSync(mrzPath, svg);
    console.log(`  passport-${profile.name}.svg`);
    console.log(`    MRZ L1: ${mrz.line1}`);
    console.log(`    MRZ L2: ${mrz.line2}`);

    // Boarding pass barcode (PDF417 PNG)
    try {
      const png = await bwipjs.toBuffer({
        bcid: 'pdf417',
        text: profile.bcbp,
        scale: 3,
        height: 10,
        includetext: false,
      });
      const bpPath = path.join(OUT_DIR, `boarding-pass-${profile.name}.png`);
      fs.writeFileSync(bpPath, png);
      console.log(`  boarding-pass-${profile.name}.png`);
      console.log(`    BCBP: ${profile.bcbp.slice(0, 40)}...`);
    } catch (err) {
      console.error(`  FAILED boarding-pass-${profile.name}: ${err.message}`);
    }
    console.log();
  }

  console.log(`Done! ${family.length * 2} files in ${OUT_DIR}`);
  console.log('Run: pnpm sim:photos');
}

main().catch(console.error);
