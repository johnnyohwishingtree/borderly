/**
 * Tests for src/utils/colors.ts
 *
 * Covers the color constants object.
 */

import { colors } from '../../src/utils/colors';

// ---------------------------------------------------------------------------
// colors
// ---------------------------------------------------------------------------

describe('colors', () => {
  it('has a white color', () => {
    expect(colors.white).toBe('#ffffff');
  });

  describe('gray shades', () => {
    it('has gray-400', () => {
      expect(colors.gray[400]).toBe('#9ca3af');
    });

    it('has gray-500', () => {
      expect(colors.gray[500]).toBe('#6b7280');
    });

    it('has gray-600', () => {
      expect(colors.gray[600]).toBe('#4b5563');
    });

    it('gray shades get darker with higher numbers', () => {
      // Higher shade number = darker = lower hex value
      const toNum = (hex: string) => parseInt(hex.replace('#', ''), 16);
      expect(toNum(colors.gray[400])).toBeGreaterThan(toNum(colors.gray[500]));
      expect(toNum(colors.gray[500])).toBeGreaterThan(toNum(colors.gray[600]));
    });
  });

  describe('blue shades', () => {
    it('has blue-500', () => {
      expect(colors.blue[500]).toBe('#3b82f6');
    });

    it('has blue-600', () => {
      expect(colors.blue[600]).toBe('#2563eb');
    });

    it('blue-600 is darker than blue-500', () => {
      const toNum = (hex: string) => parseInt(hex.replace('#', ''), 16);
      expect(toNum(colors.blue[500])).toBeGreaterThan(toNum(colors.blue[600]));
    });
  });

  it('all color values are valid hex strings', () => {
    const hexRegex = /^#[0-9a-f]{6}$/;
    expect(colors.white).toMatch(hexRegex);
    expect(colors.gray[400]).toMatch(hexRegex);
    expect(colors.gray[500]).toMatch(hexRegex);
    expect(colors.gray[600]).toMatch(hexRegex);
    expect(colors.blue[500]).toMatch(hexRegex);
    expect(colors.blue[600]).toMatch(hexRegex);
  });
});
