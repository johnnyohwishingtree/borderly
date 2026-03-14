/**
 * Integration tests for auto-fill result handling.
 *
 * Tests the parsing of WebView postMessage payloads and the threshold logic
 * for determining whether auto-fill was sufficiently successful.
 */

import { formFiller, FieldSpec, FillResult } from '../../src/services/submission/formFiller';

// ---------------------------------------------------------------------------
// parseFillResult — AUTO_FILL_RESULT payloads
// ---------------------------------------------------------------------------

describe('parseFillResult — AUTO_FILL_RESULT payloads', () => {
  it('parses a payload where all fields are filled', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 5,
      failed: 0,
      total: 5,
      results: [
        { id: 'surname', status: 'filled' },
        { id: 'givenNames', status: 'filled' },
        { id: 'dateOfBirth', status: 'filled' },
        { id: 'passportNumber', status: 'filled' },
        { id: 'nationality', status: 'filled' },
      ],
    });

    const result = formFiller.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.filled).toBe(5);
    expect(result!.total).toBe(5);
    expect(result!.fillRate).toBe(1);
    expect(result!.results).toHaveLength(5);
    expect(result!.results.every((r) => r.status === 'filled')).toBe(true);
  });

  it('parses a payload where some fields failed', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 3,
      failed: 2,
      total: 5,
      results: [
        { id: 'surname', status: 'filled' },
        { id: 'givenNames', status: 'filled' },
        { id: 'dateOfBirth', status: 'filled' },
        { id: 'passportNumber', status: 'failed' },
        { id: 'nationality', status: 'failed' },
      ],
    });

    const result = formFiller.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.filled).toBe(3);
    expect(result!.total).toBe(5);
    expect(result!.fillRate).toBeCloseTo(0.6);
    expect(result!.results.filter((r) => r.status === 'failed')).toHaveLength(2);
  });

  it('parses a payload with skipped fields (already had values)', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 2,
      failed: 0,
      total: 4,
      results: [
        { id: 'surname', status: 'filled' },
        { id: 'givenNames', status: 'filled' },
        { id: 'dateOfBirth', status: 'skipped' },
        { id: 'passportNumber', status: 'skipped' },
      ],
    });

    const result = formFiller.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.results.filter((r) => r.status === 'skipped')).toHaveLength(2);
    expect(result!.results.filter((r) => r.status === 'filled')).toHaveLength(2);
  });

  it('parses a payload with not_found fields (selectors did not match)', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 1,
      failed: 0,
      total: 3,
      results: [
        { id: 'surname', status: 'filled' },
        { id: 'givenNames', status: 'not_found' },
        { id: 'dateOfBirth', status: 'not_found' },
      ],
    });

    const result = formFiller.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.results.filter((r) => r.status === 'not_found')).toHaveLength(2);
  });

  it('parses a payload where all fields have zero total', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 0,
      failed: 0,
      total: 0,
      results: [],
    });

    const result = formFiller.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.filled).toBe(0);
    expect(result!.total).toBe(0);
    expect(result!.fillRate).toBe(0);
    expect(result!.results).toHaveLength(0);
  });

  it('fillRate is calculated as filled/total', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 7,
      failed: 3,
      total: 10,
      results: [],
    });

    const result = formFiller.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.fillRate).toBeCloseTo(0.7);
  });

  it('coerces invalid status values to "failed"', () => {
    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 0,
      failed: 1,
      total: 1,
      results: [{ id: 'someField', status: 'INVALID_STATUS' }],
    });

    const result = formFiller.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.results[0].status).toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// parseFillResult — non-AUTO_FILL_RESULT payloads return null
// ---------------------------------------------------------------------------

describe('parseFillResult — non-AUTO_FILL_RESULT payloads', () => {
  it('returns null for QR_PAGE_DETECTED payload', () => {
    const payload = JSON.stringify({
      type: 'QR_PAGE_DETECTED',
      url: 'https://vjw-lp.digital.go.jp/qr/download',
      qrCodeUrl: 'https://vjw-lp.digital.go.jp/qr/abc123',
    });

    const result = formFiller.parseFillResult(payload);
    expect(result).toBeNull();
  });

  it('returns null for unknown message type', () => {
    const payload = JSON.stringify({
      type: 'UNKNOWN_MESSAGE_TYPE',
      data: 'some data',
    });

    const result = formFiller.parseFillResult(payload);
    expect(result).toBeNull();
  });

  it('returns null for plain text (non-JSON)', () => {
    const result = formFiller.parseFillResult('not valid json {');
    expect(result).toBeNull();
  });

  it('returns null for a JSON array (not an object)', () => {
    const result = formFiller.parseFillResult('["item1", "item2"]');
    expect(result).toBeNull();
  });

  it('returns null for a JSON number', () => {
    const result = formFiller.parseFillResult('42');
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    const result = formFiller.parseFillResult('');
    expect(result).toBeNull();
  });

  it('returns null for a JSON object missing the type field', () => {
    const payload = JSON.stringify({ filled: 3, total: 5 });
    const result = formFiller.parseFillResult(payload);
    expect(result).toBeNull();
  });

  it('returns null for a JSON object with type=null', () => {
    const payload = JSON.stringify({ type: null, filled: 3, total: 5 });
    const result = formFiller.parseFillResult(payload);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isAutoFillSufficient — threshold logic
// ---------------------------------------------------------------------------

describe('isAutoFillSufficient', () => {
  it('returns false for 0% fill rate', () => {
    expect(formFiller.isAutoFillSufficient(0)).toBe(false);
  });

  it('returns false for below 50% fill rate', () => {
    expect(formFiller.isAutoFillSufficient(0.49)).toBe(false);
  });

  it('returns true at exactly 50% fill rate', () => {
    expect(formFiller.isAutoFillSufficient(0.5)).toBe(true);
  });

  it('returns true above 50% fill rate', () => {
    expect(formFiller.isAutoFillSufficient(0.51)).toBe(true);
  });

  it('returns true for 100% fill rate', () => {
    expect(formFiller.isAutoFillSufficient(1.0)).toBe(true);
  });

  it('returns false for negative fill rate', () => {
    expect(formFiller.isAutoFillSufficient(-0.1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Round-trip: buildAutoFillScript → parseFillResult
// ---------------------------------------------------------------------------

describe('buildAutoFillScript → parseFillResult round-trip', () => {
  it('the generated script structure matches what parseFillResult expects', () => {
    const fieldSpecs: FieldSpec[] = [
      { id: 'surname', selector: 'input[name="surname"]', value: 'SMITH', inputType: 'text' },
      { id: 'givenNames', selector: 'input[name="given_name"]', value: 'JOHN', inputType: 'text' },
    ];

    const js = formFiller.buildAutoFillScript(fieldSpecs);

    // The script sends postMessage with AUTO_FILL_RESULT
    expect(js).toContain('"AUTO_FILL_RESULT"');
    expect(js).toContain('filled:filled');
    expect(js).toContain('total:fields.length');

    // A simulated postMessage result (as if the WebView executed the script and 2 fields filled)
    const simulatedResult = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 2,
      failed: 0,
      total: 2,
      results: [
        { id: 'surname', status: 'filled' },
        { id: 'givenNames', status: 'filled' },
      ],
    });

    const parsed = formFiller.parseFillResult(simulatedResult);
    expect(parsed).not.toBeNull();
    expect(parsed!.filled).toBe(2);
    expect(parsed!.total).toBe(2);
    expect(parsed!.fillRate).toBe(1);
    expect(formFiller.isAutoFillSufficient(parsed!.fillRate)).toBe(true);
  });

  it('all 4 result statuses are correctly preserved through parsing', () => {
    const statuses: FillResult['results'][number]['status'][] = [
      'filled',
      'failed',
      'skipped',
      'not_found',
    ];

    const payload = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 1,
      failed: 3,
      total: 4,
      results: statuses.map((status) => ({ id: `field_${status}`, status })),
    });

    const result = formFiller.parseFillResult(payload);
    expect(result).not.toBeNull();
    expect(result!.results).toHaveLength(4);

    statuses.forEach((expectedStatus) => {
      const item = result!.results.find((r) => r.id === `field_${expectedStatus}`);
      expect(item?.status).toBe(expectedStatus);
    });
  });
});
