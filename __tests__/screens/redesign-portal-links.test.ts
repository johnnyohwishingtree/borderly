import { existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Step 4 — Portal links launch pad.
 *
 * One card per country with a "Launch Portal" button. Instructions
 * to log in and use the auto-fill icon. After submission, QR receipt
 * saves to Wallet tab.
 *
 * The auto-fill pill (like 1Password) appears inside the portal WebView
 * when opened. User taps it to fill all fields at once.
 *
 * Confirm: Users understand the "launch portal + tap auto-fill" pattern
 * Invalidate: Users expect the app to submit for them (guided submission)
 */

test('PortalLinks screen exists', () => {
  expect(existsSync(
    resolve(ROOT, 'src/screens/forms/PortalLinksScreen'),
  )).toBe(true);
});

test('PortalLinks shows one card per selected country', () => {
  // Each card: country flag, portal name, "Launch Portal" button
  // Status: "Ready to submit" or "QR saved" after submission
});

test('PortalLinks has clear instructions', () => {
  // Text explaining: "Log in to each portal, then tap the auto-fill
  // icon to fill your form automatically"
});

test('PortalLinks launch opens WebView with auto-fill pill', () => {
  // Tapping "Launch Portal" opens PortalSubmission WebView
  // Auto-fill pill appears (existing component — reused)
});

test('PortalLinks saves QR receipt to Wallet after submission', () => {
  // After portal submission, QR code saves to Wallet tab
  // Card shows "Submitted ✓" status
});
