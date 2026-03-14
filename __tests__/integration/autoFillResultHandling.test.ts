/**
 * Integration tests for auto-fill result parsing.
 *
 * Simulates WebView postMessage payloads and verifies that FormFiller correctly
 * parses AUTO_FILL_RESULT and QR_PAGE_DETECTED messages.
 */

import { FormFiller, formFiller, FieldSpec, FillResult } from '../../src/services/submission/formFiller';

// ---------------------------------------------------------------------------
// parseFillResult — all field statuses
// ---------------------------------------------------------------------------

describe('FormFiller.parseFillResult', () => {
  let filler: FormFiller;

  beforeEach(() => {
    filler = new FormFiller();
  });

  it('parses a valid AUTO_FILL_RESULT with all field statuses', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 2,
      failed: 1,
      total: 4,
      results: [
        { id: 'surname', status: 'filled' },
        { id: 'givenNames', status: 'filled' },
        { id: 'dateOfBirth', status: 'failed' },
        { id: 'nationality', status: 'skipped' },
      ],
    });

    const result = filler.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.filled).toBe(2);
    expect(result!.total).toBe(4);
    expect(result!.fillRate).toBeCloseTo(0.5);
    expect(result!.results).toHaveLength(4);
  });

  it('returns a result with status "filled"', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 1,
      failed: 0,
      total: 1,
      results: [{ id: 'surname', status: 'filled' }],
    });
    const result = filler.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.results[0].status).toBe('filled');
  });

  it('returns a result with status "failed"', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 0,
      failed: 1,
      total: 1,
      results: [{ id: 'passportNumber', status: 'failed' }],
    });
    const result = filler.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.results[0].status).toBe('failed');
  });

  it('returns a result with status "skipped"', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 0,
      failed: 0,
      total: 1,
      results: [{ id: 'gender', status: 'skipped' }],
    });
    const result = filler.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.results[0].status).toBe('skipped');
  });

  it('returns a result with status "not_found"', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 0,
      failed: 1,
      total: 1,
      results: [{ id: 'flightNumber', status: 'not_found' }],
    });
    const result = filler.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.results[0].status).toBe('not_found');
  });

  it('calculates fillRate correctly', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 3,
      failed: 1,
      total: 4,
      results: [
        { id: 'a', status: 'filled' },
        { id: 'b', status: 'filled' },
        { id: 'c', status: 'filled' },
        { id: 'd', status: 'failed' },
      ],
    });
    const result = filler.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.fillRate).toBeCloseTo(0.75);
  });

  it('returns fillRate of 0 when total is 0', () => {
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
  });

  // QR_PAGE_DETECTED should return null (wrong type)
  it('returns null for QR_PAGE_DETECTED payload', () => {
    const payload = JSON.stringify({
      type: 'QR_PAGE_DETECTED',
      url: 'https://vjw-lp.digital.go.jp/en/qr',
      qrData: 'some-qr-data',
    });
    const result = filler.parseFillResult(payload);
    expect(result).toBeNull();
  });

  it('returns null for unknown message type', () => {
    const payload = JSON.stringify({
      type: 'PAGE_LOAD',
      url: 'https://example.com',
    });
    const result = filler.parseFillResult(payload);
    expect(result).toBeNull();
  });

  it('returns null for plain text (non-JSON)', () => {
    const result = filler.parseFillResult('not json at all');
    expect(result).toBeNull();
  });

  it('returns null for a JSON array', () => {
    const result = filler.parseFillResult(JSON.stringify([1, 2, 3]));
    expect(result).toBeNull();
  });

  it('returns null for a JSON number', () => {
    const result = filler.parseFillResult(JSON.stringify(42));
    expect(result).toBeNull();
  });

  it('returns null when type field is missing', () => {
    const payload = JSON.stringify({ filled: 1, total: 1, results: [] });
    const result = filler.parseFillResult(payload);
    expect(result).toBeNull();
  });

  it('handles missing results array gracefully', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 1,
      failed: 0,
      total: 1,
    });
    const result = filler.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.results).toHaveLength(0);
  });

  it('normalises unknown status values to "failed"', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 0,
      failed: 1,
      total: 1,
      results: [{ id: 'x', status: 'unknown_status' }],
    });
    const result = filler.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.results[0].status).toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// isAutoFillSufficient — threshold boundary conditions
// ---------------------------------------------------------------------------

describe('FormFiller.isAutoFillSufficient', () => {
  let filler: FormFiller;

  beforeEach(() => {
    filler = new FormFiller();
  });

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
    expect(filler.isAutoFillSufficient(1.0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

describe('formFiller singleton', () => {
  it('is an instance of FormFiller', () => {
    expect(formFiller).toBeInstanceOf(FormFiller);
  });

  it('produces the same result as a new instance', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 2,
      failed: 0,
      total: 2,
      results: [
        { id: 'a', status: 'filled' },
        { id: 'b', status: 'filled' },
      ],
    });

    const singletonResult = formFiller.parseFillResult(payload);
    const newResult = new FormFiller().parseFillResult(payload);

    expect(singletonResult).toEqual(newResult);
  });
});

// ---------------------------------------------------------------------------
// Round-trip: buildAutoFillScript → simulated WebView execution → parseFillResult
// ---------------------------------------------------------------------------

describe('Full round-trip: build script → parse result', () => {
  it('generates a script whose postMessage output can be parsed back', () => {
    const filler = new FormFiller();

    const specs: FieldSpec[] = [
      { id: 'surname', selector: 'input[name="family_name"]', value: 'SMITH', inputType: 'text' },
      { id: 'givenNames', selector: 'input[name="given_name"]', value: 'JOHN', inputType: 'text' },
      { id: 'gender', selector: 'select[name="sex"]', value: 'M', inputType: 'select' },
    ];

    const js = filler.buildAutoFillScript(specs);

    // Verify the script embeds the field IDs
    for (const spec of specs) {
      expect(js).toContain(spec.id);
      expect(js).toContain(spec.selector);
    }

    // Simulate what a WebView would post back after filling all fields
    const simulatedMessage: FillResult = {
      filled: 3,
      total: 3,
      fillRate: 1.0,
      results: specs.map((s) => ({ id: s.id, status: 'filled' })),
    };

    const simulatedPayload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: simulatedMessage.filled,
      failed: 0,
      total: simulatedMessage.total,
      results: simulatedMessage.results,
    });

    const parsed = filler.parseFillResult(simulatedPayload);
    expect(parsed).not.toBeNull();
    expect(parsed!.filled).toBe(3);
    expect(parsed!.total).toBe(3);
    expect(parsed!.fillRate).toBe(1.0);
    expect(parsed!.results).toHaveLength(3);
    expect(parsed!.results.every((r) => r.status === 'filled')).toBe(true);
    expect(filler.isAutoFillSufficient(parsed!.fillRate)).toBe(true);
  });

  it('correctly handles partial fill scenario', () => {
    const filler = new FormFiller();

    const specs: FieldSpec[] = [
      { id: 'surname', selector: 'input[name="family_name"]', value: 'SMITH', inputType: 'text' },
      { id: 'dateOfBirth', selector: 'input[name="dob"]', value: '1985/06/15', inputType: 'date' },
      { id: 'captchaField', selector: '#captcha-input', value: '', inputType: 'text' },
    ];

    const simulatedPayload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 1,
      failed: 1,
      total: 3,
      results: [
        { id: 'surname', status: 'filled' },
        { id: 'dateOfBirth', status: 'not_found' },
        { id: 'captchaField', status: 'skipped' },
      ],
    });

    const parsed = filler.parseFillResult(simulatedPayload);
    expect(parsed).not.toBeNull();
    expect(parsed!.filled).toBe(1);
    expect(parsed!.total).toBe(3);
    expect(parsed!.fillRate).toBeCloseTo(1 / 3);
    expect(filler.isAutoFillSufficient(parsed!.fillRate)).toBe(false);

    const statusMap = Object.fromEntries(parsed!.results.map((r) => [r.id, r.status]));
    expect(statusMap['surname']).toBe('filled');
    expect(statusMap['dateOfBirth']).toBe('not_found');
    expect(statusMap['captchaField']).toBe('skipped');
  });
});
