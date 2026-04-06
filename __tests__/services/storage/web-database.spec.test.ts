/**
 * Spec: Web database implementation persists trips/legs/QR codes in IndexedDB
 *
 * Status: hypothesis
 * Confirm: A web database service exists that uses IndexedDB for CRUD,
 *   replacing the WatermelonDB SQLite adapter on web platforms
 * Invalidate: WatermelonDB's built-in LokiJS adapter handles this better
 *   (it ships with WatermelonDB and is designed for browser use)
 *
 * Context: WatermelonDB uses SQLite via JSI on native. On web, the
 * current build mocks the entire storage barrel with in-memory arrays.
 * For a real deployment, trips/legs/QR codes need IndexedDB persistence.
 * The interface must match databaseService from src/services/storage/database.ts.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test.skip('web database implementation exists', () => {
  const paths = [
    'src/services/storage/database.web.ts',
    'src/services/storage/webDatabase.ts',
  ];
  const found = paths.some(p => existsSync(resolve(ROOT, p)));
  expect(found).toBe(true);
});

test.skip('web database uses IndexedDB for persistence', () => {
  const paths = [
    'src/services/storage/database.web.ts',
    'src/services/storage/webDatabase.ts',
  ];
  const existing = paths.find(p => existsSync(resolve(ROOT, p)));
  expect(existing).toBeDefined();

  const content = readFileSync(resolve(ROOT, existing!), 'utf-8');
  expect(content).toMatch(/indexedDB|IDBDatabase|idb/i);
});

test.skip('web database implements trip CRUD operations', () => {
  const paths = [
    'src/services/storage/database.web.ts',
    'src/services/storage/webDatabase.ts',
  ];
  const existing = paths.find(p => existsSync(resolve(ROOT, p)));
  expect(existing).toBeDefined();

  const content = readFileSync(resolve(ROOT, existing!), 'utf-8');
  expect(content).toMatch(/createTrip/);
  expect(content).toMatch(/getTripsWithLegs/);
  expect(content).toMatch(/updateTrip/);
  expect(content).toMatch(/deleteTrip/);
});
