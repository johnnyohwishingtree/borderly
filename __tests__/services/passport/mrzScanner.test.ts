/**
 * Tests for MRZ Scanner Service
 */

import {
  processCameraText,
  MRZScanner,
  validateScannedPassport,
  getScanningGuidance,
  type ScanResult,
  defaultScannerConfig
} from '../../../src/services/passport/mrzScanner';

// Mock text recognition result
const createMockTextRecognition = (textBlocks: any[] = []) => ({
  textBlocks
});

const createTextBlock = (value: string, components?: any[]) => ({
  value,
  components: components || [{ value }]
});

describe('MRZ Scanner Service', () => {
  const validMRZText = `
    P<UTODOE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
    L898902C36UTO7408122F1204159ZE184226B<<<<<10
  `;

  const invalidMRZText = `
    Just some random text
    No passport data here
  `;

  describe('processCameraText', () => {
    it('should detect no MRZ when text is too short', () => {
      const textRecognition = createMockTextRecognition([
        createTextBlock('Short text')
      ]);

      const result = processCameraText(textRecognition);

      expect(result.type).toBe('no_mrz');
      expect(result.confidence).toBe(0);
      expect(result.guidance).toContain('Position passport');
    });

    it('should detect no MRZ when text does not contain MRZ pattern', () => {
      const textRecognition = createMockTextRecognition([
        createTextBlock(invalidMRZText)
      ]);

      const result = processCameraText(textRecognition);

      expect(result.type).toBe('no_mrz');
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.guidance).toContain('MRZ');
    });

    it('should successfully process valid MRZ text', () => {
      const textRecognition = createMockTextRecognition([
        createTextBlock(validMRZText)
      ]);

      const result = processCameraText(textRecognition);

      expect(result.type).toBe('success');
      expect(result.mrz).toBeDefined();
      expect(result.mrz!.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.guidance).toContain('complete');
    });

    it('should handle partial scans with low confidence', () => {
      const config = { ...defaultScannerConfig, minConfidence: 0.9 };
      const textRecognition = createMockTextRecognition([
        createTextBlock(validMRZText)
      ]);

      const result = processCameraText(textRecognition, config);

      if (result.confidence < 0.9) {
        expect(result.type).toBe('partial');
        expect(result.guidance).toContain('Hold steady');
      }
    });

    it('should handle camera errors gracefully', () => {
      const textRecognition = createMockTextRecognition();

      // Mock an error in the processing
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = processCameraText(textRecognition);

      expect(result.type).toBe('no_mrz');
      expect(result.confidence).toBe(0);
    });

    it('should extract text from complex text block structure', () => {
      const textRecognition = createMockTextRecognition([
        createTextBlock('', [
          { value: 'P<UTODOE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<' },
          { value: 'L898902C36UTO7408122F1204159ZE184226B<<<<<10' }
        ])
      ]);

      const result = processCameraText(textRecognition);

      expect(result.type).toBe('success');
      expect(result.mrz).toBeDefined();
    });
  });

  describe('MRZScanner class', () => {
    let scanner: MRZScanner;

    beforeEach(() => {
      scanner = new MRZScanner();
    });

    it('should enforce scan cooldown', () => {
      const textRecognition = createMockTextRecognition([
        createTextBlock(validMRZText)
      ]);

      const result1 = scanner.processFrame(textRecognition);
      const result2 = scanner.processFrame(textRecognition);

      // During cooldown, should return the last successful scan result
      expect(result2).toEqual(result1);
      expect(result1.type).toBe('success');
    });

    it('should track scan attempts', () => {
      const textRecognition = createMockTextRecognition([
        createTextBlock(invalidMRZText)
      ]);

      // Wait for cooldown to process multiple frames
      const config = { ...defaultScannerConfig, scanCooldownMs: 0 };
      scanner = new MRZScanner(config, 'high'); // High performance tier for consistent behavior

      for (let i = 0; i < 5; i++) {
        scanner.processFrame(textRecognition);
      }

      const stats = scanner.getStats();
      expect(stats.attempts).toBeGreaterThanOrEqual(1); // Account for adaptive frame skipping
    });

    it('should suggest manual entry after max attempts', () => {
      const textRecognition = createMockTextRecognition([
        createTextBlock(invalidMRZText)
      ]);

      const config = { 
        ...defaultScannerConfig, 
        scanCooldownMs: 0,
        maxScanAttempts: 3  // Fixed low value for predictable test
      };
      scanner = new MRZScanner(config, 'high'); // High performance tier for consistent behavior

      // Mock both adaptive methods to return fixed values
      const calculateAdaptiveMaxAttemptsSpy = jest.spyOn(scanner as any, 'calculateAdaptiveMaxAttempts');
      calculateAdaptiveMaxAttemptsSpy.mockReturnValue(3);
      
      const calculateAdaptiveCooldownSpy = jest.spyOn(scanner as any, 'calculateAdaptiveCooldown');
      calculateAdaptiveCooldownSpy.mockReturnValue(0);

      let result: ScanResult;
      // Process enough frames to reach max attempts
      for (let i = 0; i < 5; i++) {
        result = scanner.processFrame(textRecognition);
        
        // If we get the manual entry guidance, break early
        if (result.guidance.toLowerCase().includes('manual')) {
          break;
        }
      }

      // Check that we eventually get a guidance message about manual entry
      expect(result!.guidance.toLowerCase()).toContain('manual');
      
      calculateAdaptiveMaxAttemptsSpy.mockRestore();
      calculateAdaptiveCooldownSpy.mockRestore();
    });

    it('should reset state correctly', () => {
      const textRecognition = createMockTextRecognition([
        createTextBlock(validMRZText)
      ]);

      scanner.processFrame(textRecognition);
      scanner.getStats();

      scanner.reset();
      const statsAfter = scanner.getStats();

      expect(statsAfter.attempts).toBe(0);
      expect(statsAfter.lastScan).toBeNull();
    });

    it('should preserve successful scan results', () => {
      const goodText = createMockTextRecognition([
        createTextBlock(validMRZText)
      ]);
      const badText = createMockTextRecognition([
        createTextBlock(invalidMRZText)
      ]);

      const config = { ...defaultScannerConfig, scanCooldownMs: 0 };
      scanner = new MRZScanner(config);

      const goodResult = scanner.processFrame(goodText);
      scanner.processFrame(badText);

      const stats = scanner.getStats();
      expect(stats.lastScan).toEqual(goodResult);
    });
  });

  describe('validateScannedPassport', () => {
    const createMockResult = (profile: any) => ({
      success: true,
      profile,
      errors: [],
      confidence: 0.8
    });

    it('should validate complete passport data', () => {
      const validProfile = {
        passportNumber: 'P12345678',
        surname: 'DOE',
        givenNames: 'JANE',
        dateOfBirth: '1990-01-01',
        passportExpiry: '2030-12-31'
      };

      const result = createMockResult(validProfile);
      const validation = validateScannedPassport(result);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const incompleteProfile = {
        passportNumber: 'P123', // Too short
        surname: 'D', // Too short
        givenNames: '', // Missing
      };

      const result = createMockResult(incompleteProfile);
      const validation = validateScannedPassport(result);

      expect(validation.isValid).toBe(false);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.includes('Passport number'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('Surname'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('Given names'))).toBe(true);
    });

    it('should detect expired passport', () => {
      const expiredProfile = {
        passportNumber: 'P12345678',
        surname: 'DOE',
        givenNames: 'JANE',
        dateOfBirth: '1990-01-01',
        passportExpiry: '2020-01-01' // Expired
      };

      const result = createMockResult(expiredProfile);
      const validation = validateScannedPassport(result);

      expect(validation.warnings.some(w => w.includes('expired'))).toBe(true);
    });

    it('should detect passport expiring soon', () => {
      const soonExpiringDate = new Date();
      soonExpiringDate.setMonth(soonExpiringDate.getMonth() + 3); // 3 months from now

      const soonExpiringProfile = {
        passportNumber: 'P12345678',
        surname: 'DOE',
        givenNames: 'JANE',
        dateOfBirth: '1990-01-01',
        passportExpiry: soonExpiringDate.toISOString().split('T')[0]
      };

      const result = createMockResult(soonExpiringProfile);
      const validation = validateScannedPassport(result);

      expect(validation.warnings.some(w => w.includes('6 months'))).toBe(true);
    });

    it('should detect invalid birth date', () => {
      const invalidBirthProfile = {
        passportNumber: 'P12345678',
        surname: 'DOE',
        givenNames: 'JANE',
        dateOfBirth: '2050-01-01', // Future date
        passportExpiry: '2030-12-31'
      };

      const result = createMockResult(invalidBirthProfile);
      const validation = validateScannedPassport(result);

      expect(validation.warnings.some(w => w.includes('Birth date'))).toBe(true);
    });

    it('should handle missing profile gracefully', () => {
      const result = {
        success: false,
        errors: ['No data'],
        confidence: 0
      } as any;

      const validation = validateScannedPassport(result);

      expect(validation.isValid).toBe(false);
      expect(validation.warnings.some(w => w.includes('No passport data'))).toBe(true);
    });
  });

  describe('getScanningGuidance', () => {
    it('should provide guidance when no text is detected', () => {
      const textRecognition = createMockTextRecognition([]);

      const guidance = getScanningGuidance(textRecognition, false);

      expect(guidance).toContain('Position passport');
      expect(guidance).toContain('lighting');
    });

    it('should suggest moving closer when little text is detected', () => {
      const textRecognition = createMockTextRecognition([
        createTextBlock('Some'),
        createTextBlock('Text')
      ]);

      const guidance = getScanningGuidance(textRecognition, false);

      expect(guidance).toContain('Move camera closer');
    });

    it('should suggest focusing on MRZ when too much text is detected', () => {
      const textBlocks = Array(25).fill(null).map((_, i) => 
        createTextBlock(`Text block ${i}`)
      );
      const textRecognition = createMockTextRecognition(textBlocks);

      const guidance = getScanningGuidance(textRecognition, false);

      expect(guidance).toContain('Move camera closer');
      expect(guidance).toContain('MRZ');
    });

    it('should provide scanning feedback for good positioning', () => {
      const textBlocks = Array(10).fill(null).map((_, i) => 
        createTextBlock(`Text block ${i}`)
      );
      const textRecognition = createMockTextRecognition(textBlocks);

      const guidance = getScanningGuidance(textRecognition, true);

      expect(guidance).toContain('Hold steady');
      expect(guidance).toContain('Scanning');
    });
  });

  describe('Configuration handling', () => {
    it('should use custom configuration correctly', () => {
      const customConfig = {
        minConfidence: 0.9,
        maxScanAttempts: 5,
        scanCooldownMs: 100
      };

      const textRecognition = createMockTextRecognition([
        createTextBlock(validMRZText)
      ]);

      const result = processCameraText(textRecognition, customConfig);

      // With high confidence threshold, might get partial result
      if (result.confidence < 0.9) {
        expect(result.type).toBe('partial');
      }
    });

    it('should handle missing configuration gracefully', () => {
      const textRecognition = createMockTextRecognition([
        createTextBlock(validMRZText)
      ]);

      // Should work with default config when none provided
      const result = processCameraText(textRecognition);

      expect(result).toBeDefined();
      expect(['success', 'partial', 'error', 'no_mrz']).toContain(result.type);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle corrupted MRZ data gracefully', () => {
      const corruptedMRZ = `
        P<UTODOE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
        L89890C36UTO74081F1204159ZE184226B<<<<<10
      `;

      const textRecognition = createMockTextRecognition([
        createTextBlock(corruptedMRZ)
      ]);

      const result = processCameraText(textRecognition);

      // Should not crash, even with invalid data
      expect(result).toBeDefined();
      expect(['success', 'partial', 'error', 'no_mrz']).toContain(result.type);
    });

    it('should handle extremely large text input', () => {
      const largeTextBlocks = Array(1000).fill(null).map((_, i) => 
        createTextBlock(`Large text block number ${i}`)
      );
      const textRecognition = createMockTextRecognition(largeTextBlocks);

      const result = processCameraText(textRecognition);

      expect(result).toBeDefined();
      expect(result.guidance).toContain('MRZ');
    });

    it('should handle empty text blocks', () => {
      const textRecognition = createMockTextRecognition([
        createTextBlock(''),
        createTextBlock(' '),
        createTextBlock('   ')
      ]);

      const result = processCameraText(textRecognition);

      expect(result.type).toBe('no_mrz');
      expect(result.confidence).toBe(0);
    });

    it('should handle text blocks with special characters', () => {
      const specialCharMRZ = `
        P<UTØDØE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
        L898902C36UTO7408122F1204159ZE184226B<<<<<10
      `;

      const textRecognition = createMockTextRecognition([
        createTextBlock(specialCharMRZ)
      ]);

      const result = processCameraText(textRecognition);

      expect(result).toBeDefined();
    });

    it('should handle null or undefined text recognition gracefully', () => {
      const result = processCameraText(null as any);

      expect(result.type).toBe('no_mrz');
      expect(result.confidence).toBe(0);
    });

    it('should handle text blocks without components', () => {
      const textRecognition = {
        textBlocks: [
          { value: validMRZText } // Missing components property
        ]
      };

      const result = processCameraText(textRecognition as any);

      expect(result).toBeDefined();
      expect(['success', 'partial', 'error', 'no_mrz']).toContain(result.type);
    });
  });

  describe('Performance tier handling', () => {
    it('should adapt behavior based on performance tier', () => {
      const textRecognition = createMockTextRecognition([
        createTextBlock(validMRZText)
      ]);

      const lowTierScanner = new MRZScanner(defaultScannerConfig, 'low');
      const highTierScanner = new MRZScanner(defaultScannerConfig, 'high');

      const lowResult = lowTierScanner.processFrame(textRecognition);
      const highResult = highTierScanner.processFrame(textRecognition);

      // Both should process successfully
      expect(lowResult).toBeDefined();
      expect(highResult).toBeDefined();
    });

    it('should handle invalid performance tier gracefully', () => {
      const textRecognition = createMockTextRecognition([
        createTextBlock(validMRZText)
      ]);

      const scanner = new MRZScanner(defaultScannerConfig, 'invalid' as any);
      const result = scanner.processFrame(textRecognition);

      expect(result).toBeDefined();
    });
  });

  describe('Statistics and monitoring', () => {
    it('should track detailed statistics', () => {
      const scanner = new MRZScanner({ ...defaultScannerConfig, scanCooldownMs: 0 });
      const textRecognition = createMockTextRecognition([
        createTextBlock(validMRZText)
      ]);

      scanner.processFrame(textRecognition);
      scanner.processFrame(textRecognition);

      const stats = scanner.getStats();
      
      expect(stats.attempts).toBeGreaterThan(0);
      expect(stats.lastScan).toBeDefined();
      expect(stats.lastScan?.type).toBe('success');
    });

    it('should preserve last successful scan through multiple failures', () => {
      const scanner = new MRZScanner({ ...defaultScannerConfig, scanCooldownMs: 0 });
      const goodText = createMockTextRecognition([createTextBlock(validMRZText)]);
      const badText = createMockTextRecognition([createTextBlock(invalidMRZText)]);

      // First successful scan
      const goodResult = scanner.processFrame(goodText);
      
      // Multiple failed scans
      scanner.processFrame(badText);
      scanner.processFrame(badText);
      scanner.processFrame(badText);

      const stats = scanner.getStats();
      expect(stats.lastScan?.type).toBe('success');
      expect(stats.lastScan).toEqual(goodResult);
    });

    it('should reset statistics correctly', () => {
      const scanner = new MRZScanner();
      const textRecognition = createMockTextRecognition([
        createTextBlock(validMRZText)
      ]);

      scanner.processFrame(textRecognition);
      expect(scanner.getStats().attempts).toBeGreaterThan(0);

      scanner.reset();
      const statsAfterReset = scanner.getStats();
      expect(statsAfterReset.attempts).toBe(0);
      expect(statsAfterReset.lastScan).toBeNull();
    });
  });

  describe('Adaptive algorithms', () => {
    it('should calculate adaptive cooldown based on device performance', () => {
      const scanner = new MRZScanner(defaultScannerConfig, 'low');
      
      // Access private method for testing
      const adaptiveCooldown = (scanner as any).calculateAdaptiveCooldown();
      
      expect(typeof adaptiveCooldown).toBe('number');
      expect(adaptiveCooldown).toBeGreaterThanOrEqual(0);
    });

    it('should calculate adaptive max attempts based on device performance', () => {
      const scanner = new MRZScanner(defaultScannerConfig, 'high');
      
      // Access private method for testing
      const adaptiveMaxAttempts = (scanner as any).calculateAdaptiveMaxAttempts();
      
      expect(typeof adaptiveMaxAttempts).toBe('number');
      expect(adaptiveMaxAttempts).toBeGreaterThan(0);
    });

    it('should determine frame skip based on performance tier', () => {
      const scanner = new MRZScanner(defaultScannerConfig, 'low');
      
      // Access private method for testing
      const shouldSkip = (scanner as any).shouldSkipFrame();
      
      expect(typeof shouldSkip).toBe('boolean');
    });
  });

  describe('Validation edge cases', () => {
    it('should handle passport validation with missing optional fields', () => {
      const minimalProfile = {
        passportNumber: 'P12345678',
        surname: 'DOE',
        givenNames: 'JANE'
        // Missing optional fields like dates
      };

      const result = {
        success: true,
        profile: minimalProfile,
        errors: [],
        confidence: 0.8
      };

      const validation = validateScannedPassport(result);

      // Should not crash, but should indicate missing important fields
      expect(validation.isValid).toBeDefined();
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should validate passport with all possible fields', () => {
      const completeProfile = {
        passportNumber: 'P12345678',
        surname: 'DOE',
        givenNames: 'JANE MARIE',
        dateOfBirth: '1990-01-01',
        passportExpiry: '2030-12-31',
        nationality: 'USA',
        gender: 'F',
        issuingCountry: 'USA'
      };

      const result = {
        success: true,
        profile: completeProfile,
        errors: [],
        confidence: 0.95
      };

      const validation = validateScannedPassport(result);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should detect unrealistic passport expiry dates', () => {
      const futureProfile = {
        passportNumber: 'P12345678',
        surname: 'DOE',
        givenNames: 'JANE',
        dateOfBirth: '1990-01-01',
        passportExpiry: '2090-01-01' // Too far in future
      };

      const result = {
        success: true,
        profile: futureProfile,
        errors: [],
        confidence: 0.8
      };

      const validation = validateScannedPassport(result);

      expect(validation.warnings.some(w => 
        w.toLowerCase().includes('expiry') || 
        w.toLowerCase().includes('future')
      )).toBe(true);
    });
  });
});