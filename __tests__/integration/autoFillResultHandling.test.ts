/**
 * Integration tests — AUTO_FILL_RESULT and QR_PAGE_DETECTED message parsing.
 *
 * Tests formFiller.parseFillResult, isAutoFillSufficient, and the round-trip
 * from buildAutoFillScript → simulated postMessage payload → parseFillResult.
 */

import { formFiller, FormFiller, FieldSpec } from '../../src/services/submission/formFiller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAutoFillResult(opts: {
  filled: number;
  failed: number;
  total: number;
  results?: Array<{ id: string; status: 'filled' | 'failed' | 'skipped' | 'not_found' }>;
}): string {
  return JSON.stringify({
    type: 'AUTO_FILL_RESULT',
    filled: opts.filled,
    failed: opts.failed,
    total: opts.total,
    results: opts.results ?? [],
  });
}

// ---------------------------------------------------------------------------
// parseFillResult
// ---------------------------------------------------------------------------

describe('formFiller.parseFillResult', () => {
  describe('valid AUTO_FILL_RESULT payloads', () => {
    it('parses a simple all-filled result', () => {
      const payload = makeAutoFillResult({
        filled: 3,
        failed: 0,
        total: 3,
        results: [
          { id: 'surname', status: 'filled' },
          { id: 'givenNames', status: 'filled' },
          { id: 'passportNumber', status: 'filled' },
        ],
      });

      const result = formFiller.parseFillResult(payload);
      expect(result).not.toBeNull();
      expect(result!.filled).toBe(3);
      expect(result!.total).toBe(3);
      expect(result!.fillRate).toBeCloseTo(1.0);
      expect(result!.results).toHaveLength(3);
      expect(result!.results.every((r) => r.status === 'filled')).toBe(true);
    });

    it('parses a mixed filled/failed/skipped/not_found result', () => {
      const payload = makeAutoFillResult({
        filled: 2,
        failed: 1,
        total: 4,
        results: [
          { id: 'surname', status: 'filled' },
          { id: 'givenNames', status: 'filled' },
          { id: 'dateOfBirth', status: 'failed' },
          { id: 'nationality', status: 'not_found' },
        ],
      });

      const result = formFiller.parseFillResult(payload);
      expect(result).not.toBeNull();
      expect(result!.filled).toBe(2);
      expect(result!.total).toBe(4);
      expect(result!.fillRate).toBeCloseTo(0.5);

      const statuses = result!.results.map((r) => r.status);
      expect(statuses).toContain('filled');
      expect(statuses).toContain('failed');
      expect(statuses).toContain('not_found');
    });

    it('parses a result where some fields are skipped (already had values)', () => {
      const payload = makeAutoFillResult({
        filled: 1,
        failed: 0,
        total: 3,
        results: [
          { id: 'surname', status: 'filled' },
          { id: 'givenNames', status: 'skipped' },
          { id: 'passportNumber', status: 'skipped' },
        ],
      });

      const result = formFiller.parseFillResult(payload);
      expect(result).not.toBeNull();
      expect(result!.results.filter((r) => r.status === 'skipped')).toHaveLength(2);
    });

    it('calculates fillRate = filled / total', () => {
      const payload = makeAutoFillResult({ filled: 7, failed: 3, total: 10 });
      const result = formFiller.parseFillResult(payload);
      expect(result!.fillRate).toBeCloseTo(0.7);
    });

    it('returns fillRate = 0 when total = 0', () => {
      const payload = makeAutoFillResult({ filled: 0, failed: 0, total: 0 });
      const result = formFiller.parseFillResult(payload);
      expect(result!.fillRate).toBe(0);
    });

    it('defaults unknown status values to "failed"', () => {
      const payload = JSON.stringify({
        type: 'AUTO_FILL_RESULT',
        filled: 0,
        failed: 1,
        total: 1,
        results: [{ id: 'someField', status: 'unexpected_status' }],
      });
      const result = formFiller.parseFillResult(payload);
      expect(result).not.toBeNull();
      expect(result!.results[0].status).toBe('failed');
    });
  });

  describe('QR_PAGE_DETECTED payloads', () => {
    it('returns null for QR_PAGE_DETECTED message', () => {
      const payload = JSON.stringify({ type: 'QR_PAGE_DETECTED', url: 'https://example.com/qr' });
      const result = formFiller.parseFillResult(payload);
      expect(result).toBeNull();
    });

    it('returns null for any non-AUTO_FILL_RESULT type', () => {
      const types = ['QR_PAGE_DETECTED', 'PAGE_LOADED', 'FORM_ERROR', 'SESSION_EXPIRED'];
      for (const type of types) {
        const payload = JSON.stringify({ type });
        expect(formFiller.parseFillResult(payload)).toBeNull();
      }
    });
  });

  describe('malformed / unknown payloads', () => {
    it('returns null for plain text', () => {
      expect(formFiller.parseFillResult('hello world')).toBeNull();
    });

    it('returns null for a JSON array', () => {
      expect(formFiller.parseFillResult('[1, 2, 3]')).toBeNull();
    });

    it('returns null for a JSON number', () => {
      expect(formFiller.parseFillResult('42')).toBeNull();
    });

    it('returns null for JSON object missing type field', () => {
      expect(formFiller.parseFillResult(JSON.stringify({ filled: 2, total: 3 }))).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(formFiller.parseFillResult('')).toBeNull();
    });

    it('returns null for null JSON', () => {
      expect(formFiller.parseFillResult('null')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// isAutoFillSufficient
// ---------------------------------------------------------------------------

describe('formFiller.isAutoFillSufficient', () => {
  it('returns false for 0% fill rate', () => {
    expect(formFiller.isAutoFillSufficient(0)).toBe(false);
  });

  it('returns false for 49% fill rate (just below threshold)', () => {
    expect(formFiller.isAutoFillSufficient(0.49)).toBe(false);
  });

  it('returns true for exactly 50% fill rate (threshold)', () => {
    expect(formFiller.isAutoFillSufficient(0.5)).toBe(true);
  });

  it('returns true for 51% fill rate (just above threshold)', () => {
    expect(formFiller.isAutoFillSufficient(0.51)).toBe(true);
  });

  it('returns true for 100% fill rate', () => {
    expect(formFiller.isAutoFillSufficient(1.0)).toBe(true);
  });

  it('is consistent with parseFillResult.fillRate', () => {
    const payload = makeAutoFillResult({
      filled: 6,
      failed: 4,
      total: 10,
      results: [],
    });
    const result = formFiller.parseFillResult(payload);
    expect(formFiller.isAutoFillSufficient(result!.fillRate)).toBe(true);
  });

  it('returns false when parseFillResult fillRate is below threshold', () => {
    const payload = makeAutoFillResult({
      filled: 4,
      failed: 6,
      total: 10,
      results: [],
    });
    const result = formFiller.parseFillResult(payload);
    expect(formFiller.isAutoFillSufficient(result!.fillRate)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Round-trip: buildAutoFillScript → simulated execution → parseFillResult
// ---------------------------------------------------------------------------

describe('buildAutoFillScript → parseFillResult round-trip', () => {
  const sampleFields: FieldSpec[] = [
    { id: 'surname', selector: 'input[name="family_name"]', value: 'SMITH', inputType: 'text' },
    { id: 'givenNames', selector: 'input[name="given_name"]', value: 'JOHN', inputType: 'text' },
    {
      id: 'nationality',
      selector: 'select[name="nationality"]',
      value: 'United States',
      inputType: 'select',
    },
    { id: 'dateOfBirth', selector: 'input[name="birth_date"]', value: '1985/06/15', inputType: 'date' },
  ];

  it('generates a script that references all field ids', () => {
    const script = formFiller.buildAutoFillScript(sampleFields);
    for (const field of sampleFields) {
      expect(script).toContain(field.id);
    }
  });

  it('generated script contains AUTO_FILL_RESULT', () => {
    const script = formFiller.buildAutoFillScript(sampleFields);
    expect(script).toContain('AUTO_FILL_RESULT');
  });

  it('parseFillResult correctly parses a simulated full-success payload', () => {
    // Simulate what the WebView would post after all fields are filled
    const simulatedPayload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: sampleFields.length,
      failed: 0,
      total: sampleFields.length,
      results: sampleFields.map((f) => ({ id: f.id, status: 'filled' })),
    });

    const result = formFiller.parseFillResult(simulatedPayload);
    expect(result).not.toBeNull();
    expect(result!.filled).toBe(sampleFields.length);
    expect(result!.total).toBe(sampleFields.length);
    expect(result!.fillRate).toBeCloseTo(1.0);
    expect(formFiller.isAutoFillSufficient(result!.fillRate)).toBe(true);
  });

  it('parseFillResult correctly parses a simulated partial-success payload', () => {
    const simulatedPayload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 2,
      failed: 2,
      total: sampleFields.length,
      results: [
        { id: 'surname', status: 'filled' },
        { id: 'givenNames', status: 'filled' },
        { id: 'nationality', status: 'not_found' },
        { id: 'dateOfBirth', status: 'failed' },
      ],
    });

    const result = formFiller.parseFillResult(simulatedPayload);
    expect(result).not.toBeNull();
    expect(result!.fillRate).toBeCloseTo(0.5);
    expect(formFiller.isAutoFillSufficient(result!.fillRate)).toBe(true);
  });

  it('singleton formFiller and new FormFiller() produce the same script', () => {
    const instanceFiller = new FormFiller();
    const script1 = formFiller.buildAutoFillScript(sampleFields);
    const script2 = instanceFiller.buildAutoFillScript(sampleFields);
    expect(script1).toBe(script2);
  });
});
