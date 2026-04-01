#!/usr/bin/env node
/**
 * Generate test fixture photos for the iOS simulator.
 *
 * Creates:
 *   - 4 boarding pass QR codes (scannable by CIDetector)
 *   - 4 passport MRZ images (for future MRZ text recognition)
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
    surname: 'SMITH', given: 'JOHN<MICHAEL',
    passport: 'L12345678', nationality: 'USA',
    dob: '850615', gender: 'M', expiry: '320320',
    flight: 'NH 0005  SFO → NRT',
    bcbp: 'M1SMITH/JOHN MICHAEL  EABC123 SFONRTNH 0005 127Y023A0001 100',
  },
  {
    name: 'mom',
    label: 'Mom — Sarah Smith',
    surname: 'SMITH', given: 'SARAH<JANE',
    passport: 'L98765432', nationality: 'USA',
    dob: '870422', gender: 'F', expiry: '330115',
    flight: 'NH 0005  SFO → NRT',
    bcbp: 'M1SMITH/SARAH JANE    EDEF456 SFONRTNH 0005 127Y023B0002 100',
  },
  {
    name: 'teen',
    label: 'Teen — Emma Smith',
    surname: 'SMITH', given: 'EMMA',
    passport: 'N55512345', nationality: 'USA',
    dob: '100803', gender: 'F', expiry: '300520',
    flight: 'NH 0005  SFO → NRT',
    bcbp: 'M1SMITH/EMMA          EDEF456 SFONRTNH 0005 127Y023C0003 100',
  },
  {
    name: 'child',
    label: 'Child — Lucas Smith',
    surname: 'SMITH', given: 'LUCAS',
    passport: 'N77798765', nationality: 'USA',
    dob: '151210', gender: 'M', expiry: '310815',
    flight: 'NH 0005  SFO → NRT',
    bcbp: 'M1SMITH/LUCAS         EDEF456 SFONRTNH 0005 127Y023D0004 100',
  },
];

// ── MRZ helpers ─────────────────────────────────────────────────────────────

function pad(str, len) {
  return (str + '<'.repeat(len)).slice(0, len);
}

function checkDigit(str) {
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

function generateMRZ(p) {
  const line1 = pad(`P<${p.nationality}${p.surname}<<${p.given}`, 44);
  const pn = pad(p.passport, 9);
  const pnC = checkDigit(pn);
  const dobC = checkDigit(p.dob);
  const expC = checkDigit(p.expiry);
  const personal = pad('', 14);
  const composite = pn + pnC + p.nationality + p.dob + dobC + p.gender + p.expiry + expC + personal;
  const compC = checkDigit(composite);
  const line2 = pad(`${pn}${pnC}${p.nationality}${p.dob}${dobC}${p.gender}${p.expiry}${expC}${personal}${compC}`, 44);
  return { line1, line2 };
}

// ── Generate all fixtures ───────────────────────────────────────────────────

async function main() {
  console.log('Generating test fixture photos...\n');

  for (const profile of family) {
    // ── Boarding pass QR code ──
    try {
      const barcodePng = await bwipjs.toBuffer({
        bcid: 'qrcode',
        text: profile.bcbp,
        scale: 6,
        backgroundcolor: 'FFFFFF',
        includetext: false,
      });
      const bpPath = path.join(OUT_DIR, `boarding-pass-${profile.name}.png`);
      fs.writeFileSync(bpPath, barcodePng);
      console.log(`  boarding-pass-${profile.name}.png — ${profile.label}`);
    } catch (err) {
      console.error(`  FAILED boarding-pass-${profile.name}: ${err.message}`);
    }

    // ── Passport MRZ as QR code (encodes the MRZ text for scanning) ──
    try {
      const mrz = generateMRZ(profile);
      // Encode MRZ as QR so CIDetector can read it
      // The MRZ text is in the QR payload — app can parse it
      const mrzText = `${mrz.line1}\n${mrz.line2}`;
      const mrzPng = await bwipjs.toBuffer({
        bcid: 'qrcode',
        text: mrzText,
        scale: 6,
        backgroundcolor: 'FFFFFF',
        includetext: false,
      });
      const mrzPath = path.join(OUT_DIR, `passport-${profile.name}.png`);
      fs.writeFileSync(mrzPath, mrzPng);
      // Also log the MRZ for reference
      console.log(`  passport-${profile.name}.png — ${profile.label}`);
      console.log(`    MRZ L1: ${mrz.line1}`);
      console.log(`    MRZ L2: ${mrz.line2}`);
    } catch (err) {
      console.error(`  FAILED passport-${profile.name}: ${err.message}`);
    }
  }

  console.log(`\nDone! Files in ${OUT_DIR}`);
  console.log('Run: pnpm sim:photos');
}

main().catch(console.error);
