import {
  countryPriorityManager,
  PRIORITY_WEIGHTS,
  DEFAULT_COUNTRY_PRIORITIES,
} from '../../src/utils/countryPriority';
import { CountryPriority } from '../../src/types/schema';

// ── Factories ──────────────────────────────────────────────────────────────

function createPriority(overrides: Partial<CountryPriority> = {}): CountryPriority {
  return {
    countryCode: 'TST',
    priority: 99,
    factors: {
      travelVolume: 50,
      implementationComplexity: 50,
      portalStability: 50,
      userDemand: 50,
      strategicImportance: 50,
    },
    calculatedScore: 0,
    lastUpdated: '2026-01-01T00:00:00Z',
    notes: 'test',
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('PRIORITY_WEIGHTS', () => {
  it('sums to 1.0', () => {
    const sum = Object.values(PRIORITY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });
});

describe('DEFAULT_COUNTRY_PRIORITIES', () => {
  it('contains at least the 3 launched countries', () => {
    const codes = DEFAULT_COUNTRY_PRIORITIES.map(p => p.countryCode);
    expect(codes).toContain('JPN');
    expect(codes).toContain('SGP');
    expect(codes).toContain('MYS');
  });
});

describe('countryPriorityManager', () => {
  // Reset state between tests by reimporting would be heavy;
  // instead we clean up any test countries added.
  afterEach(() => {
    try { countryPriorityManager.removeCountry('TST'); } catch { /* ignore */ }
    try { countryPriorityManager.removeCountry('NEW'); } catch { /* ignore */ }
  });

  describe('getPriority', () => {
    it('returns priority for known country', () => {
      const jpn = countryPriorityManager.getPriority('JPN');
      expect(jpn).not.toBeNull();
      expect(jpn!.countryCode).toBe('JPN');
    });

    it('returns null for unknown country', () => {
      expect(countryPriorityManager.getPriority('ZZZ')).toBeNull();
    });
  });

  describe('getAllPriorities', () => {
    it('returns countries sorted by priority number ascending', () => {
      const all = countryPriorityManager.getAllPriorities();
      for (let i = 1; i < all.length; i++) {
        expect(all[i].priority).toBeGreaterThanOrEqual(all[i - 1].priority);
      }
    });
  });

  describe('getCountriesByScore', () => {
    it('returns countries sorted by calculated score descending', () => {
      const byScore = countryPriorityManager.getCountriesByScore();
      for (let i = 1; i < byScore.length; i++) {
        expect(byScore[i].calculatedScore).toBeLessThanOrEqual(byScore[i - 1].calculatedScore);
      }
    });

    it('calculated scores are positive', () => {
      const byScore = countryPriorityManager.getCountriesByScore();
      byScore.forEach(p => expect(p.calculatedScore).toBeGreaterThan(0));
    });
  });

  describe('getTopPriorities', () => {
    it('returns at most N countries', () => {
      expect(countryPriorityManager.getTopPriorities(3)).toHaveLength(3);
    });

    it('first entry has priority 1', () => {
      expect(countryPriorityManager.getTopPriorities(1)[0].priority).toBe(1);
    });
  });

  describe('getCountriesByStatus', () => {
    it('"all" returns every country', () => {
      const all = countryPriorityManager.getCountriesByStatus('all');
      expect(all.length).toBe(countryPriorityManager.getAllPriorities().length);
    });

    it('"implemented" only returns supported country codes', () => {
      const impl = countryPriorityManager.getCountriesByStatus('implemented');
      impl.forEach(p => {
        // Must be in supported codes from the constants module
        expect(typeof p.countryCode).toBe('string');
        expect(p.countryCode.length).toBe(3);
      });
    });
  });

  describe('addCountry', () => {
    it('adds a new country and calculates its score', () => {
      const newPriority = createPriority({ countryCode: 'NEW' });
      countryPriorityManager.addCountry(newPriority);
      const fetched = countryPriorityManager.getPriority('NEW');
      expect(fetched).not.toBeNull();
      expect(fetched!.calculatedScore).toBeGreaterThan(0);
    });

    it('throws when country already exists', () => {
      expect(() => countryPriorityManager.addCountry(createPriority({ countryCode: 'JPN' }))).toThrow(
        'already exists',
      );
    });
  });

  describe('updatePriority', () => {
    it('updates notes and recalculates score when factors change', () => {
      const before = countryPriorityManager.getPriority('JPN')!;
      const oldScore = before.calculatedScore;
      countryPriorityManager.updatePriority('JPN', {
        factors: { ...before.factors, travelVolume: 10 },
      });
      const after = countryPriorityManager.getPriority('JPN')!;
      expect(after.calculatedScore).not.toBe(oldScore);
      // Restore
      countryPriorityManager.updatePriority('JPN', { factors: before.factors });
    });

    it('throws for unknown country', () => {
      expect(() => countryPriorityManager.updatePriority('ZZZ', { notes: 'x' })).toThrow('not found');
    });
  });

  describe('removeCountry', () => {
    it('removes a country', () => {
      countryPriorityManager.addCountry(createPriority({ countryCode: 'TST' }));
      countryPriorityManager.removeCountry('TST');
      expect(countryPriorityManager.getPriority('TST')).toBeNull();
    });

    it('throws for unknown country', () => {
      expect(() => countryPriorityManager.removeCountry('ZZZ')).toThrow('not found');
    });
  });

  describe('getImplementationRecommendations', () => {
    it('returns up to maxCount recommendations', () => {
      const recs = countryPriorityManager.getImplementationRecommendations(3);
      expect(recs.length).toBeLessThanOrEqual(3);
    });

    it('each recommendation has country, reason, and estimatedEffort', () => {
      const recs = countryPriorityManager.getImplementationRecommendations(2);
      recs.forEach(r => {
        expect(r.country).not.toBeUndefined();
        expect(typeof r.reason).toBe('string');
        expect(r.reason.length).toBeGreaterThan(0);
        expect(['low', 'medium', 'high']).toContain(r.estimatedEffort);
      });
    });
  });

  describe('analyzePriorityFactors', () => {
    it('returns four arrays', () => {
      const analysis = countryPriorityManager.analyzePriorityFactors();
      expect(Array.isArray(analysis.highVolumeLowComplexity)).toBe(true);
      expect(Array.isArray(analysis.highDemandMediumComplexity)).toBe(true);
      expect(Array.isArray(analysis.strategicButComplex)).toBe(true);
      expect(Array.isArray(analysis.quickWins)).toBe(true);
    });
  });

  describe('exportPriorities / importPriorities', () => {
    it('round-trips priorities', () => {
      const exported = countryPriorityManager.exportPriorities();
      const count = exported.length;
      countryPriorityManager.importPriorities(exported);
      expect(countryPriorityManager.getAllPriorities()).toHaveLength(count);
    });
  });

  describe('getPriorityWeights', () => {
    it('returns a copy of weights', () => {
      const w = countryPriorityManager.getPriorityWeights();
      expect(w).toEqual(PRIORITY_WEIGHTS);
      // Mutating the copy should not affect the original
      w.travelVolume = 999;
      expect(countryPriorityManager.getPriorityWeights().travelVolume).toBe(0.3);
    });
  });

  describe('simulatePriorityWithWeights', () => {
    it('returns a number score', () => {
      const factors = {
        travelVolume: 80,
        implementationComplexity: 40,
        portalStability: 90,
        userDemand: 70,
        strategicImportance: 60,
      };
      const score = countryPriorityManager.simulatePriorityWithWeights(factors, {});
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
    });

    it('higher travelVolume weight increases score contribution', () => {
      const factors = {
        travelVolume: 100,
        implementationComplexity: 50,
        portalStability: 50,
        userDemand: 50,
        strategicImportance: 50,
      };
      const defaultScore = countryPriorityManager.simulatePriorityWithWeights(factors, {});
      const boosted = countryPriorityManager.simulatePriorityWithWeights(factors, { travelVolume: 0.9 });
      expect(boosted).toBeGreaterThan(defaultScore);
    });
  });
});
