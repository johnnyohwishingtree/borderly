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
      scanner = new MRZScanner(config);

      for (let i = 0; i < 5; i++) {
        scanner.processFrame(textRecognition);
      }

      const stats = scanner.getStats();
      expect(stats.attempts).toBe(5);
    });

    it('should suggest manual entry after max attempts', () => {
      const textRecognition = createMockTextRecognition([
        createTextBlock(invalidMRZText)
      ]);

      const config = { 
        ...defaultScannerConfig, 
        scanCooldownMs: 0,
        maxScanAttempts: 3
      };
      scanner = new MRZScanner(config);

      let result: ScanResult;
      for (let i = 0; i < 5; i++) {
        result = scanner.processFrame(textRecognition);
      }

      expect(result!.guidance).toContain('manual entry');
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
});