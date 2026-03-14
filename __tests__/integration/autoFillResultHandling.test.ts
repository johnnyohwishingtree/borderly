/**
 * Integration tests for AUTO_FILL_RESULT and QR_PAGE_DETECTED WebView message handling.
 *
 * Simulates the postMessage payloads that the government portal WebView sends back
 * to the React Native layer after the auto-fill script has run.
 *
 * Coverage:
 *  - parseFillResult: all four per-field statuses (filled / failed / skipped / not_found)
 *  - parseFillResult: QR_PAGE_DETECTED payloads (must return null — not an AUTO_FILL_RESULT)
 *  - parseFillResult: malformed / unknown payloads
 *  - isAutoFillSufficient: threshold boundary conditions
 *  - Full round-trip: script generation → simulated execution → result parsing
 */

import { formFiller, FormFiller, FieldSpec, FillResult } from '../../src/services/submission/formFiller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Serialise a postMessage payload the same way the WebView script does. */
function makeMessage(payload: Record<string, unknown>): string {
  return JSON.stringify(payload);
}

/** Build a minimal AUTO_FILL_RESULT payload. */
function makeAutoFillResult(opts: {
  filled: number;
  failed?: number;
  total: number;
  results: Array<{ id: string; status: string }>;
}): string {
  return makeMessage({
    type: 'AUTO_FILL_RESULT',
    filled: opts.filled,
    failed: opts.failed ?? opts.total - opts.filled,
    total: opts.total,
    results: opts.results,
  });
}

// ---------------------------------------------------------------------------
// parseFillResult — AUTO_FILL_RESULT payloads
// ---------------------------------------------------------------------------

describe('autoFillResultHandling — parseFillResult', () => {
  let filler: FormFiller;

  beforeEach(() => {
    filler = new FormFiller();
  });

  describe('well-formed AUTO_FILL_RESULT messages', () => {
    it('parses a perfect-fill result (all fields filled)', () => {
      const msg = makeAutoFillResult({
        filled: 5,
        total: 5,
        results: [
          { id: 'surname', status: 'filled' },
          { id: 'givenNames', status: 'filled' },
          { id: 'passportNumber', status: 'filled' },
          { id: 'dateOfBirth', status: 'filled' },
          { id: 'nationality', status: 'filled' },
        ],
      });

      const result = filler.parseFillResult(msg);
      expect(result).not.toBeNull();
      expect(result!.filled).toBe(5);
      expect(result!.total).toBe(5);
      expect(result!.fillRate).toBe(1.0);
      expect(result!.results).toHaveLength(5);
      result!.results.forEach((r) => expect(r.status).toBe('filled'));
    });

    it('parses a partial-fill result with mixed statuses', () => {
      const msg = makeAutoFillResult({
        filled: 3,
        failed: 1,
        total: 5,
        results: [
          { id: 'surname', status: 'filled' },
          { id: 'givenNames', status: 'filled' },
          { id: 'passportNumber', status: 'filled' },
          { id: 'nationality', status: 'not_found' },
          { id: 'dateOfBirth', status: 'skipped' },
        ],
      });

      const result = filler.parseFillResult(msg);
      expect(result).not.toBeNull();
      expect(result!.filled).toBe(3);
      expect(result!.total).toBe(5);
      expect(result!.fillRate).toBeCloseTo(0.6);
    });

    it('parses all four field statuses correctly', () => {
      const msg = makeAutoFillResult({
        filled: 1,
        failed: 1,
        total: 4,
        results: [
          { id: 'a', status: 'filled' },
          { id: 'b', status: 'failed' },
          { id: 'c', status: 'not_found' },
          { id: 'd', status: 'skipped' },
        ],
      });

      const result = filler.parseFillResult(msg)!;
      expect(result).not.toBeNull();

      const byId = Object.fromEntries(result.results.map((r) => [r.id, r.status]));
      expect(byId['a']).toBe('filled');
      expect(byId['b']).toBe('failed');
      expect(byId['c']).toBe('not_found');
      expect(byId['d']).toBe('skipped');
    });

    it('computes fillRate as 0 when total is 0', () => {
      const msg = makeMessage({
        type: 'AUTO_FILL_RESULT',
        filled: 0,
        failed: 0,
        total: 0,
        results: [],
      });
      const result = filler.parseFillResult(msg);
      expect(result!.fillRate).toBe(0);
    });

    it('handles result entries with an invalid status by defaulting to "failed"', () => {
      const msg = makeMessage({
        type: 'AUTO_FILL_RESULT',
        filled: 0,
        failed: 1,
        total: 1,
        results: [{ id: 'x', status: 'UNKNOWN_STATUS' }],
      });
      const result = filler.parseFillResult(msg)!;
      expect(result.results[0].status).toBe('failed');
    });

    it('handles missing results array gracefully', () => {
      const msg = makeMessage({
        type: 'AUTO_FILL_RESULT',
        filled: 0,
        failed: 0,
        total: 0,
        // no results key
      });
      const result = filler.parseFillResult(msg);
      expect(result).not.toBeNull();
      expect(result!.results).toEqual([]);
    });

    it('handles non-numeric filled/total values (treats as 0)', () => {
      const msg = makeMessage({
        type: 'AUTO_FILL_RESULT',
        filled: 'two',
        total: 'five',
        results: [],
      });
      const result = filler.parseFillResult(msg);
      expect(result).not.toBeNull();
      expect(result!.filled).toBe(0);
      expect(result!.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // QR_PAGE_DETECTED messages
  // -------------------------------------------------------------------------

  describe('QR_PAGE_DETECTED payloads', () => {
    it('returns null — QR_PAGE_DETECTED is not an AUTO_FILL_RESULT', () => {
      const msg = makeMessage({
        type: 'QR_PAGE_DETECTED',
        qrUrl: 'data:image/png;base64,abc123',
        pageUrl: 'https://vjw-lp.digital.go.jp/en/confirmation',
      });
      expect(filler.parseFillResult(msg)).toBeNull();
    });

    it('returns null for QR_PAGE_DETECTED with no URL', () => {
      const msg = makeMessage({ type: 'QR_PAGE_DETECTED' });
      expect(filler.parseFillResult(msg)).toBeNull();
    });

    it('returns null for QR_PAGE_DETECTED with extra fields', () => {
      const msg = makeMessage({
        type: 'QR_PAGE_DETECTED',
        filled: 10, // these look like AUTO_FILL_RESULT fields but type is wrong
        total: 10,
        results: [],
      });
      expect(filler.parseFillResult(msg)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Unknown / malformed messages
  // -------------------------------------------------------------------------

  describe('unknown and malformed messages', () => {
    it('returns null for an unknown type field', () => {
      expect(
        filler.parseFillResult(makeMessage({ type: 'SCRIPT_RESULT', result: 42 })),
      ).toBeNull();
    });

    it('returns null for plain text (non-JSON)', () => {
      expect(filler.parseFillResult('not json at all')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(filler.parseFillResult('')).toBeNull();
    });

    it('returns null for a JSON object without a type field', () => {
      expect(filler.parseFillResult(makeMessage({ filled: 3, total: 4 }))).toBeNull();
    });

    it('returns null for null literal', () => {
      expect(filler.parseFillResult('null')).toBeNull();
    });

    it('returns null for a JSON array', () => {
      expect(filler.parseFillResult('[]')).toBeNull();
    });

    it('returns null for a JSON number', () => {
      expect(filler.parseFillResult('42')).toBeNull();
    });

    it('returns null for NAVIGATION_EVENT type', () => {
      const msg = makeMessage({ type: 'NAVIGATION_EVENT', url: 'https://example.gov/next-page' });
      expect(filler.parseFillResult(msg)).toBeNull();
    });

    it('returns null for FORM_ERROR type', () => {
      const msg = makeMessage({ type: 'FORM_ERROR', message: 'Required field missing' });
      expect(filler.parseFillResult(msg)).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// isAutoFillSufficient — threshold boundary conditions
// ---------------------------------------------------------------------------

describe('autoFillResultHandling — isAutoFillSufficient', () => {
  let filler: FormFiller;

  beforeEach(() => {
    filler = new FormFiller();
  });

  it('returns false for 0% fill rate', () => {
    expect(filler.isAutoFillSufficient(0)).toBe(false);
  });

  it('returns false for fill rate just below 50% (0.49)', () => {
    expect(filler.isAutoFillSufficient(0.49)).toBe(false);
  });

  it('returns true at exactly 50% (threshold boundary)', () => {
    expect(filler.isAutoFillSufficient(0.5)).toBe(true);
  });

  it('returns true for fill rate just above 50% (0.51)', () => {
    expect(filler.isAutoFillSufficient(0.51)).toBe(true);
  });

  it('returns true for 75% fill rate', () => {
    expect(filler.isAutoFillSufficient(0.75)).toBe(true);
  });

  it('returns true for 100% fill rate', () => {
    expect(filler.isAutoFillSufficient(1.0)).toBe(true);
  });

  it('agrees with the parsed fillRate from a sufficient result', () => {
    const msg = makeAutoFillResult({
      filled: 4,
      total: 5,
      results: [
        { id: 'a', status: 'filled' },
        { id: 'b', status: 'filled' },
        { id: 'c', status: 'filled' },
        { id: 'd', status: 'filled' },
        { id: 'e', status: 'not_found' },
      ],
    });
    const result = filler.parseFillResult(msg)!;
    expect(filler.isAutoFillSufficient(result.fillRate)).toBe(true);
  });

  it('agrees with the parsed fillRate from an insufficient result', () => {
    const msg = makeAutoFillResult({
      filled: 2,
      total: 10,
      results: Array.from({ length: 10 }, (_, i) => ({
        id: `f${i}`,
        status: i < 2 ? 'filled' : 'not_found',
      })),
    });
    const result = filler.parseFillResult(msg)!;
    expect(filler.isAutoFillSufficient(result.fillRate)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Round-trip integration: script content → simulated execution → result parsing
// ---------------------------------------------------------------------------

describe('autoFillResultHandling — round-trip simulation', () => {
  it('buildAutoFillScript → simulate execution → parseFillResult', () => {
    const fields: FieldSpec[] = [
      {
        id: 'surname',
        selector: 'input[name="family_name"]',
        value: 'SMITH',
        inputType: 'text',
      },
      {
        id: 'givenNames',
        selector: 'input[name="given_name"]',
        value: 'JOHN MICHAEL',
        inputType: 'text',
      },
      {
        id: 'passportNumber',
        selector: 'input[name="passport_no"]',
        value: 'L12345678',
        inputType: 'text',
      },
    ];

    // 1. Build the script
    const script = formFiller.buildAutoFillScript(fields);
    expect(script).toContain('AUTO_FILL_RESULT');

    // 2. Simulate what the WebView script would post back (all filled)
    const simulatedPayload = makeMessage({
      type: 'AUTO_FILL_RESULT',
      filled: 3,
      failed: 0,
      total: 3,
      results: fields.map((f) => ({ id: f.id, status: 'filled' })),
    });

    // 3. Parse the result
    const result = formFiller.parseFillResult(simulatedPayload);
    expect(result).not.toBeNull();
    expect(result!.filled).toBe(3);
    expect(result!.total).toBe(3);
    expect(result!.fillRate).toBe(1.0);
    expect(formFiller.isAutoFillSufficient(result!.fillRate)).toBe(true);
  });

  it('builds script for a failed fill and parseFillResult reports insufficient', () => {
    const fields: FieldSpec[] = [
      { id: 'cityOfBirth', selector: '#cityOfBirth', value: 'New York', inputType: 'text' },
      { id: 'occupation', selector: '#occupation', value: 'Software Engineer', inputType: 'text' },
    ];

    const script = formFiller.buildAutoFillScript(fields);
    expect(script).toBeTruthy();

    // Simulate all fields not found
    const payload = makeMessage({
      type: 'AUTO_FILL_RESULT',
      filled: 0,
      failed: 2,
      total: 2,
      results: fields.map((f) => ({ id: f.id, status: 'not_found' })),
    });

    const result = formFiller.parseFillResult(payload)!;
    expect(result.fillRate).toBe(0);
    expect(formFiller.isAutoFillSufficient(result.fillRate)).toBe(false);
  });

  it('singleton formFiller instance behaves identically to a new FormFiller', () => {
    const msg = makeAutoFillResult({
      filled: 1,
      total: 1,
      results: [{ id: 'test', status: 'filled' }],
    });

    const fromSingleton = formFiller.parseFillResult(msg);
    const fromNew = new FormFiller().parseFillResult(msg);

    expect(fromSingleton).toEqual(fromNew);
  });
});

// ---------------------------------------------------------------------------
// Type-level assertion: FillResult shape
// ---------------------------------------------------------------------------

describe('autoFillResultHandling — FillResult shape', () => {
  it('result has required fields: filled, total, fillRate, results', () => {
    const msg = makeAutoFillResult({
      filled: 2,
      total: 3,
      results: [
        { id: 'a', status: 'filled' },
        { id: 'b', status: 'filled' },
        { id: 'c', status: 'skipped' },
      ],
    });

    const result: FillResult = formFiller.parseFillResult(msg)!;
    expect(typeof result.filled).toBe('number');
    expect(typeof result.total).toBe('number');
    expect(typeof result.fillRate).toBe('number');
    expect(Array.isArray(result.results)).toBe(true);
    result.results.forEach((r) => {
      expect(typeof r.id).toBe('string');
      expect(['filled', 'failed', 'not_found', 'skipped']).toContain(r.status);
    });
  });
});
