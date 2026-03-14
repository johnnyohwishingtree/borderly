/**
 * Automation Scripts - Portal-specific automation logic registry
 *
 * Manages country-specific automation scripts for government portals
 * and provides a registry for loading and executing portal automation.
 *
 * Country configurations live in `./mappings/` — add a new country by
 * creating a mapping file there and registering it in `./mappings/index.ts`.
 */

import { AutomationScript, PortalFieldMapping } from '@/types/submission';
import { ALL_COUNTRY_MAPPINGS } from './mappings';

/**
 * Registry for automation scripts
 */
export class AutomationScriptRegistry {
  private scripts: Map<string, AutomationScript>;
  private loadedVersions: Map<string, string>;

  constructor() {
    this.scripts = new Map();
    this.loadedVersions = new Map();
    this.loadBuiltinScripts();
  }

  /**
   * Get automation script for a country
   */
  async getScript(countryCode: string): Promise<AutomationScript | null> {
    const script = this.scripts.get(countryCode);

    if (!script) {
      // Try to load script dynamically
      const loadedScript = await this.loadScript(countryCode);
      if (loadedScript) {
        this.scripts.set(countryCode, loadedScript);
        return loadedScript;
      }
      return null;
    }

    return script;
  }

  /**
   * Register a new automation script
   */
  registerScript(script: AutomationScript): void {
    this.scripts.set(script.countryCode, script);
    this.loadedVersions.set(script.countryCode, script.version);
  }

  /**
   * Get all available country codes
   */
  getAvailableCountries(): string[] {
    return Array.from(this.scripts.keys());
  }

  /**
   * Check if automation is available for a country
   */
  hasAutomation(countryCode: string): boolean {
    return this.scripts.has(countryCode);
  }

  /**
   * Synchronous cache lookup — returns null if the script has not been loaded yet.
   * Use this in non-async contexts (e.g. inside React callbacks).
   */
  getScriptSync(countryCode: string): AutomationScript | null {
    return this.scripts.get(countryCode) ?? null;
  }

  /**
   * Get script version
   */
  getScriptVersion(countryCode: string): string | undefined {
    return this.loadedVersions.get(countryCode);
  }

  /**
   * Load built-in automation scripts from the per-country mappings barrel.
   * Auto-discovers all countries exported from `./mappings/index.ts`.
   */
  private loadBuiltinScripts(): void {
    for (const mapping of ALL_COUNTRY_MAPPINGS) {
      this.registerScript(mapping);
    }
  }

  /**
   * Load script dynamically (for future OTA updates)
   */
  private async loadScript(_countryCode: string): Promise<AutomationScript | null> {
    // In future versions, this would fetch scripts from a CDN
    // For now, return null for unsupported countries
    return null;
  }
}

/**
 * Utility functions for automation scripts
 */
export class AutomationScriptUtils {
  /**
   * Apply value transformation based on mapping configuration
   */
  static applyTransform(value: unknown, transform: PortalFieldMapping['transform']): unknown {
    if (!transform) return value;

    switch (transform.type) {
      case 'date_format':
        return this.transformDate(value as string, transform.config);

      case 'country_code':
        return this.transformCountryCode(value as string, transform.config);

      case 'boolean_to_yesno':
        return this.transformBooleanToYesNo(value as boolean, transform.config);

      case 'custom':
        return this.transformCustom(value, transform.config);

      default:
        return value;
    }
  }

  private static transformDate(value: string, config: Record<string, unknown> | undefined): string {
    if (!config || !config.from || !config.to) return value;

    try {
      if (config.from === 'YYYY-MM-DD' && config.to === 'YYYY/MM/DD') {
        return value.replace(/-/g, '/');
      }
      return value;
    } catch {
      return value;
    }
  }

  private static transformCountryCode(
    value: string,
    config: Record<string, unknown> | undefined,
  ): string {
    const countryMap: Record<string, string> = {
      USA: 'United States',
      GBR: 'United Kingdom',
      DEU: 'Germany',
      FRA: 'France',
      JPN: 'Japan',
      KOR: 'South Korea',
      CHN: 'China',
      IND: 'India',
      AUS: 'Australia',
      CAN: 'Canada',
    };

    if (config?.format === 'iso3_to_name') {
      return countryMap[value] || value;
    }

    return value;
  }

  private static transformBooleanToYesNo(
    value: boolean,
    config: Record<string, unknown> | undefined,
  ): string {
    const falseValue = (config?.falseValue as string) || 'no';
    const trueValue = (config?.trueValue as string) || 'yes';

    return value ? trueValue : falseValue;
  }

  private static transformCustom(
    value: unknown,
    _config: Record<string, unknown> | undefined,
  ): unknown {
    // Custom transformation logic would go here
    return value;
  }

  /**
   * Validate automation script structure
   */
  static validateScript(script: AutomationScript): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!script.countryCode) errors.push('Missing countryCode');
    if (!script.portalUrl) errors.push('Missing portalUrl');
    if (!script.version) errors.push('Missing version');
    if (!script.steps || script.steps.length === 0) errors.push('Missing or empty steps');

    // Validate steps
    script.steps?.forEach((step, index) => {
      if (!step.id) errors.push(`Step ${index}: Missing id`);
      if (!step.name) errors.push(`Step ${index}: Missing name`);
      if (!step.script) errors.push(`Step ${index}: Missing script`);
      if (!step.timing?.timeout) errors.push(`Step ${index}: Missing timeout`);
    });

    // Validate prerequisites
    if (script.prerequisites?.cookiesEnabled === undefined) {
      errors.push('Missing cookiesEnabled prerequisite');
    }
    if (script.prerequisites?.javascriptEnabled === undefined) {
      errors.push('Missing javascriptEnabled prerequisite');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get script statistics
   */
  static getScriptStats(script: AutomationScript) {
    return {
      stepCount: script.steps.length,
      criticalSteps: script.steps.filter((s) => s.critical).length,
      estimatedDuration: script.steps.reduce(
        (total, step) => total + step.timing.timeout + (step.timing.waitAfter || 0),
        0,
      ),
      fieldMappingCount: Object.keys(script.fieldMappings).length,
    };
  }
}

/**
 * Shared singleton registry — import this instead of constructing a new instance.
 */
export const automationScriptRegistry = new AutomationScriptRegistry();
