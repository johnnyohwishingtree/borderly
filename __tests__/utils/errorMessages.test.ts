import { 
  getEnhancedErrorMessage, 
  getQuickRecoverySteps, 
  getContextualHelp,
  hasAutomatedRecovery,
  getHelpSearchTerms,
  ENHANCED_ERROR_MESSAGES 
} from '../../src/utils/errorMessages';
import { ERROR_CODES } from '../../src/utils/errorHandling';

describe('errorMessages utility', () => {
  describe('getEnhancedErrorMessage', () => {
    it('returns base message for unknown error', () => {
      const message = getEnhancedErrorMessage(ERROR_CODES.UNKNOWN_ERROR);
      expect(message.title).toBe('Unexpected Error');
      expect(message.message).toBe('Something unexpected happened.');
      expect(message.recoverySteps).toBeTruthy();
      expect(Array.isArray(message.recoverySteps)).toBe(true);
    });

    it('customizes camera permission message for iOS', () => {
      const message = getEnhancedErrorMessage(
        ERROR_CODES.CAMERA_PERMISSION_DENIED,
        { deviceType: 'ios' }
      );
      
      expect(message.recoverySteps[0]).toContain('Privacy & Security');
    });

    it('customizes camera permission message for Android', () => {
      const message = getEnhancedErrorMessage(
        ERROR_CODES.CAMERA_PERMISSION_DENIED,
        { deviceType: 'android' }
      );
      
      expect(message.recoverySteps[0]).toContain('Apps');
    });

    it('includes all required fields', () => {
      const message = getEnhancedErrorMessage(ERROR_CODES.NETWORK_UNAVAILABLE);
      
      expect(message).toHaveProperty('title');
      expect(message).toHaveProperty('message');
      expect(message).toHaveProperty('actionGuidance');
      expect(message).toHaveProperty('recoverySteps');
      expect(message).toHaveProperty('supportInfo');
      expect(Array.isArray(message.recoverySteps)).toBe(true);
      expect(Array.isArray(message.supportInfo?.searchTerms)).toBe(true);
    });
  });

  describe('getQuickRecoverySteps', () => {
    it('returns first 3 recovery steps', () => {
      const steps = getQuickRecoverySteps(ERROR_CODES.NETWORK_UNAVAILABLE);
      expect(steps).toHaveLength(3);
      expect(steps[0]).toBe('Check if Wi-Fi is connected');
    });

    it('handles errors with fewer than 3 steps', () => {
      // Even if original has fewer steps, should return what's available
      const steps = getQuickRecoverySteps(ERROR_CODES.CAMERA_PERMISSION_DENIED);
      expect(steps.length).toBeLessThanOrEqual(3);
      expect(steps.length).toBeGreaterThan(0);
    });
  });

  describe('getContextualHelp', () => {
    it('returns action guidance by default', () => {
      const help = getContextualHelp(ERROR_CODES.NETWORK_UNAVAILABLE);
      expect(help).toBe('Check your internet connection and try again.');
    });

    it('provides extended help for beginners', () => {
      const help = getContextualHelp(
        ERROR_CODES.NETWORK_UNAVAILABLE,
        { userLevel: 'beginner' }
      );
      
      expect(help).toContain('Check your internet connection');
      expect(help).toContain('Next steps:');
      expect(help).toContain('• '); // Should include bullet points
    });

    it('provides standard help for experienced users', () => {
      const help = getContextualHelp(
        ERROR_CODES.NETWORK_UNAVAILABLE,
        { userLevel: 'experienced' }
      );
      
      expect(help).toBe('Check your internet connection and try again.');
    });
  });

  describe('hasAutomatedRecovery', () => {
    it('returns true for recoverable errors', () => {
      expect(hasAutomatedRecovery(ERROR_CODES.NETWORK_UNAVAILABLE)).toBe(true);
      expect(hasAutomatedRecovery(ERROR_CODES.CAMERA_UNAVAILABLE)).toBe(true);
      expect(hasAutomatedRecovery(ERROR_CODES.MRZ_SCAN_FAILED)).toBe(true);
    });

    it('returns false for non-recoverable errors', () => {
      expect(hasAutomatedRecovery(ERROR_CODES.VALIDATION_FAILED)).toBe(false);
      expect(hasAutomatedRecovery(ERROR_CODES.PARSING_ERROR)).toBe(false);
    });
  });

  describe('getHelpSearchTerms', () => {
    it('returns search terms for error codes', () => {
      const terms = getHelpSearchTerms(ERROR_CODES.NETWORK_UNAVAILABLE);
      expect(Array.isArray(terms)).toBe(true);
      expect(terms).toContain('network');
      expect(terms).toContain('internet');
    });

    it('returns empty array for errors without search terms', () => {
      // Mock an error that might not have search terms
      const terms = getHelpSearchTerms('NONEXISTENT_ERROR' as any);
      expect(Array.isArray(terms)).toBe(true);
      expect(terms).toHaveLength(0);
    });
  });

  describe('ENHANCED_ERROR_MESSAGES completeness', () => {
    it('has messages for all error codes', () => {
      const errorCodes = Object.values(ERROR_CODES);
      
      for (const code of errorCodes) {
        expect(ENHANCED_ERROR_MESSAGES).toHaveProperty(code);
        
        const message = ENHANCED_ERROR_MESSAGES[code];
        expect(message).toHaveProperty('title');
        expect(message).toHaveProperty('message');
        expect(message).toHaveProperty('actionGuidance');
        expect(message).toHaveProperty('recoverySteps');
        expect(Array.isArray(message.recoverySteps)).toBe(true);
        expect(message.recoverySteps.length).toBeGreaterThan(0);
      }
    });

    it('has reasonable recovery step counts', () => {
      const errorCodes = Object.values(ERROR_CODES);
      
      for (const code of errorCodes) {
        const message = ENHANCED_ERROR_MESSAGES[code];
        expect(message.recoverySteps.length).toBeGreaterThanOrEqual(1);
        expect(message.recoverySteps.length).toBeLessThanOrEqual(6);
      }
    });
  });
});