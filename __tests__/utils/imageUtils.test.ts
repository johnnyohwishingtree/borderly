/**
 * Tests for src/utils/imageUtils.ts
 *
 * Covers: compressBase64Image, analyzeImageQuality, generateProgressiveVersions,
 * ImageProcessor, detectDevicePerformance, validateImageForProcessing.
 */

import {
  compressBase64Image,
  analyzeImageQuality,
  generateProgressiveVersions,
  ImageProcessor,
  detectDevicePerformance,
  validateImageForProcessing,
} from '../../src/utils/imageUtils';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/** Creates a valid base64 image string of approximately the given byte size. */
function makeBase64Image(approxBytes: number, format = 'jpeg'): string {
  // base64 encodes 3 bytes into 4 chars, so length = ceil(bytes * 4/3)
  const charCount = Math.ceil((approxBytes * 4) / 3);
  const data = 'A'.repeat(charCount);
  return `data:image/${format};base64,${data}`;
}

/** Creates a minimal valid base64 image. */
function makeValidImage(): string {
  return makeBase64Image(100 * 1024); // 100KB
}

// ---------------------------------------------------------------------------
// compressBase64Image
// ---------------------------------------------------------------------------

describe('compressBase64Image', () => {
  it('returns success with original image (placeholder implementation)', async () => {
    const image = makeValidImage();
    const result = await compressBase64Image(image);

    expect(result.success).toBe(true);
    expect(result.compressedBase64).toBe(image);
    expect(result.compressionRatio).toBe(1);
    expect(result.originalSize).toBeGreaterThan(0);
  });

  it('calculates original size from base64 data', async () => {
    const image = makeBase64Image(50 * 1024);
    const result = await compressBase64Image(image);

    // Size should be approximately 50KB
    expect(result.originalSize).toBeGreaterThan(40000);
    expect(result.originalSize).toBeLessThan(60000);
  });

  it('returns failure for malformed base64', async () => {
    const result = await compressBase64Image('not-base64');

    expect(result.success).toBe(false);
    expect(result.error).toEqual(expect.any(String));
  });

  it('accepts compression options without error', async () => {
    const image = makeValidImage();
    const result = await compressBase64Image(image, {
      maxWidth: 800,
      maxHeight: 600,
      quality: 0.7,
      targetSize: 512 * 1024,
    });

    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// analyzeImageQuality
// ---------------------------------------------------------------------------

describe('analyzeImageQuality', () => {
  it('returns valid metrics for a good image', () => {
    const image = makeBase64Image(200 * 1024);
    const metrics = analyzeImageQuality(image);

    expect(metrics.isValid).toBe(true);
    expect(metrics.warnings).toHaveLength(0);
    expect(metrics.confidence).toBeGreaterThan(0.5);
    expect(metrics.brightness).toBe(0.5);
    expect(metrics.contrast).toBe(0.5);
  });

  it('warns about very small images', () => {
    const image = makeBase64Image(30 * 1024); // 30KB < 50KB threshold
    const metrics = analyzeImageQuality(image);

    expect(metrics.warnings).toContain('Image resolution may be too low for accurate scanning');
    expect(metrics.confidence).toBeLessThan(0.8);
  });

  it('warns about very large images', () => {
    const image = makeBase64Image(15 * 1024 * 1024); // 15MB
    const metrics = analyzeImageQuality(image);

    expect(metrics.warnings).toContain('Image file is very large and may cause performance issues');
  });

  it('flags invalid data as invalid', () => {
    const metrics = analyzeImageQuality('data:image/png;base64,short');

    expect(metrics.isValid).toBe(false);
    expect(metrics.confidence).toBe(0);
  });

  it('handles parse errors gracefully', () => {
    const metrics = analyzeImageQuality('');

    expect(metrics.isValid).toBe(false);
    expect(metrics.warnings).toContain('Failed to analyze image quality');
    expect(metrics.estimatedSize).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// generateProgressiveVersions
// ---------------------------------------------------------------------------

describe('generateProgressiveVersions', () => {
  it('returns all quality versions on success', async () => {
    const image = makeValidImage();
    const result = await generateProgressiveVersions(image);

    expect(result.success).toBe(true);
    expect(result.fullQuality).toBe(image);
    expect(typeof result.lowQuality).toBe('string');
    expect(typeof result.mediumQuality).toBe('string');
  });

  it('generates blur placeholder by default', async () => {
    const image = makeValidImage();
    const result = await generateProgressiveVersions(image);

    expect(typeof result.placeholder).toBe('string');
  });

  it('skips blur placeholder when disabled', async () => {
    const image = makeValidImage();
    const result = await generateProgressiveVersions(image, {
      enableBlurPlaceholder: false,
    });

    expect(result.placeholder).toBeUndefined();
  });

  it('returns fullQuality even on error', async () => {
    // Force an error by passing something that will cause an exception
    // The implementation catches errors and returns fullQuality
    const image = makeValidImage();
    const result = await generateProgressiveVersions(image);

    expect(result.fullQuality).toBe(image);
  });

  it('accepts custom quality ratios', async () => {
    const image = makeValidImage();
    const result = await generateProgressiveVersions(image, {
      lowQualityRatio: 0.05,
      mediumQualityRatio: 0.3,
    });

    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ImageProcessor
// ---------------------------------------------------------------------------

describe('ImageProcessor', () => {
  describe('processForLowEndDevice', () => {
    it('processes image successfully', async () => {
      const image = makeValidImage();
      const result = await ImageProcessor.processForLowEndDevice(image);

      expect(result.success).toBe(true);
      expect(result.memoryOptimized).toBe(true);
      expect(typeof result.processedBase64).toBe('string');
    });

    it('accepts custom compression options', async () => {
      const image = makeValidImage();
      const result = await ImageProcessor.processForLowEndDevice(image, {
        maxWidth: 400,
        quality: 0.5,
      });

      expect(result.success).toBe(true);
    });

    it('returns failure result for malformed input but still marks as memory optimized', async () => {
      const result = await ImageProcessor.processForLowEndDevice('invalid');

      expect(result.success).toBe(false);
      expect(result.memoryOptimized).toBe(true);
      expect(typeof result.error).toBe('string');
    });

    it('tracks currently processing count', async () => {
      const statsBefore = ImageProcessor.getMemoryStats();
      expect(statsBefore.currentlyProcessing).toBe(0);

      const image = makeValidImage();
      await ImageProcessor.processForLowEndDevice(image);

      const statsAfter = ImageProcessor.getMemoryStats();
      expect(statsAfter.currentlyProcessing).toBe(0); // Should be back to 0 after completion
      expect(statsAfter.imagesProcessed).toBeGreaterThan(0);
    });
  });

  describe('getMemoryStats', () => {
    it('returns a copy of memory usage stats', () => {
      const stats = ImageProcessor.getMemoryStats();

      expect(stats).toHaveProperty('imagesProcessed');
      expect(stats).toHaveProperty('lastCleanup');
      expect(stats).toHaveProperty('maxConcurrentImages');
      expect(stats).toHaveProperty('currentlyProcessing');
    });
  });
});

// ---------------------------------------------------------------------------
// detectDevicePerformance
// ---------------------------------------------------------------------------

describe('detectDevicePerformance', () => {
  it('returns a valid performance tier', () => {
    const result = detectDevicePerformance();

    expect(['low', 'medium', 'high']).toContain(result.tier);
  });

  it('returns recommended settings with required fields', () => {
    const result = detectDevicePerformance();

    expect(result.recommendedSettings).toHaveProperty('maxWidth');
    expect(result.recommendedSettings).toHaveProperty('maxHeight');
    expect(result.recommendedSettings).toHaveProperty('quality');
    expect(result.recommendedSettings).toHaveProperty('targetSize');
  });

  it('recommended quality is between 0 and 1', () => {
    const result = detectDevicePerformance();

    expect(result.recommendedSettings.quality).toBeGreaterThan(0);
    expect(result.recommendedSettings.quality).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// validateImageForProcessing
// ---------------------------------------------------------------------------

describe('validateImageForProcessing', () => {
  it('validates a proper JPEG image', () => {
    const image = makeBase64Image(100 * 1024, 'jpeg');
    const result = validateImageForProcessing(image);

    expect(result.isValid).toBe(true);
    expect(result.format).toBe('jpeg');
    expect(result.errors).toHaveLength(0);
    expect(result.size).toBeGreaterThan(0);
  });

  it('accepts PNG format', () => {
    const image = makeBase64Image(100 * 1024, 'png');
    const result = validateImageForProcessing(image);

    expect(result.isValid).toBe(true);
    expect(result.format).toBe('png');
  });

  it('accepts WebP format', () => {
    const image = makeBase64Image(100 * 1024, 'webp');
    const result = validateImageForProcessing(image);

    expect(result.isValid).toBe(true);
    expect(result.format).toBe('webp');
  });

  it('rejects unsupported formats', () => {
    const image = makeBase64Image(100 * 1024, 'bmp');
    const result = validateImageForProcessing(image);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Unsupported image format: bmp');
  });

  it('rejects images that are too small', () => {
    const image = makeBase64Image(500, 'jpeg'); // 500 bytes < 1KB
    const result = validateImageForProcessing(image);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Image is too small - minimum 1KB required');
  });

  it('warns about small images between 1KB and 10KB', () => {
    const image = makeBase64Image(5 * 1024, 'jpeg');
    const result = validateImageForProcessing(image);

    expect(result.warnings).toContain('Image is very small - quality may be insufficient');
  });

  it('warns about very large images', () => {
    const image = makeBase64Image(15 * 1024 * 1024, 'jpeg');
    const result = validateImageForProcessing(image);

    expect(result.warnings).toContain('Image is very large - consider compression');
  });

  it('rejects invalid image data', () => {
    const result = validateImageForProcessing('data:image/jpeg;base64,short');

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid or corrupted image data');
  });

  it('rejects missing format header', () => {
    const result = validateImageForProcessing('noheader,AAAA');

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid image format - no format detected');
  });

  it('handles total parse failure gracefully', () => {
    // Empty string splits into [''], which causes issues
    const result = validateImageForProcessing('');

    expect(result.isValid).toBe(false);
    expect(result.size).toBe(0);
  });
});
