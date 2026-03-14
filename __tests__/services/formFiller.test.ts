import { FormFiller } from '../../src/services/submission/formFiller';
import type { FieldSpec, FillResult } from '../../src/services/submission/formFiller';

describe('FormFiller', () => {
  let filler: FormFiller;

  beforeEach(() => {
    filler = new FormFiller();
  });

  // ─── buildAutoFillScript ───────────────────────────────────────────────────

  describe('buildAutoFillScript', () => {
    it('returns a non-empty string', () => {
      const script = filler.buildAutoFillScript([]);
      expect(typeof script).toBe('string');
      expect(script.length).toBeGreaterThan(0);
    });

    it('contains AUTO_FILL_RESULT so the result is posted back', () => {
      const script = filler.buildAutoFillScript([]);
      expect(script).toContain('AUTO_FILL_RESULT');
    });

    it('embeds field selectors and values in the script', () => {
      const fields: FieldSpec[] = [
        { id: 'firstName', selector: '#first-name', value: 'Alice', inputType: 'text' },
      ];
      const script = filler.buildAutoFillScript(fields);
      expect(script).toContain('#first-name');
      expect(script).toContain('Alice');
    });

    it('handles all 5 input types without throwing', () => {
      const fields: FieldSpec[] = [
        { id: 'f1', selector: '#text', value: 'hello', inputType: 'text' },
        { id: 'f2', selector: '#sel', value: 'opt1', inputType: 'select' },
        { id: 'f3', selector: '#rad', value: 'yes', inputType: 'radio' },
        { id: 'f4', selector: '#chk', value: 'true', inputType: 'checkbox' },
        { id: 'f5', selector: '#dob', value: '2000-01-01', inputType: 'date' },
      ];
      expect(() => filler.buildAutoFillScript(fields)).not.toThrow();
      const script = filler.buildAutoFillScript(fields);
      expect(script).toContain('select');
      expect(script).toContain('radio');
      expect(script).toContain('checkbox');
    });

    it('produces an IIFE (immediately-invoked function expression)', () => {
      const script = filler.buildAutoFillScript([]);
      expect(script).toMatch(/^\(function\(\)\{/);
      expect(script).toMatch(/\}\)\(\);$/);
    });

    it('ends with true; so it is valid for WebView injection', () => {
      const script = filler.buildAutoFillScript([]);
      expect(script.trimEnd()).toMatch(/true;\s*\}\)\(\);$/);
    });
  });

  // ─── isAutoFillSufficient ─────────────────────────────────────────────────

  describe('isAutoFillSufficient', () => {
    it('returns true when fill rate is exactly 0.5', () => {
      expect(filler.isAutoFillSufficient(0.5)).toBe(true);
    });

    it('returns true when fill rate is above 0.5', () => {
      expect(filler.isAutoFillSufficient(0.75)).toBe(true);
      expect(filler.isAutoFillSufficient(1.0)).toBe(true);
    });

    it('returns false when fill rate is below 0.5', () => {
      expect(filler.isAutoFillSufficient(0.49)).toBe(false);
      expect(filler.isAutoFillSufficient(0)).toBe(false);
    });

    it('returns false for negative fill rates (defensive)', () => {
      expect(filler.isAutoFillSufficient(-0.1)).toBe(false);
    });
  });

  // ─── parseFillResult ──────────────────────────────────────────────────────

  describe('parseFillResult', () => {
    it('parses a valid AUTO_FILL_RESULT message', () => {
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
      expect(result!.filled).toBe(3);
      expect(result!.total).toBe(4);
      expect(result!.fillRate).toBeCloseTo(0.75);
      expect(result!.results).toHaveLength(4);
    });

    it('computes fillRate of 0 when total is 0', () => {
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

    it('returns null for non-AUTO_FILL_RESULT messages', () => {
      const payload = JSON.stringify({ type: 'QR_PAGE_DETECTED', isQRPage: true });
      expect(filler.parseFillResult(payload)).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      expect(filler.parseFillResult('not json at all')).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(filler.parseFillResult('')).toBeNull();
    });

    it('handles missing selectors/mappings gracefully (empty results array)', () => {
      const payload = JSON.stringify({
        type: 'AUTO_FILL_RESULT',
        filled: 0,
        failed: 0,
        total: 0,
        results: [],
      });
      const result = filler.parseFillResult(payload);
      expect(result).not.toBeNull();
      expect(result!.results).toEqual([]);
    });

    it('reports fill-rate threshold < 50% correctly', () => {
      const payload = JSON.stringify({
        type: 'AUTO_FILL_RESULT',
        filled: 1,
        failed: 3,
        total: 4,
        results: [
          { id: 'a', status: 'filled' },
          { id: 'b', status: 'not_found' },
          { id: 'c', status: 'failed' },
          { id: 'd', status: 'failed' },
        ],
      });
      const result = filler.parseFillResult(payload) as FillResult;
      expect(result.fillRate).toBeCloseTo(0.25);
      expect(filler.isAutoFillSufficient(result.fillRate)).toBe(false);
    });

    it('handles a result where all fields are not_found', () => {
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
      const result = filler.parseFillResult(payload) as FillResult;
      expect(result.fillRate).toBe(0);
      expect(result.results.every((r) => r.status === 'not_found')).toBe(true);
    });

    it('handles a result where all fields are skipped', () => {
      const payload = JSON.stringify({
        type: 'AUTO_FILL_RESULT',
        filled: 0,
        failed: 0,
        total: 2,
        results: [
          { id: 'x', status: 'skipped' },
          { id: 'y', status: 'skipped' },
        ],
      });
      const result = filler.parseFillResult(payload) as FillResult;
      expect(result.results.every((r) => r.status === 'skipped')).toBe(true);
    });

    it('handles a thrown-error scenario (null payload)', () => {
      // Simulate a null/undefined by passing 'null' string
      expect(filler.parseFillResult('null')).toBeNull();
    });
  });
});
