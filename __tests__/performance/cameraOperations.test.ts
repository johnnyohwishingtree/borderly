// Mock performance API for testing
const performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
};

import { mrzParser } from '../../src/services/passport/mrzParser';
import { qrCapture } from '../../src/services/camera/qrCapture';

/**
 * Performance benchmarks for camera and image processing operations.
 * These tests ensure camera operations meet mobile app performance requirements.
 */

describe('Camera Operations Performance Tests', () => {
  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    mrzParsing: 100, // MRZ parsing should be < 100ms
    qrDetection: 150, // QR detection should be < 150ms
    imagePreprocessing: 50, // Image preprocessing should be < 50ms
    ocrProcessing: 200, // OCR processing should be < 200ms
    cameraInitialization: 500, // Camera initialization should be < 500ms
  };

  describe('MRZ Parsing Performance', () => {
    const validMRZLine1 = 'P<USASMITH<<JOHN<DAVID<<<<<<<<<<<<<<<<<<<<<';
    const validMRZLine2 = 'AB12345671USA9001158M3001152123456789<<<<<<<';

    it('should parse valid MRZ within performance threshold', () => {
      const startTime = performance.now();
      
      const result = mrzParser.parseMRZ([validMRZLine1, validMRZLine2]);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.data?.surname).toBe('SMITH');
      expect(result.data?.givenNames).toBe('JOHN DAVID');
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.mrzParsing);
      
      console.log(`MRZ parsing: ${duration.toFixed(2)}ms`);
    });

    it('should handle malformed MRZ efficiently', () => {
      const malformedMRZ = [
        'INVALID_MRZ_LINE_1_TOO_SHORT',
        'INVALID_MRZ_LINE_2_ALSO_SHORT'
      ];

      const startTime = performance.now();
      
      const result = mrzParser.parseMRZ(malformedMRZ);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(false);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.mrzParsing);
      
      console.log(`Malformed MRZ parsing: ${duration.toFixed(2)}ms`);
    });

    it('should validate MRZ check digits quickly', () => {
      const testCases = [
        { line: validMRZLine1, expectedValid: true },
        { line: validMRZLine2, expectedValid: true },
        { line: 'P<USATEST<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<', expectedValid: false },
        { line: 'AB12345671USA9001158M3001152123456789<<<<<<0', expectedValid: false },
      ];

      testCases.forEach((testCase, index) => {
        const startTime = performance.now();
        
        const isValid = mrzParser.validateCheckDigits(testCase.line);
        
        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(isValid).toBe(testCase.expectedValid);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.mrzParsing / 4); // Should be very fast
        
        console.log(`MRZ check digit validation ${index + 1}: ${duration.toFixed(2)}ms`);
      });
    });

    it('should handle batch MRZ processing efficiently', () => {
      const batchSize = 50;
      const mrzBatch = Array(batchSize).fill([validMRZLine1, validMRZLine2]);

      const startTime = performance.now();
      
      const results = mrzBatch.map(mrz => mrzParser.parseMRZ(mrz));
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const averageDuration = duration / batchSize;

      expect(results.every(r => r.success)).toBe(true);
      expect(averageDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.mrzParsing);
      
      console.log(`Batch MRZ processing (${batchSize} items): ${duration.toFixed(2)}ms total, ${averageDuration.toFixed(2)}ms average`);
    });
  });

  describe('QR Code Detection Performance', () => {
    const mockQRData = 'https://vjw.digital.go.jp/main/#/vjwplo01sch040?qr=ABC123DEF456';
    const mockImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    it('should detect QR code within performance threshold', async () => {
      const startTime = performance.now();
      
      const result = await qrCapture.detectQR(mockImageData);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Mock implementation should return success
      expect(result.success).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.qrDetection);
      
      console.log(`QR detection: ${duration.toFixed(2)}ms`);
    });

    it('should handle multiple QR codes in image efficiently', async () => {
      const multiQRImageData = mockImageData; // Mock data for testing

      const startTime = performance.now();
      
      const result = await qrCapture.detectMultipleQRs(multiQRImageData);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(Array.isArray(result.qrCodes)).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.qrDetection);
      
      console.log(`Multiple QR detection: ${duration.toFixed(2)}ms`);
    });

    it('should validate QR data format quickly', () => {
      const testUrls = [
        'https://vjw.digital.go.jp/main/#/vjwplo01sch040?qr=ABC123',
        'https://mdac.malaysia.gov.my/verify/XYZ789',
        'https://eservices.ica.gov.sg/sgarrivalcard/icaForm?ref=SG123',
        'invalid-url-format',
        'http://malicious-site.com/fake-qr'
      ];

      testUrls.forEach((url, index) => {
        const startTime = performance.now();
        
        const isValid = qrCapture.validateQRFormat(url);
        
        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(typeof isValid).toBe('boolean');
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.qrDetection / 10); // Should be very fast
        
        console.log(`QR validation ${index + 1}: ${duration.toFixed(2)}ms`);
      });
    });

    it('should process QR capture workflow end-to-end efficiently', async () => {
      const startTime = performance.now();
      
      // Simulate complete QR capture workflow
      const detectionResult = await qrCapture.detectQR(mockImageData);
      
      if (detectionResult.success && detectionResult.data) {
        const isValid = qrCapture.validateQRFormat(detectionResult.data);
        const metadata = qrCapture.extractQRMetadata(detectionResult.data);
        const savedResult = await qrCapture.saveQRCode(detectionResult.data, metadata);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.qrDetection + 50); // Allow extra for full workflow
      
      console.log(`Complete QR workflow: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Image Preprocessing Performance', () => {
    const mockImageBuffer = new ArrayBuffer(1024 * 1024); // 1MB mock image
    const mockImageData = new Uint8Array(mockImageBuffer);

    it('should preprocess image for MRZ scanning efficiently', () => {
      const startTime = performance.now();
      
      const preprocessed = mrzParser.preprocessImage(mockImageData);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(preprocessed).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.imagePreprocessing);
      
      console.log(`Image preprocessing for MRZ: ${duration.toFixed(2)}ms`);
    });

    it('should enhance image for QR detection efficiently', () => {
      const startTime = performance.now();
      
      const enhanced = qrCapture.enhanceForQRDetection(mockImageData);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(enhanced).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.imagePreprocessing);
      
      console.log(`Image enhancement for QR: ${duration.toFixed(2)}ms`);
    });

    it('should resize image efficiently for processing', () => {
      const largeImageBuffer = new ArrayBuffer(4 * 1024 * 1024); // 4MB mock image
      const largeImageData = new Uint8Array(largeImageBuffer);

      const startTime = performance.now();
      
      const resized = mrzParser.resizeImage(largeImageData, 800, 600);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(resized).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.imagePreprocessing * 2); // Allow more time for large images
      
      console.log(`Image resizing: ${duration.toFixed(2)}ms`);
    });

    it('should handle image rotation and orientation efficiently', () => {
      const startTime = performance.now();
      
      const rotated = mrzParser.correctOrientation(mockImageData);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(rotated).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.imagePreprocessing);
      
      console.log(`Image rotation/orientation: ${duration.toFixed(2)}ms`);
    });
  });

  describe('OCR Processing Performance', () => {
    const mockTextImage = new Uint8Array(512 * 512); // Mock image with text

    it('should perform OCR text recognition within threshold', async () => {
      const startTime = performance.now();
      
      const text = await mrzParser.performOCR(mockTextImage);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(typeof text).toBe('string');
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.ocrProcessing);
      
      console.log(`OCR text recognition: ${duration.toFixed(2)}ms`);
    });

    it('should handle different image qualities efficiently', async () => {
      const testImages = [
        { name: 'high-quality', data: mockTextImage, expectedTime: PERFORMANCE_THRESHOLDS.ocrProcessing * 0.5 },
        { name: 'medium-quality', data: mockTextImage, expectedTime: PERFORMANCE_THRESHOLDS.ocrProcessing * 0.8 },
        { name: 'low-quality', data: mockTextImage, expectedTime: PERFORMANCE_THRESHOLDS.ocrProcessing },
      ];

      for (const testImage of testImages) {
        const startTime = performance.now();
        
        const text = await mrzParser.performOCR(testImage.data);
        
        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(duration).toBeLessThan(testImage.expectedTime);
        
        console.log(`OCR ${testImage.name}: ${duration.toFixed(2)}ms`);
      }
    });

    it('should batch process OCR requests efficiently', async () => {
      const batchSize = 5;
      const imageBatch = Array(batchSize).fill(mockTextImage);

      const startTime = performance.now();
      
      const results = await Promise.all(
        imageBatch.map(image => mrzParser.performOCR(image))
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const averageDuration = duration / batchSize;

      expect(results).toHaveLength(batchSize);
      expect(averageDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.ocrProcessing);
      
      console.log(`Batch OCR processing (${batchSize} images): ${duration.toFixed(2)}ms total, ${averageDuration.toFixed(2)}ms average`);
    });
  });

  describe('Camera Initialization Performance', () => {
    it('should initialize camera quickly', async () => {
      const startTime = performance.now();
      
      // Mock camera initialization
      const camera = await mrzParser.initializeCamera();
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(camera).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.cameraInitialization);
      
      console.log(`Camera initialization: ${duration.toFixed(2)}ms`);
    });

    it('should switch between camera modes efficiently', async () => {
      const camera = await mrzParser.initializeCamera();

      const startTime = performance.now();
      
      await mrzParser.switchCameraMode(camera, 'mrz-scan');
      await mrzParser.switchCameraMode(camera, 'qr-scan');
      await mrzParser.switchCameraMode(camera, 'photo-capture');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.cameraInitialization / 2);
      
      console.log(`Camera mode switching: ${duration.toFixed(2)}ms`);
    });

    it('should handle camera permission requests efficiently', async () => {
      const startTime = performance.now();
      
      const hasPermission = await mrzParser.requestCameraPermission();
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(typeof hasPermission).toBe('boolean');
      // Permission requests are typically instant (mock) or system-controlled
      expect(duration).toBeLessThan(100);
      
      console.log(`Camera permission request: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Real-world Camera Scenarios', () => {
    it('should handle complete passport scanning workflow efficiently', async () => {
      const startTime = performance.now();
      
      // Simulate complete passport scanning workflow
      const camera = await mrzParser.initializeCamera();
      await mrzParser.switchCameraMode(camera, 'mrz-scan');
      
      const imageData = new Uint8Array(1024 * 768); // Mock camera image
      const preprocessed = mrzParser.preprocessImage(imageData);
      const text = await mrzParser.performOCR(preprocessed);
      
      // Simulate detected MRZ lines from OCR
      const mrzLines = [
        'P<USASMITH<<JOHN<DAVID<<<<<<<<<<<<<<<<<<<<<',
        'AB12345671USA9001158M3001152123456789<<<<<<<'
      ];
      const parsed = mrzParser.parseMRZ(mrzLines);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(parsed.success).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.cameraInitialization + PERFORMANCE_THRESHOLDS.ocrProcessing + PERFORMANCE_THRESHOLDS.mrzParsing);
      
      console.log(`Complete passport scanning workflow: ${duration.toFixed(2)}ms`);
    });

    it('should handle QR code scanning workflow efficiently', async () => {
      const startTime = performance.now();
      
      // Simulate complete QR scanning workflow
      const camera = await qrCapture.initializeCamera();
      await qrCapture.switchCameraMode(camera, 'qr-scan');
      
      const imageData = new Uint8Array(1024 * 768);
      const enhanced = qrCapture.enhanceForQRDetection(imageData);
      const qrResult = await qrCapture.detectQR(enhanced);
      
      if (qrResult.success && qrResult.data) {
        const isValid = qrCapture.validateQRFormat(qrResult.data);
        await qrCapture.saveQRCode(qrResult.data);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.cameraInitialization + PERFORMANCE_THRESHOLDS.qrDetection + 50);
      
      console.log(`Complete QR scanning workflow: ${duration.toFixed(2)}ms`);
    });

    it('should handle camera resource cleanup efficiently', async () => {
      const camera = await mrzParser.initializeCamera();
      
      const startTime = performance.now();
      
      await mrzParser.releaseCamera(camera);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Cleanup should be very fast
      
      console.log(`Camera resource cleanup: ${duration.toFixed(2)}ms`);
    });

    it('should handle memory management during continuous scanning', async () => {
      const camera = await mrzParser.initializeCamera();
      const iterations = 100;
      
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const imageData = new Uint8Array(512 * 384); // Smaller images for stress test
        const processed = mrzParser.preprocessImage(imageData);
        
        // Simulate garbage collection every 10 iterations
        if (i % 10 === 0 && (globalThis as any).gc) {
          (globalThis as any).gc();
        }
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const averageDuration = duration / iterations;

      expect(averageDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.imagePreprocessing);
      
      console.log(`Continuous scanning memory test (${iterations} iterations): ${duration.toFixed(2)}ms total, ${averageDuration.toFixed(2)}ms average`);
    });
  });
});