/**
 * Integration tests for auto-fill result handling.
 *
 * Tests the result parsing pipeline that processes WebView postMessage payloads:
 *   - parseFillResult: valid AUTO_FILL_RESULT payloads (all field statuses)
 *   - parseFillResult: non-AUTO_FILL_RESULT message types (return null)
 *   - parseFillResult: malformed/invalid inputs (return null)
 *   - isAutoFillSufficient: threshold boundary conditions
 *   - Round-trip: buildAutoFillScript → simulated execution → parseFillResult
 */

import { FormFiller, FieldSpec, FillResult } from '../../src/services/submission/formFiller';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let filler: FormFiller;

beforeEach(() => {
  filler = new FormFiller();
});

// ---------------------------------------------------------------------------
// Suite 1 — parseFillResult: valid AUTO_FILL_RESULT payloads
// ---------------------------------------------------------------------------

describe('parseFillResult — valid payloads', () => {
  it('parses a fully-filled result correctly', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 3,
      failed: 0,
      total: 3,
      results: [
        { id: 'surname', status: 'filled' },
        { id: 'passport', status: 'filled' },
        { id: 'dob', status: 'filled' },
      ],
    });

    const result = filler.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.filled).toBe(3);
    expect(result!.total).toBe(3);
    expect(result!.fillRate).toBe(1);
    expect(result!.results).toHaveLength(3);
    expect(result!.results.every((r) => r.status === 'filled')).toBe(true);
  });

  it('parses a partially-filled result with failed fields', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 2,
      failed: 1,
      total: 3,
      results: [
        { id: 'surname', status: 'filled' },
        { id: 'passport', status: 'failed' },
        { id: 'dob', status: 'filled' },
      ],
    });

    const result = filler.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.filled).toBe(2);
    expect(result!.total).toBe(3);
    expect(Math.round(result!.fillRate * 100) / 100).toBeCloseTo(2 / 3);
    expect(result!.results.find((r) => r.id === 'passport')?.status).toBe('failed');
  });

  it('parses all four field statuses correctly', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 1,
      failed: 3,
      total: 4,
      results: [
        { id: 'field1', status: 'filled' },
        { id: 'field2', status: 'failed' },
        { id: 'field3', status: 'skipped' },
        { id: 'field4', status: 'not_found' },
      ],
    });

    const result = filler.parseFillResult(payload);
    expect(result).not.toBeNull();
    const statuses = result!.results.map((r) => r.status);
    expect(statuses).toContain('filled');
    expect(statuses).toContain('failed');
    expect(statuses).toContain('skipped');
    expect(statuses).toContain('not_found');
  });

  it('parses a result with all fields skipped', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 0,
      failed: 0,
      total: 2,
      results: [
        { id: 'f1', status: 'skipped' },
        { id: 'f2', status: 'skipped' },
      ],
    });

    const result = filler.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.filled).toBe(0);
    expect(result!.fillRate).toBe(0);
    expect(result!.results.every((r) => r.status === 'skipped')).toBe(true);
  });

  it('parses a result with all fields not_found', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 0,
      failed: 2,
      total: 2,
      results: [
        { id: 'x', status: 'not_found' },
        { id: 'y', status: 'not_found' },
      ],
    });

    const result = filler.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.fillRate).toBe(0);
    expect(result!.results.every((r) => r.status === 'not_found')).toBe(true);
  });

  it('calculates fillRate correctly for zero total', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 0,
      failed: 0,
      total: 0,
      results: [],
    });

    const result = filler.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.fillRate).toBe(0);
    expect(result!.results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — parseFillResult: non-AUTO_FILL_RESULT types return null
// ---------------------------------------------------------------------------

describe('parseFillResult — non-AUTO_FILL_RESULT messages return null', () => {
  it('returns null for QR_PAGE_DETECTED payload', () => {
    const payload = JSON.stringify({
      type: 'QR_PAGE_DETECTED',
      url: 'https://vjw-lp.digital.go.jp/qr/ABC123',
    });
    expect(filler.parseFillResult(payload)).toBeNull();
  });

  it('returns null for NAVIGATION_EVENT payload', () => {
    const payload = JSON.stringify({
      type: 'NAVIGATION_EVENT',
      url: 'https://example.com',
    });
    expect(filler.parseFillResult(payload)).toBeNull();
  });

  it('returns null for CAPTCHA_DETECTED payload', () => {
    const payload = JSON.stringify({
      type: 'CAPTCHA_DETECTED',
      captchaType: 'recaptcha',
    });
    expect(filler.parseFillResult(payload)).toBeNull();
  });

  it('returns null for payload with missing type field', () => {
    const payload = JSON.stringify({
      filled: 3,
      total: 3,
      results: [],
    });
    expect(filler.parseFillResult(payload)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — parseFillResult: malformed/invalid inputs return null
// ---------------------------------------------------------------------------

describe('parseFillResult — malformed inputs return null', () => {
  it('returns null for plain text', () => {
    expect(filler.parseFillResult('hello world')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(filler.parseFillResult('')).toBeNull();
  });

  it('returns null for JSON array', () => {
    expect(filler.parseFillResult('[]')).toBeNull();
  });

  it('returns null for JSON number', () => {
    expect(filler.parseFillResult('42')).toBeNull();
  });

  it('returns null for JSON null', () => {
    expect(filler.parseFillResult('null')).toBeNull();
  });

  it('returns null for broken JSON', () => {
    expect(filler.parseFillResult('{"type": "AUTO_FILL_RESULT"')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — isAutoFillSufficient: threshold boundary conditions
// ---------------------------------------------------------------------------

describe('isAutoFillSufficient — threshold boundary conditions', () => {
  it('returns false for 0% fill rate', () => {
    expect(filler.isAutoFillSufficient(0)).toBe(false);
  });

  it('returns false for 49% fill rate', () => {
    expect(filler.isAutoFillSufficient(0.49)).toBe(false);
  });

  it('returns true for exactly 50% fill rate', () => {
    expect(filler.isAutoFillSufficient(0.5)).toBe(true);
  });

  it('returns true for 51% fill rate', () => {
    expect(filler.isAutoFillSufficient(0.51)).toBe(true);
  });

  it('returns true for 100% fill rate', () => {
    expect(filler.isAutoFillSufficient(1)).toBe(true);
  });

  it('returns false for negative fill rate', () => {
    expect(filler.isAutoFillSufficient(-0.1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — Round-trip: buildAutoFillScript → simulated result → parseFillResult
// ---------------------------------------------------------------------------

describe('Round-trip: script → simulated WebView result → parsed FillResult', () => {
  it('parseFillResult processes a simulated full-success result', () => {
    const fields: FieldSpec[] = [
      { id: 'surname', selector: '#surname', value: 'SMITH', inputType: 'text' },
      { id: 'givenNames', selector: '#given_name', value: 'JOHN', inputType: 'text' },
      { id: 'passportNumber', selector: '#passport_no', value: 'L12345678', inputType: 'text' },
    ];

    // Verify the script is built
    const script = filler.buildAutoFillScript(fields);
    expect(script).toContain('SMITH');
    expect(script).toContain('AUTO_FILL_RESULT');

    // Simulate the postMessage that the script would send
    const simulatedMessage = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 3,
      failed: 0,
      total: 3,
      results: fields.map((f) => ({ id: f.id, status: 'filled' })),
    });

    const result = filler.parseFillResult(simulatedMessage);
    expect(result).not.toBeNull();
    expect(result!.filled).toBe(3);
    expect(result!.total).toBe(3);
    expect(result!.fillRate).toBe(1);
    expect(filler.isAutoFillSufficient(result!.fillRate)).toBe(true);
  });

  it('parseFillResult processes a simulated partial-failure result', () => {
    const fields: FieldSpec[] = [
      { id: 'f1', selector: '#f1', value: 'v1', inputType: 'text' },
      { id: 'f2', selector: '#f2', value: 'v2', inputType: 'select' },
      { id: 'f3', selector: '#f3', value: 'v3', inputType: 'radio' },
      { id: 'f4', selector: '#f4', value: 'v4', inputType: 'date' },
    ];

    filler.buildAutoFillScript(fields); // ensure it builds without error

    // Simulate 2/4 filled → fillRate = 0.5 → just sufficient
    const simulatedMessage = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 2,
      failed: 2,
      total: 4,
      results: [
        { id: 'f1', status: 'filled' },
        { id: 'f2', status: 'filled' },
        { id: 'f3', status: 'not_found' },
        { id: 'f4', status: 'not_found' },
      ],
    });

    const result = filler.parseFillResult(simulatedMessage);
    expect(result).not.toBeNull();
    expect(result!.fillRate).toBe(0.5);
    expect(filler.isAutoFillSufficient(result!.fillRate)).toBe(true);
  });

  it('parseFillResult processes a below-threshold result', () => {
    const simulatedMessage = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 1,
      failed: 3,
      total: 4,
      results: [
        { id: 'f1', status: 'filled' },
        { id: 'f2', status: 'failed' },
        { id: 'f3', status: 'not_found' },
        { id: 'f4', status: 'skipped' },
      ],
    });

    const result: FillResult | null = filler.parseFillResult(simulatedMessage);
    expect(result).not.toBeNull();
    expect(result!.fillRate).toBe(0.25);
    expect(filler.isAutoFillSufficient(result!.fillRate)).toBe(false);
  });
});
