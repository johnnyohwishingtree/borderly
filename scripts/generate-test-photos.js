#!/usr/bin/env node
/**
 * Generate realistic test fixture photos for the iOS simulator.
 *
 * Creates boarding pass cards and passport photo pages that look like
 * the real thing — not just raw QR codes. Each image has a human-readable
 * layout plus a scannable QR code.
 *
 * Usage:
 *   pnpm generate:test-photos
 *   pnpm sim:photos
 */

const bwipjs = require('bwip-js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, '../e2e/fixtures/photos');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Family of 4 ─────────────────────────────────────────────────────────────

const family = [
  {
    name: 'dad', label: 'SMITH/JOHN MICHAEL', surname: 'SMITH', given: 'JOHN MICHAEL',
    passport: 'L12345678', nationality: 'USA', dob: '15 JUN 1985', dobMrz: '850615',
    gender: 'M', expiry: '20 MAR 2032', expiryMrz: '320320',
    seat: '23A', flight: 'NH 0005', from: 'SFO', to: 'NRT', date: '07 MAY 2026', class: 'Y',
    bcbp: 'M1SMITH/JOHN MICHAEL  EABC123 SFONRTNH 0005 127Y023A0001 100',
  },
  {
    name: 'mom', label: 'SMITH/SARAH JANE', surname: 'SMITH', given: 'SARAH JANE',
    passport: 'L98765432', nationality: 'USA', dob: '22 APR 1987', dobMrz: '870422',
    gender: 'F', expiry: '15 JAN 2033', expiryMrz: '330115',
    seat: '23B', flight: 'NH 0005', from: 'SFO', to: 'NRT', date: '07 MAY 2026', class: 'Y',
    bcbp: 'M1SMITH/SARAH JANE    EDEF456 SFONRTNH 0005 127Y023B0002 100',
  },
  {
    name: 'teen', label: 'SMITH/EMMA', surname: 'SMITH', given: 'EMMA',
    passport: 'N55512345', nationality: 'USA', dob: '03 AUG 2010', dobMrz: '100803',
    gender: 'F', expiry: '20 MAY 2030', expiryMrz: '300520',
    seat: '23C', flight: 'NH 0005', from: 'SFO', to: 'NRT', date: '07 MAY 2026', class: 'Y',
    bcbp: 'M1SMITH/EMMA          EDEF456 SFONRTNH 0005 127Y023C0003 100',
  },
  {
    name: 'child', label: 'SMITH/LUCAS', surname: 'SMITH', given: 'LUCAS',
    passport: 'N77798765', nationality: 'USA', dob: '10 DEC 2015', dobMrz: '151210',
    gender: 'M', expiry: '15 AUG 2031', expiryMrz: '310815',
    seat: '23D', flight: 'NH 0005', from: 'SFO', to: 'NRT', date: '07 MAY 2026', class: 'Y',
    bcbp: 'M1SMITH/LUCAS         EDEF456 SFONRTNH 0005 127Y023D0004 100',
  },
];

// ── MRZ helpers ─────────────────────────────────────────────────────────────

function pad(str, len) { return (str + '<'.repeat(len)).slice(0, len); }
function checkDigit(str) {
  const w = [7, 3, 1]; let s = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i]; let v;
    if (c === '<') v = 0; else if (c >= '0' && c <= '9') v = parseInt(c);
    else v = c.charCodeAt(0) - 65 + 10;
    s += v * w[i % 3];
  }
  return (s % 10).toString();
}
function generateMRZ(p) {
  const l1 = pad(`P<${p.nationality}${p.surname}<<${p.given.replace(/ /g, '<')}`, 44);
  const pn = pad(p.passport, 9), pnC = checkDigit(pn);
  const dobC = checkDigit(p.dobMrz), expC = checkDigit(p.expiryMrz);
  const pers = pad('', 14);
  const comp = pn + pnC + p.nationality + p.dobMrz + dobC + p.gender + p.expiryMrz + expC + pers;
  const l2 = pad(`${pn}${pnC}${p.nationality}${p.dobMrz}${dobC}${p.gender}${p.expiryMrz}${expC}${pers}${checkDigit(comp)}`, 44);
  return { line1: l1, line2: l2 };
}

// ── SVG templates ───────────────────────────────────────────────────────────

function boardingPassSvg(p, qrBase64) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340">
  <rect width="600" height="340" rx="16" fill="white" stroke="#ddd" stroke-width="1"/>
  <!-- Header -->
  <rect x="0" y="0" width="600" height="50" rx="16" fill="#1e40af"/>
  <rect x="0" y="16" width="600" height="34" fill="#1e40af"/>
  <text x="20" y="33" font-family="Helvetica" font-size="16" font-weight="bold" fill="white">BOARDING PASS</text>
  <text x="580" y="33" font-family="Helvetica" font-size="12" fill="#93c5fd" text-anchor="end">ELECTRONIC</text>
  <!-- Passenger -->
  <text x="20" y="75" font-family="Helvetica" font-size="10" fill="#888">PASSENGER NAME</text>
  <text x="20" y="93" font-family="Helvetica" font-size="16" font-weight="bold" fill="#111">${p.label}</text>
  <!-- Route -->
  <text x="20" y="120" font-family="Helvetica" font-size="10" fill="#888">FROM</text>
  <text x="20" y="140" font-family="Helvetica" font-size="24" font-weight="bold" fill="#1e40af">${p.from}</text>
  <text x="140" y="135" font-family="Helvetica" font-size="20" fill="#ccc">→</text>
  <text x="180" y="120" font-family="Helvetica" font-size="10" fill="#888">TO</text>
  <text x="180" y="140" font-family="Helvetica" font-size="24" font-weight="bold" fill="#1e40af">${p.to}</text>
  <!-- Details -->
  <text x="320" y="120" font-family="Helvetica" font-size="10" fill="#888">FLIGHT</text>
  <text x="320" y="138" font-family="Helvetica" font-size="14" font-weight="bold" fill="#111">${p.flight}</text>
  <text x="420" y="120" font-family="Helvetica" font-size="10" fill="#888">DATE</text>
  <text x="420" y="138" font-family="Helvetica" font-size="14" font-weight="bold" fill="#111">${p.date}</text>
  <text x="320" y="160" font-family="Helvetica" font-size="10" fill="#888">SEAT</text>
  <text x="320" y="178" font-family="Helvetica" font-size="14" font-weight="bold" fill="#111">${p.seat}</text>
  <text x="420" y="160" font-family="Helvetica" font-size="10" fill="#888">CLASS</text>
  <text x="420" y="178" font-family="Helvetica" font-size="14" font-weight="bold" fill="#111">${p.class === 'Y' ? 'Economy' : p.class}</text>
  <!-- Divider -->
  <line x1="20" y1="195" x2="580" y2="195" stroke="#eee" stroke-width="1" stroke-dasharray="6,4"/>
  <!-- QR code -->
  <image x="20" y="210" width="110" height="110" href="data:image/png;base64,${qrBase64}"/>
  <text x="150" y="240" font-family="monospace" font-size="9" fill="#999">Scan QR code at gate</text>
  <text x="150" y="260" font-family="monospace" font-size="9" fill="#999">or use mobile boarding pass</text>
  <text x="150" y="300" font-family="Helvetica" font-size="10" fill="#bbb">Booking: ABC123</text>
</svg>`;
}

function passportSvg(p, mrz, qrBase64) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420">
  <rect width="600" height="420" fill="#f5f0e6" stroke="#c9b99a" stroke-width="2"/>
  <!-- Header -->
  <text x="300" y="30" font-family="Helvetica" font-size="11" fill="#8b7355" text-anchor="middle" letter-spacing="3">UNITED STATES OF AMERICA</text>
  <text x="300" y="50" font-family="Helvetica" font-size="14" font-weight="bold" fill="#1a365d" text-anchor="middle" letter-spacing="2">PASSPORT</text>
  <!-- Photo placeholder with embedded QR -->
  <rect x="30" y="70" width="140" height="180" rx="4" fill="white" stroke="#b8a88a" stroke-width="1"/>
  <image x="35" y="75" width="130" height="130" href="data:image/png;base64,${qrBase64}"/>
  <text x="100" y="225" font-family="Helvetica" font-size="8" fill="#a89878" text-anchor="middle">MRZ QR Code</text>
  <!-- Fields -->
  <text x="200" y="90" font-family="Helvetica" font-size="9" fill="#8b7355">Type / Type</text>
  <text x="200" y="106" font-family="Helvetica" font-size="13" font-weight="bold" fill="#1a365d">P</text>
  <text x="260" y="90" font-family="Helvetica" font-size="9" fill="#8b7355">Country Code</text>
  <text x="260" y="106" font-family="Helvetica" font-size="13" font-weight="bold" fill="#1a365d">${p.nationality}</text>
  <text x="200" y="130" font-family="Helvetica" font-size="9" fill="#8b7355">Surname / Nom</text>
  <text x="200" y="148" font-family="Helvetica" font-size="15" font-weight="bold" fill="#1a365d">${p.surname}</text>
  <text x="200" y="170" font-family="Helvetica" font-size="9" fill="#8b7355">Given Names / Prénoms</text>
  <text x="200" y="188" font-family="Helvetica" font-size="15" font-weight="bold" fill="#1a365d">${p.given}</text>
  <text x="200" y="215" font-family="Helvetica" font-size="9" fill="#8b7355">Nationality</text>
  <text x="200" y="231" font-family="Helvetica" font-size="12" fill="#1a365d">UNITED STATES</text>
  <text x="400" y="215" font-family="Helvetica" font-size="9" fill="#8b7355">Sex</text>
  <text x="400" y="231" font-family="Helvetica" font-size="12" fill="#1a365d">${p.gender}</text>
  <text x="200" y="255" font-family="Helvetica" font-size="9" fill="#8b7355">Date of Birth</text>
  <text x="200" y="271" font-family="Helvetica" font-size="12" fill="#1a365d">${p.dob}</text>
  <text x="400" y="255" font-family="Helvetica" font-size="9" fill="#8b7355">Date of Expiry</text>
  <text x="400" y="271" font-family="Helvetica" font-size="12" fill="#1a365d">${p.expiry}</text>
  <text x="200" y="295" font-family="Helvetica" font-size="9" fill="#8b7355">Passport No.</text>
  <text x="200" y="311" font-family="Helvetica" font-size="13" font-weight="bold" fill="#1a365d">${p.passport}</text>
  <!-- MRZ zone -->
  <rect x="0" y="340" width="600" height="80" fill="#e8e0d0"/>
  <text x="20" y="365" font-family="'OCR B', 'Courier New', monospace" font-size="13" fill="#333" letter-spacing="1.5">${mrz.line1.replace(/</g, '&lt;')}</text>
  <text x="20" y="395" font-family="'OCR B', 'Courier New', monospace" font-size="13" fill="#333" letter-spacing="1.5">${mrz.line2.replace(/</g, '&lt;')}</text>
</svg>`;
}

// ── Generate all ────────────────────────────────────────────────────────────

async function main() {
  console.log('Generating test fixture photos...\n');

  for (const p of family) {
    // ── Boarding pass ──
    try {
      const qr = await bwipjs.toBuffer({
        bcid: 'qrcode', text: p.bcbp, scale: 4, backgroundcolor: 'FFFFFF', includetext: false,
      });
      const svgContent = boardingPassSvg(p, qr.toString('base64'));
      const svgPath = path.join(OUT_DIR, `_tmp_bp_${p.name}.svg`);
      const pngPath = path.join(OUT_DIR, `boarding-pass-${p.name}.png`);
      fs.writeFileSync(svgPath, svgContent);
      execSync(`sips -s format png "${svgPath}" --out "${pngPath}" 2>/dev/null`);
      fs.unlinkSync(svgPath);
      console.log(`  boarding-pass-${p.name}.png — ${p.given} ${p.surname}`);
    } catch (err) {
      console.error(`  FAILED boarding-pass-${p.name}: ${err.message}`);
    }

    // ── Passport ──
    try {
      const mrz = generateMRZ(p);
      const mrzText = `${mrz.line1}\n${mrz.line2}`;
      const mrzQr = await bwipjs.toBuffer({
        bcid: 'qrcode', text: mrzText, scale: 4, backgroundcolor: 'FFFFFF', includetext: false,
      });
      const svgContent = passportSvg(p, mrz, mrzQr.toString('base64'));
      const svgPath = path.join(OUT_DIR, `_tmp_pp_${p.name}.svg`);
      const pngPath = path.join(OUT_DIR, `passport-${p.name}.png`);
      fs.writeFileSync(svgPath, svgContent);
      execSync(`sips -s format png "${svgPath}" --out "${pngPath}" 2>/dev/null`);
      fs.unlinkSync(svgPath);
      console.log(`  passport-${p.name}.png — ${p.given} ${p.surname}`);
      console.log(`    MRZ: ${mrz.line1}`);
      console.log(`          ${mrz.line2}`);
    } catch (err) {
      console.error(`  FAILED passport-${p.name}: ${err.message}`);
    }
  }

  console.log(`\nDone! 8 files in ${OUT_DIR}`);
  console.log('Run: pnpm sim:photos');
}

main().catch(console.error);
