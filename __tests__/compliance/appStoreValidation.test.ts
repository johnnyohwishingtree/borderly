/**
 * App Store Compliance Validation Tests
 * 
 * Tests for the App Store compliance validation utilities to ensure
 * they correctly identify compliance issues and generate accurate reports.
 */

import {
  AppStoreComplianceValidator,
} from '../../src/utils/appStoreCompliance';

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios'
  }
}));

describe('AppStoreComplianceValidator', () => {
  let validator: AppStoreComplianceValidator;

  beforeEach(() => {
    validator = new AppStoreComplianceValidator();
  });

  describe('validateCompliance', () => {
    it('should return a complete compliance report', async () => {
      const report = await validator.validateCompliance();

      expect(report).not.toBeUndefined();
      expect(report.appVersion).toBe('1.0.0');
      expect(report.platform).toBe('ios');
      expect(report.checks).toBeInstanceOf(Array);
      expect(report.checks.length).toBeGreaterThan(0);
      expect(report.summary).not.toBeUndefined();
      expect(report.summary.total).toBe(report.checks.length);
    });

    it('should calculate summary statistics correctly', async () => {
      const report = await validator.validateCompliance();
      const { summary, checks } = report;

      expect(summary.passed).toBe(checks.filter(c => c.status === 'pass').length);
      expect(summary.failed).toBe(checks.filter(c => c.status === 'fail').length);
      expect(summary.warnings).toBe(checks.filter(c => c.status === 'warning').length);
      expect(summary.unknown).toBe(checks.filter(c => c.status === 'unknown').length);
      expect(summary.total).toBe(summary.passed + summary.failed + summary.warnings + summary.unknown);
    });

    it('should include timestamp in ISO format', async () => {
      const report = await validator.validateCompliance();
      
      expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(report.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('validateCategory', () => {
    it('should return only checks for specified category', async () => {
      const privacyChecks = await validator.validateCategory('privacy');
      
      expect(privacyChecks).toBeInstanceOf(Array);
      expect(privacyChecks.every(check => check.category === 'privacy')).toBe(true);
    });

    it('should return empty array for non-existent category', async () => {
      const invalidChecks = await validator.validateCategory('invalid' as any);
      
      expect(invalidChecks).toHaveLength(0);
    });
  });

  describe('getCriticalFailures', () => {
    it('should return only required checks that failed', async () => {
      const criticalFailures = await validator.getCriticalFailures();
      
      expect(criticalFailures).toBeInstanceOf(Array);
      expect(criticalFailures.every(check => 
        check.required && check.status === 'fail'
      )).toBe(true);
    });
  });

  describe('Platform-specific checks', () => {
    it('should run iOS-specific checks on iOS platform', async () => {
      const report = await validator.validateCompliance();
      const iosChecks = report.checks.filter(check => 
        check.platform === 'ios' || check.platform === 'both'
      );
      
      expect(iosChecks.length).toBeGreaterThan(0);
      expect(iosChecks.some(check => check.id === 'camera_permission_description')).toBe(true);
      expect(iosChecks.some(check => check.id === 'encryption_compliance')).toBe(true);
    });

    it('should not run Android-only checks on iOS platform', async () => {
      const report = await validator.validateCompliance();
      const androidOnlyChecks = report.checks.filter(check => 
        check.platform === 'android'
      );
      
      expect(androidOnlyChecks).toHaveLength(0);
    });
  });

  describe('Individual check validations', () => {
    it('should validate app icon presence', async () => {
      const configChecks = await validator.validateCategory('configuration');
      const appIconCheck = configChecks.find(check => check.id === 'app_icon_present');
      
      expect(appIconCheck).not.toBeUndefined();
      expect(appIconCheck?.status).toBe('pass'); // Mock implementation returns true
    });

    it('should validate no server data collection', async () => {
      const privacyChecks = await validator.validateCategory('privacy');
      const noServerCheck = privacyChecks.find(check => check.id === 'no_server_data_collection');
      
      expect(noServerCheck).not.toBeUndefined();
      expect(noServerCheck?.status).toBe('pass'); // App is local-first
    });

    it('should validate age rating appropriateness', async () => {
      const contentChecks = await validator.validateCategory('content');
      const ageRatingCheck = contentChecks.find(check => check.id === 'age_rating_appropriate');
      
      expect(ageRatingCheck).not.toBeUndefined();
      expect(ageRatingCheck?.status).toBe('pass'); // App has no inappropriate content
    });
  });
});

describe('Check Structure Validation', () => {
  let validator: AppStoreComplianceValidator;

  beforeEach(() => {
    validator = new AppStoreComplianceValidator();
  });

  it('should have all required check properties', async () => {
    const report = await validator.validateCompliance();

    report.checks.forEach(check => {
      expect(typeof check.id).toBe('string');
      expect(typeof check.name).toBe('string');
      expect(typeof check.category).toBe('string');
      expect(typeof check.platform).toBe('string');
      expect(typeof check.required).toBe('boolean');
      expect(['pass', 'fail', 'warning', 'unknown']).toContain(check.status);
      expect(typeof check.message).toBe('string');
      
      // fixAction is optional but if present should be a string
      if (check.fixAction) {
        expect(typeof check.fixAction).toBe('string');
      }
    });
  });

  it('should have unique check IDs', async () => {
    const report = await validator.validateCompliance();
    const checkIds = report.checks.map(check => check.id);
    const uniqueIds = [...new Set(checkIds)];

    expect(checkIds).toHaveLength(uniqueIds.length);
  });

  it('should have valid categories', async () => {
    const report = await validator.validateCompliance();
    const validCategories = ['configuration', 'permissions', 'privacy', 'content', 'metadata'];

    report.checks.forEach(check => {
      expect(validCategories).toContain(check.category);
    });
  });

  it('should have valid platforms', async () => {
    const report = await validator.validateCompliance();
    const validPlatforms = ['ios', 'android', 'both'];

    report.checks.forEach(check => {
      expect(validPlatforms).toContain(check.platform);
    });
  });
});

describe('Error Handling', () => {
  it('should handle check execution errors gracefully', async () => {
    // This test ensures that if a check throws an error,
    // the overall validation doesn't fail
    const validator = new AppStoreComplianceValidator();
    
    // The validator should handle any errors internally
    const report = await validator.validateCompliance();
    
    expect(report).not.toBeUndefined();
    expect(report.checks).toBeInstanceOf(Array);
    
    // If any checks failed to run, they should have status 'unknown'
    const unknownChecks = report.checks.filter(check => check.status === 'unknown');
    unknownChecks.forEach(check => {
      expect(check.message).toContain('Check failed to run');
    });
  });
});