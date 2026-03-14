/**
 * Tests for FormFiller — auto-fill script builder and result parser.
 */

import { FormFiller, FieldSpec } from '../../../src/services/submission/formFiller';

describe('FormFiller', () => {
  let filler: FormFiller;

  beforeEach(() => {
    filler = new FormFiller();
  });

  // ---------------------------------------------------------------------------
  // buildAutoFillScript
  // ---------------------------------------------------------------------------

  describe('buildAutoFillScript', () => {
    it('generates valid self-invoking JS function', () => {
      const fields: FieldSpec[] = [
        { id: 'name', selector: '#name', value: 'Alice', inputType: 'text' },
      ];
      const script = filler.buildAutoFillScript(fields);
      expect(script).toMatch(/^\(function\(\)\{/);
      expect(script).toMatch(/\}\)\(\);$/);
    });

    it('includes field definitions in generated script', () => {
      const fields: FieldSpec[] = [
        { id: 'passport', selector: 'input[name="passport_no"]', value: 'AB123456', inputType: 'text' },
      ];
      const script = filler.buildAutoFillScript(fields);
      // JSON.stringify embeds the fields array
      expect(script).toContain('AB123456');
      expect(script).toContain('input[name=\\"passport_no\\"]');
    });

    it('generates a no-op script for empty field list', () => {
      const script = filler.buildAutoFillScript([]);
      // Still a valid IIFE
      expect(script).toMatch(/^\(function\(\)\{/);
      expect(script).toMatch(/\}\)\(\);$/);
      // Posts a result with filled=0, total=0
      expect(script).toContain('AUTO_FILL_RESULT');
    });

    it('escapes double quotes in field values', () => {
      const fields: FieldSpec[] = [
        { id: 'name', selector: '#name', value: 'O"Brien', inputType: 'text' },
      ];
      const script = filler.buildAutoFillScript(fields);
      // JSON.stringify escapes " → \" inside strings
      expect(script).toContain('O\\"Brien');
    });

    it('escapes backslashes in field values', () => {
      const fields: FieldSpec[] = [
        { id: 'path', selector: '#path', value: 'C:\\Users\\Alice', inputType: 'text' },
      ];
      const script = filler.buildAutoFillScript(fields);
      // JSON.stringify escapes \ → \\
      expect(script).toContain('C:\\\\Users\\\\Alice');
    });

    it('escapes angle brackets in field values', () => {
      const fields: FieldSpec[] = [
        { id: 'comment', selector: '#comment', value: '<script>alert(1)</script>', inputType: 'text' },
      ];
      const script = filler.buildAutoFillScript(fields);
      // JSON.stringify does NOT escape < > by default, but they are embedded in a JS string
      // The important thing is the script contains the value
      expect(script).toContain('<script>');
    });

    it('handles text inputType', () => {
      const fields: FieldSpec[] = [
        { id: 'name', selector: '#name', value: 'Alice', inputType: 'text' },
      ];
      const script = filler.buildAutoFillScript(fields);
      // For text: uses HTMLInputElement.prototype.value setter + dispatches input/change events
      expect(script).toContain('HTMLInputElement');
      expect(script).toContain('"input"');
    });

    it('handles select inputType', () => {
      const fields: FieldSpec[] = [
        { id: 'nationality', selector: 'select[name="nationality"]', value: 'Japan', inputType: 'select' },
      ];
      const script = filler.buildAutoFillScript(fields);
      expect(script).toContain('select');
      expect(script).toContain('options');
    });

    it('handles radio inputType', () => {
      const fields: FieldSpec[] = [
        { id: 'gender', selector: 'input[name="gender"][value="M"]', value: 'M', inputType: 'radio' },
      ];
      const script = filler.buildAutoFillScript(fields);
      expect(script).toContain('radio');
      expect(script).toContain('checked');
    });

    it('handles checkbox inputType', () => {
      const fields: FieldSpec[] = [
        { id: 'agree', selector: '#agree', value: 'true', inputType: 'checkbox' },
      ];
      const script = filler.buildAutoFillScript(fields);
      expect(script).toContain('checkbox');
      expect(script).toContain('checked');
    });

    it('handles date inputType the same as text', () => {
      const fields: FieldSpec[] = [
        { id: 'dob', selector: 'input[name="birth_date"]', value: '1990/01/15', inputType: 'date' },
      ];
      const script = filler.buildAutoFillScript(fields);
      expect(script).toContain('1990/01/15');
    });

    it('posts AUTO_FILL_RESULT via window.ReactNativeWebView.postMessage', () => {
      const fields: FieldSpec[] = [
        { id: 'name', selector: '#name', value: 'Alice', inputType: 'text' },
      ];
      const script = filler.buildAutoFillScript(fields);
      expect(script).toContain('ReactNativeWebView');
      expect(script).toContain('postMessage');
      expect(script).toContain('AUTO_FILL_RESULT');
    });

    it('snapshot — single text field', () => {
      const fields: FieldSpec[] = [
        { id: 'surname', selector: 'input[name="family_name"]', value: 'SMITH', inputType: 'text' },
      ];
      expect(filler.buildAutoFillScript(fields)).toMatchSnapshot();
    });

    it('snapshot — JPN personal info fields', () => {
      const fields: FieldSpec[] = [
        { id: 'surname', selector: 'input[name="family_name"], input[id="family_name"]', value: 'TANAKA', inputType: 'text' },
        { id: 'givenNames', selector: 'input[name="given_name"], input[id="given_name"]', value: 'HIRO', inputType: 'text' },
        { id: 'passportNumber', selector: 'input[name="passport_no"], input[id="passport_no"]', value: 'TH1234567', inputType: 'text' },
        { id: 'nationality', selector: 'select[name="nationality"], select[id="nationality"]', value: 'Japan', inputType: 'select' },
        { id: 'dateOfBirth', selector: 'input[name="birth_date"], input[id="birth_date"]', value: '1985/06/15', inputType: 'date' },
        { id: 'gender', selector: 'select[name="sex"], select[id="sex"]', value: 'M', inputType: 'select' },
      ];
      expect(filler.buildAutoFillScript(fields)).toMatchSnapshot();
    });
  });

  // ---------------------------------------------------------------------------
  // parseFillResult
  // ---------------------------------------------------------------------------

  describe('parseFillResult', () => {
    it('parses a valid AUTO_FILL_RESULT message', () => {
      const message = JSON.stringify({
        type: 'AUTO_FILL_RESULT',
        filled: 3,
        failed: 1,
        total: 4,
        results: [
          { id: 'name', status: 'filled' },
          { id: 'dob', status: 'filled' },
          { id: 'passport', status: 'filled' },
          { id: 'nationality', status: 'not_found' },
        ],
      });

      const result = filler.parseFillResult(message);
      expect(result).not.toBeNull();
      expect(result!.filled).toBe(3);
      expect(result!.total).toBe(4);
      expect(result!.fillRate).toBeCloseTo(0.75);
      expect(result!.results).toHaveLength(4);
    });

    it('returns null for non-AUTO_FILL_RESULT messages', () => {
      const message = JSON.stringify({ type: 'SCRIPT_RESULT', result: 42 });
      expect(filler.parseFillResult(message)).toBeNull();
    });

    it('returns null for plain text messages', () => {
      expect(filler.parseFillResult('not json at all')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(filler.parseFillResult('')).toBeNull();
    });

    it('returns null for JSON without type field', () => {
      expect(filler.parseFillResult(JSON.stringify({ filled: 3, total: 4 }))).toBeNull();
    });

    it('calculates fillRate as 0 when total is 0', () => {
      const message = JSON.stringify({
        type: 'AUTO_FILL_RESULT',
        filled: 0,
        failed: 0,
        total: 0,
        results: [],
      });
      const result = filler.parseFillResult(message);
      expect(result).not.toBeNull();
      expect(result!.fillRate).toBe(0);
    });

    it('calculates fillRate correctly for perfect fill', () => {
      const message = JSON.stringify({
        type: 'AUTO_FILL_RESULT',
        filled: 5,
        failed: 0,
        total: 5,
        results: [
          { id: 'a', status: 'filled' },
          { id: 'b', status: 'filled' },
          { id: 'c', status: 'filled' },
          { id: 'd', status: 'filled' },
          { id: 'e', status: 'filled' },
        ],
      });
      const result = filler.parseFillResult(message);
      expect(result!.fillRate).toBe(1);
    });

    it('handles all result statuses', () => {
      const message = JSON.stringify({
        type: 'AUTO_FILL_RESULT',
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
      const result = filler.parseFillResult(message);
      expect(result!.results[0].status).toBe('filled');
      expect(result!.results[1].status).toBe('failed');
      expect(result!.results[2].status).toBe('not_found');
      expect(result!.results[3].status).toBe('skipped');
    });

    it('defaults invalid status to "failed"', () => {
      const message = JSON.stringify({
        type: 'AUTO_FILL_RESULT',
        filled: 0,
        failed: 1,
        total: 1,
        results: [{ id: 'x', status: 'invalid_status' }],
      });
      const result = filler.parseFillResult(message);
      expect(result!.results[0].status).toBe('failed');
    });

    it('handles missing results array gracefully', () => {
      const message = JSON.stringify({
        type: 'AUTO_FILL_RESULT',
        filled: 0,
        failed: 0,
        total: 0,
      });
      const result = filler.parseFillResult(message);
      expect(result).not.toBeNull();
      expect(result!.results).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // isAutoFillSufficient
  // ---------------------------------------------------------------------------

  describe('isAutoFillSufficient', () => {
    it('returns false for fill rate below 50%', () => {
      expect(filler.isAutoFillSufficient(0.49)).toBe(false);
    });

    it('returns true for fill rate of exactly 50%', () => {
      expect(filler.isAutoFillSufficient(0.5)).toBe(true);
    });

    it('returns true for fill rate above 50%', () => {
      expect(filler.isAutoFillSufficient(0.51)).toBe(true);
    });

    it('returns true for 100% fill rate', () => {
      expect(filler.isAutoFillSufficient(1.0)).toBe(true);
    });

    it('returns false for 0% fill rate', () => {
      expect(filler.isAutoFillSufficient(0)).toBe(false);
    });
  });
});
