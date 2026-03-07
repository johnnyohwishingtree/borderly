import { CountryPriority } from '../types/schema';

/**
 * Country Priority Framework
 * 
 * Manages implementation priority for countries based on multiple factors:
 * - Travel volume: How many travelers use this route
 * - Implementation complexity: How difficult it is to implement
 * - Portal stability: How stable/reliable the government portal is
 * - User demand: How much users are requesting this country
 * - Strategic importance: Business/strategic value
 */

// Weights for calculating priority score (must sum to 1.0)
const PRIORITY_WEIGHTS = {
  travelVolume: 0.30,        // 30% - Most important factor
  implementationComplexity: 0.20, // 20% - Higher complexity = lower priority
  portalStability: 0.20,     // 20% - Unstable portals are deprioritized
  userDemand: 0.20,          // 20% - User requests matter
  strategicImportance: 0.10, // 10% - Business considerations
};

/**
 * Default country priorities based on research and travel patterns
 */
const DEFAULT_COUNTRY_PRIORITIES: CountryPriority[] = [
  // Phase 1: Already implemented (highest priority completed)
  {
    countryCode: 'JPN',
    priority: 1,
    factors: {
      travelVolume: 95,           // Very high tourism
      implementationComplexity: 30, // Low complexity (done)
      portalStability: 90,        // Visit Japan Web is stable
      userDemand: 90,            // High demand
      strategicImportance: 95,   // Major market
    },
    calculatedScore: 0,
    lastUpdated: '2025-06-01T00:00:00Z',
    notes: 'Complete - Visit Japan Web integration'
  },
  {
    countryCode: 'SGP',
    priority: 2,
    factors: {
      travelVolume: 85,
      implementationComplexity: 25,
      portalStability: 95,
      userDemand: 80,
      strategicImportance: 90,
    },
    calculatedScore: 0,
    lastUpdated: '2025-06-01T00:00:00Z',
    notes: 'Complete - SG Arrival Card integration'
  },
  {
    countryCode: 'MYS',
    priority: 3,
    factors: {
      travelVolume: 80,
      implementationComplexity: 35,
      portalStability: 85,
      userDemand: 75,
      strategicImportance: 85,
    },
    calculatedScore: 0,
    lastUpdated: '2025-06-01T00:00:00Z',
    notes: 'Complete - Malaysia Digital Arrival Card'
  },

  // Phase 2: High priority next implementations
  {
    countryCode: 'THA',
    priority: 4,
    factors: {
      travelVolume: 90,           // Thailand is a top destination
      implementationComplexity: 40, // Medium complexity
      portalStability: 75,        // Some portal issues reported
      userDemand: 85,            // High user requests
      strategicImportance: 80,   // Important SE Asia market
    },
    calculatedScore: 0,
    lastUpdated: '2026-03-07T00:00:00Z',
    notes: 'Thailand Pass system, high tourism volume'
  },
  {
    countryCode: 'USA',
    priority: 5,
    factors: {
      travelVolume: 95,           // Highest volume destination
      implementationComplexity: 80, // Very complex (ESTA, multiple systems)
      portalStability: 85,        // Generally stable but complex
      userDemand: 95,            // Highest demand
      strategicImportance: 100,  // Most important market
    },
    calculatedScore: 0,
    lastUpdated: '2026-03-07T00:00:00Z',
    notes: 'ESTA system, complex but highest value'
  },
  {
    countryCode: 'GBR',
    priority: 6,
    factors: {
      travelVolume: 85,           // High volume
      implementationComplexity: 60, // Medium-high (post-Brexit changes)
      portalStability: 80,        // Generally stable
      userDemand: 80,            // Good demand
      strategicImportance: 85,   // Important European market
    },
    calculatedScore: 0,
    lastUpdated: '2026-03-07T00:00:00Z',
    notes: 'UK ETA system, post-Brexit requirements'
  },
  {
    countryCode: 'VNM',
    priority: 7,
    factors: {
      travelVolume: 70,           // Growing tourism
      implementationComplexity: 45, // Medium complexity
      portalStability: 70,        // Some stability issues
      userDemand: 70,            // Good demand
      strategicImportance: 75,   // Growing SE Asia market
    },
    calculatedScore: 0,
    lastUpdated: '2026-03-07T00:00:00Z',
    notes: 'Vietnam e-Visa system, growing market'
  },
  {
    countryCode: 'CAN',
    priority: 8,
    factors: {
      travelVolume: 75,           // Good volume
      implementationComplexity: 65, // Medium-high (eTA system)
      portalStability: 90,        // Very stable system
      userDemand: 75,            // Good demand
      strategicImportance: 85,   // Important North America market
    },
    calculatedScore: 0,
    lastUpdated: '2026-03-07T00:00:00Z',
    notes: 'Canada eTA system, stable implementation'
  },

  // Phase 3: Medium priority
  {
    countryCode: 'AUS',
    priority: 9,
    factors: {
      travelVolume: 70,
      implementationComplexity: 55,
      portalStability: 85,
      userDemand: 65,
      strategicImportance: 70,
    },
    calculatedScore: 0,
    lastUpdated: '2026-03-07T00:00:00Z',
    notes: 'Australia ETA system'
  },
  {
    countryCode: 'KOR',
    priority: 10,
    factors: {
      travelVolume: 75,
      implementationComplexity: 50,
      portalStability: 80,
      userDemand: 70,
      strategicImportance: 75,
    },
    calculatedScore: 0,
    lastUpdated: '2026-03-07T00:00:00Z',
    notes: 'South Korea K-ETA system'
  },

  // Phase 4: Lower priority (specialized markets)
  {
    countryCode: 'CHN',
    priority: 11,
    factors: {
      travelVolume: 85,
      implementationComplexity: 90, // Very complex due to political/tech barriers
      portalStability: 60,        // Access and stability issues
      userDemand: 80,
      strategicImportance: 70,   // Complex market
    },
    calculatedScore: 0,
    lastUpdated: '2026-03-07T00:00:00Z',
    notes: 'Complex implementation due to technical and regulatory barriers'
  },
  {
    countryCode: 'IND',
    priority: 12,
    factors: {
      travelVolume: 80,
      implementationComplexity: 70,
      portalStability: 65,
      userDemand: 75,
      strategicImportance: 75,
    },
    calculatedScore: 0,
    lastUpdated: '2026-03-07T00:00:00Z',
    notes: 'India e-Visa system, large but complex market'
  }
];

class CountryPriorityManager {
  private priorities: Map<string, CountryPriority> = new Map();

  constructor() {
    this.initializeDefaultPriorities();
  }

  /**
   * Initialize with default country priorities
   */
  private initializeDefaultPriorities(): void {
    for (const priority of DEFAULT_COUNTRY_PRIORITIES) {
      // Calculate the weighted score
      priority.calculatedScore = this.calculatePriorityScore(priority.factors);
      this.priorities.set(priority.countryCode, priority);
    }
  }

  /**
   * Calculate weighted priority score from factors
   */
  private calculatePriorityScore(factors: CountryPriority['factors']): number {
    // Invert complexity (lower complexity = higher priority)
    const invertedComplexity = 100 - factors.implementationComplexity;
    
    const score = (
      factors.travelVolume * PRIORITY_WEIGHTS.travelVolume +
      invertedComplexity * PRIORITY_WEIGHTS.implementationComplexity +
      factors.portalStability * PRIORITY_WEIGHTS.portalStability +
      factors.userDemand * PRIORITY_WEIGHTS.userDemand +
      factors.strategicImportance * PRIORITY_WEIGHTS.strategicImportance
    );
    
    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get priority for a specific country
   */
  getPriority(countryCode: string): CountryPriority | null {
    return this.priorities.get(countryCode) || null;
  }

  /**
   * Get all countries sorted by priority
   */
  getAllPriorities(): CountryPriority[] {
    return Array.from(this.priorities.values())
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get countries sorted by calculated score (highest first)
   */
  getCountriesByScore(): CountryPriority[] {
    return Array.from(this.priorities.values())
      .sort((a, b) => b.calculatedScore - a.calculatedScore);
  }

  /**
   * Get top N priority countries for implementation
   */
  getTopPriorities(count: number): CountryPriority[] {
    return this.getAllPriorities().slice(0, count);
  }

  /**
   * Get countries by implementation status
   */
  getCountriesByStatus(status: 'implemented' | 'planned' | 'all'): CountryPriority[] {
    const implementedCountries = ['JPN', 'SGP', 'MYS']; // Phase 1 complete
    
    return this.getAllPriorities().filter(priority => {
      const isImplemented = implementedCountries.includes(priority.countryCode);
      
      switch (status) {
        case 'implemented':
          return isImplemented;
        case 'planned':
          return !isImplemented;
        case 'all':
        default:
          return true;
      }
    });
  }

  /**
   * Update priority for a country
   */
  updatePriority(countryCode: string, updates: Partial<CountryPriority>): void {
    const current = this.priorities.get(countryCode);
    if (!current) {
      throw new Error(`Country ${countryCode} not found in priorities`);
    }

    const updated: CountryPriority = {
      ...current,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };

    // Recalculate score if factors changed
    if (updates.factors) {
      updated.calculatedScore = this.calculatePriorityScore(updated.factors);
    }

    this.priorities.set(countryCode, updated);
  }

  /**
   * Add a new country to the priority system
   */
  addCountry(priority: CountryPriority): void {
    if (this.priorities.has(priority.countryCode)) {
      throw new Error(`Country ${priority.countryCode} already exists`);
    }

    priority.calculatedScore = this.calculatePriorityScore(priority.factors);
    priority.lastUpdated = new Date().toISOString();
    
    this.priorities.set(priority.countryCode, priority);
  }

  /**
   * Remove a country from priorities
   */
  removeCountry(countryCode: string): void {
    if (!this.priorities.has(countryCode)) {
      throw new Error(`Country ${countryCode} not found`);
    }
    
    this.priorities.delete(countryCode);
  }

  /**
   * Get implementation recommendations based on current priorities
   */
  getImplementationRecommendations(maxCount: number = 5): {
    country: CountryPriority;
    reason: string;
    estimatedEffort: 'low' | 'medium' | 'high';
  }[] {
    const plannedCountries = this.getCountriesByStatus('planned');
    const recommendations: any[] = [];

    for (const country of plannedCountries.slice(0, maxCount)) {
      let reason = '';
      let estimatedEffort: 'low' | 'medium' | 'high' = 'medium';

      // Determine effort level
      if (country.factors.implementationComplexity <= 40) {
        estimatedEffort = 'low';
        reason = 'Low complexity implementation with good volume/demand ratio';
      } else if (country.factors.implementationComplexity <= 70) {
        estimatedEffort = 'medium';
        reason = 'Medium complexity but high strategic value';
      } else {
        estimatedEffort = 'high';
        reason = 'High complexity but critical for market coverage';
      }

      // Add specific reasoning based on factors
      if (country.factors.travelVolume >= 90) {
        reason += '. Very high travel volume.';
      } else if (country.factors.userDemand >= 90) {
        reason += '. High user demand.';
      } else if (country.factors.strategicImportance >= 90) {
        reason += '. Critical strategic market.';
      }

      recommendations.push({
        country,
        reason: reason.trim(),
        estimatedEffort,
      });
    }

    return recommendations;
  }

  /**
   * Analyze priority factors for insights
   */
  analyzePriorityFactors(): {
    highVolumeLowComplexity: CountryPriority[];
    highDemandMediumComplexity: CountryPriority[];
    strategicButComplex: CountryPriority[];
    quickWins: CountryPriority[];
  } {
    const all = this.getCountriesByStatus('planned');

    return {
      // High volume, low complexity - ideal targets
      highVolumeLowComplexity: all.filter(p => 
        p.factors.travelVolume >= 80 && p.factors.implementationComplexity <= 40
      ),
      
      // High demand, medium complexity - good targets
      highDemandMediumComplexity: all.filter(p => 
        p.factors.userDemand >= 80 && 
        p.factors.implementationComplexity > 40 && 
        p.factors.implementationComplexity <= 70
      ),
      
      // Strategic but complex - long-term targets
      strategicButComplex: all.filter(p => 
        p.factors.strategicImportance >= 85 && p.factors.implementationComplexity > 70
      ),
      
      // Quick wins - fast to implement with decent value
      quickWins: all.filter(p => 
        p.factors.implementationComplexity <= 35 && 
        p.calculatedScore >= 70
      ),
    };
  }

  /**
   * Export priorities as JSON
   */
  exportPriorities(): CountryPriority[] {
    return this.getAllPriorities();
  }

  /**
   * Import priorities from JSON
   */
  importPriorities(priorities: CountryPriority[]): void {
    this.priorities.clear();
    
    for (const priority of priorities) {
      // Recalculate scores to ensure consistency
      priority.calculatedScore = this.calculatePriorityScore(priority.factors);
      this.priorities.set(priority.countryCode, priority);
    }
  }

  /**
   * Get priority weights configuration
   */
  getPriorityWeights() {
    return { ...PRIORITY_WEIGHTS };
  }

  /**
   * Simulate priority with different weights
   */
  simulatePriorityWithWeights(
    factors: CountryPriority['factors'],
    customWeights: Partial<typeof PRIORITY_WEIGHTS>
  ): number {
    const weights = { ...PRIORITY_WEIGHTS, ...customWeights };
    const invertedComplexity = 100 - factors.implementationComplexity;
    
    return Math.round((
      factors.travelVolume * weights.travelVolume +
      invertedComplexity * weights.implementationComplexity +
      factors.portalStability * weights.portalStability +
      factors.userDemand * weights.userDemand +
      factors.strategicImportance * weights.strategicImportance
    ) * 100) / 100;
  }
}

// Export singleton instance
export const countryPriorityManager = new CountryPriorityManager();

// Export utilities
export { PRIORITY_WEIGHTS, DEFAULT_COUNTRY_PRIORITIES };