/**
 * Tests for the dataLeakDetector reporting module — risk assessment and
 * recommendation generation.
 *
 * The main dataLeakDetector singleton orchestrates storage scanning which
 * is heavily coupled to MMKV/AsyncStorage/database mocks. The pure helper
 * functions (piiPatterns) and reporting logic are tested here and in
 * piiPatterns.test.ts.
 */

import { calculateRiskLevel, generateRecommendations } from '../../../src/services/security/dataLeakDetector/reporting';
import type { DataLeak } from '../../../src/services/security/dataLeakDetector/dataLeakDetectorTypes';

// ---------------------------------------------------------------------------
// calculateRiskLevel
// ---------------------------------------------------------------------------

describe('calculateRiskLevel', () => {
  it('returns "low" for no leaks', () => {
    expect(calculateRiskLevel([])).toBe('low');
  });

  it('returns "critical" for any critical-severity leak', () => {
    const leaks = [
      { severity: 'critical', location: 'mmkv:test' } as DataLeak,
    ];
    expect(calculateRiskLevel(leaks)).toBe('critical');
  });

  it('returns "critical" for more than 2 high-severity leaks', () => {
    const leaks = [
      { severity: 'high', location: 'mmkv:a' } as DataLeak,
      { severity: 'high', location: 'mmkv:b' } as DataLeak,
      { severity: 'high', location: 'mmkv:c' } as DataLeak,
    ];
    expect(calculateRiskLevel(leaks)).toBe('critical');
  });

  it('returns "high" for 1 high-severity leak', () => {
    const leaks = [{ severity: 'high', location: 'mmkv:a' } as DataLeak];
    expect(calculateRiskLevel(leaks)).toBe('high');
  });

  it('returns "high" for 2 high-severity leaks', () => {
    const leaks = [
      { severity: 'high', location: 'mmkv:a' } as DataLeak,
      { severity: 'high', location: 'mmkv:b' } as DataLeak,
    ];
    expect(calculateRiskLevel(leaks)).toBe('high');
  });

  it('returns "high" for more than 3 medium-severity leaks', () => {
    const leaks = Array.from({ length: 4 }, (_, i) => ({
      severity: 'medium',
      location: `mmkv:${i}`,
    })) as DataLeak[];
    expect(calculateRiskLevel(leaks)).toBe('high');
  });

  it('returns "medium" for 1-3 medium-severity leaks', () => {
    const leaks = [{ severity: 'medium', location: 'mmkv:a' } as DataLeak];
    expect(calculateRiskLevel(leaks)).toBe('medium');

    const leaks3 = Array.from({ length: 3 }, (_, i) => ({
      severity: 'medium',
      location: `mmkv:${i}`,
    })) as DataLeak[];
    expect(calculateRiskLevel(leaks3)).toBe('medium');
  });

  it('returns "low" for only low-severity leaks', () => {
    const leaks = [{ severity: 'low', location: 'mmkv:a' } as DataLeak];
    expect(calculateRiskLevel(leaks)).toBe('low');
  });

  it('prioritizes critical over high over medium', () => {
    const mixed = [
      { severity: 'medium', location: 'a' } as DataLeak,
      { severity: 'critical', location: 'b' } as DataLeak,
    ];
    expect(calculateRiskLevel(mixed)).toBe('critical');
  });
});

// ---------------------------------------------------------------------------
// generateRecommendations
// ---------------------------------------------------------------------------

describe('generateRecommendations', () => {
  it('returns empty for no leaks', () => {
    expect(generateRecommendations([])).toHaveLength(0);
  });

  it('adds passport-specific recommendation for passport leaks', () => {
    const leaks = [{ type: 'passport', severity: 'critical', location: 'mmkv:data' } as DataLeak];
    const recs = generateRecommendations(leaks);

    const passportRec = recs.find(r => r.title.includes('Passport'));
    expect(passportRec).not.toBeUndefined();
    expect(passportRec!.priority).toBe('immediate');
    expect(passportRec!.actions.length).toBeGreaterThan(0);
  });

  it('adds financial-specific recommendation for financial leaks', () => {
    const leaks = [{ type: 'financial', severity: 'critical', location: 'mmkv:data' } as DataLeak];
    const recs = generateRecommendations(leaks);

    const financialRec = recs.find(r => r.title.includes('Financial'));
    expect(financialRec).not.toBeUndefined();
    expect(financialRec!.priority).toBe('immediate');
  });

  it('adds data minimization recommendation for any leaks', () => {
    const leaks = [{ type: 'pii', severity: 'medium', location: 'mmkv:data' } as DataLeak];
    const recs = generateRecommendations(leaks);

    const minimizationRec = recs.find(r => r.title.includes('Data Minimization'));
    expect(minimizationRec).not.toBeUndefined();
    expect(minimizationRec!.priority).toBe('urgent');
  });

  it('adds regular security audits recommendation for any leaks', () => {
    const leaks = [{ type: 'pii', severity: 'medium', location: 'mmkv:data' } as DataLeak];
    const recs = generateRecommendations(leaks);

    const auditRec = recs.find(r => r.title.includes('Security Audits'));
    expect(auditRec).not.toBeUndefined();
    expect(auditRec!.priority).toBe('standard');
  });

  it('adds AsyncStorage-specific recommendation for async storage leaks', () => {
    const leaks = [{ type: 'pii', severity: 'medium', location: 'asyncstorage:cache' } as DataLeak];
    const recs = generateRecommendations(leaks);

    const asyncRec = recs.find(r => r.title.includes('AsyncStorage'));
    expect(asyncRec).not.toBeUndefined();
    expect(asyncRec!.priority).toBe('urgent');
  });

  it('does not add AsyncStorage recommendation for non-async leaks', () => {
    const leaks = [{ type: 'pii', severity: 'medium', location: 'mmkv:config' } as DataLeak];
    const recs = generateRecommendations(leaks);

    const asyncRec = recs.find(r => r.title.includes('AsyncStorage'));
    expect(asyncRec).toBeUndefined();
  });

  it('includes both passport and financial recommendations when both present', () => {
    const leaks = [
      { type: 'passport', severity: 'critical', location: 'mmkv:a' } as DataLeak,
      { type: 'financial', severity: 'critical', location: 'mmkv:b' } as DataLeak,
    ];
    const recs = generateRecommendations(leaks);

    expect(recs.find(r => r.title.includes('Passport'))).not.toBeUndefined();
    expect(recs.find(r => r.title.includes('Financial'))).not.toBeUndefined();
  });

  it('includes impact information in each recommendation', () => {
    const leaks = [{ type: 'passport', severity: 'critical', location: 'mmkv:a' } as DataLeak];
    const recs = generateRecommendations(leaks);

    for (const rec of recs) {
      expect(rec.impact.length).toBeGreaterThan(0);
    }
  });
});
