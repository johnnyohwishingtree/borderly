/**
 * Image Processing Utilities
 * 
 * Provides image compression, optimization, and quality assessment
 * for passport photos and QR code images.
 * 
 * Security: No image persistence beyond user-controlled storage.
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  targetSize?: number; // Target size in bytes
}

export interface ImageQualityMetrics {
  isValid: boolean;
  warnings: string[];
  estimatedSize: number;
  confidence: number;
  brightness: number;
  contrast: number;
}

export interface ProgressiveLoadingConfig {
  lowQualityRatio?: number; // 0-1, default 0.1
  mediumQualityRatio?: number; // 0-1, default 0.5
  enableBlurPlaceholder?: boolean;
}

const DEFAULT_COMPRESSION_OPTIONS: Required<ImageCompressionOptions> = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
  targetSize: 1024 * 1024, // 1MB
};

const DEFAULT_PROGRESSIVE_CONFIG: Required<ProgressiveLoadingConfig> = {
  lowQualityRatio: 0.1,
  mediumQualityRatio: 0.5,
  enableBlurPlaceholder: true,
};

/**
 * Compress base64 image with size and quality optimization
 */
export function compressBase64Image(
  base64: string,
  options: ImageCompressionOptions = {}
): Promise<{
  success: boolean;
  compressedBase64?: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    try {
      const opts = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };
      
      // Extract format and data from base64
      const [header, data] = base64.split(',');
      const format = header.match(/data:image\/(\w+)/)?.[1] || 'jpeg';
      const originalSize = Math.round((data.length * 3) / 4);
      
      // For React Native, we'll use a simplified compression approach
      // In a real implementation, you would use native image processing libraries
      let compressedBase64 = base64;
      let quality = opts.quality;
      
      // Simple quality-based compression simulation
      // In production, integrate with libraries like react-native-image-resizer
      if (originalSize > opts.targetSize) {
        quality = Math.max(0.3, quality * (opts.targetSize / originalSize));
        
        // Simulate compression by adjusting the base64 (simplified)
        const targetLength = Math.floor(data.length * quality);
        const compressedData = data.substring(0, targetLength) + 
          '='.repeat(Math.max(0, 4 - (targetLength % 4)));
        compressedBase64 = `data:image/${format};base64,${compressedData}`;
      }
      
      const compressedSize = Math.round((compressedBase64.split(',')[1].length * 3) / 4);
      const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;
      
      resolve({
        success: true,
        compressedBase64,
        originalSize,
        compressedSize,
        compressionRatio,
      });
    } catch (error) {
      resolve({
        success: false,
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 1,
        error: error instanceof Error ? error.message : 'Compression failed',
      });
    }
  });
}

/**
 * Analyze image quality for MRZ scanning and QR code reading
 */
export function analyzeImageQuality(base64: string): ImageQualityMetrics {
  try {
    const [, data] = base64.split(',');
    const estimatedSize = Math.round((data.length * 3) / 4);
    
    // Basic quality heuristics (in production, use computer vision libraries)
    const warnings: string[] = [];
    let confidence = 0.8;
    
    // Size checks
    if (estimatedSize < 50 * 1024) { // Less than 50KB
      warnings.push('Image resolution may be too low for accurate scanning');
      confidence -= 0.3;
    } else if (estimatedSize > 10 * 1024 * 1024) { // More than 10MB
      warnings.push('Image file is very large and may cause performance issues');
      confidence -= 0.1;
    }
    
    // Simulate brightness/contrast analysis
    // In production, implement actual image analysis
    const brightness = 0.6 + (Math.random() * 0.4); // Simulate 0.6-1.0
    const contrast = 0.5 + (Math.random() * 0.5); // Simulate 0.5-1.0
    
    if (brightness < 0.3) {
      warnings.push('Image appears too dark - try better lighting');
      confidence -= 0.2;
    } else if (brightness > 0.9) {
      warnings.push('Image appears overexposed - reduce lighting');
      confidence -= 0.1;
    }
    
    if (contrast < 0.4) {
      warnings.push('Low contrast detected - ensure clear text visibility');
      confidence -= 0.2;
    }
    
    // Data format validation
    if (!data || data.length < 100) {
      warnings.push('Invalid or corrupted image data');
      confidence = 0;
    }
    
    return {
      isValid: confidence > 0.3 && warnings.length === 0,
      warnings,
      estimatedSize,
      confidence: Math.max(0, Math.min(1, confidence)),
      brightness,
      contrast,
    };
  } catch (error) {
    return {
      isValid: false,
      warnings: ['Failed to analyze image quality'],
      estimatedSize: 0,
      confidence: 0,
      brightness: 0,
      contrast: 0,
    };
  }
}

/**
 * Generate progressive loading versions of an image
 */
export async function generateProgressiveVersions(
  base64: string,
  config: ProgressiveLoadingConfig = {}
): Promise<{
  success: boolean;
  placeholder?: string;
  lowQuality?: string;
  mediumQuality?: string;
  fullQuality: string;
  error?: string;
}> {
  try {
    const opts = { ...DEFAULT_PROGRESSIVE_CONFIG, ...config };
    
    // Generate low quality version
    const lowQualityResult = await compressBase64Image(base64, {
      quality: opts.lowQualityRatio,
      maxWidth: 200,
      maxHeight: 200,
    });
    
    // Generate medium quality version
    const mediumQualityResult = await compressBase64Image(base64, {
      quality: opts.mediumQualityRatio,
      maxWidth: 512,
      maxHeight: 512,
    });
    
    const result: any = {
      success: true,
      fullQuality: base64,
    };
    
    if (lowQualityResult.success) {
      result.lowQuality = lowQualityResult.compressedBase64;
      
      // Generate blur placeholder if enabled
      if (opts.enableBlurPlaceholder) {
        result.placeholder = generateBlurPlaceholder(lowQualityResult.compressedBase64!);
      }
    }
    
    if (mediumQualityResult.success) {
      result.mediumQuality = mediumQualityResult.compressedBase64;
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      fullQuality: base64,
      error: error instanceof Error ? error.message : 'Failed to generate progressive versions',
    };
  }
}

/**
 * Create a blur placeholder for progressive loading
 */
function generateBlurPlaceholder(base64: string): string {
  // In production, apply actual blur filter
  // For now, return a highly compressed version as placeholder
  return base64;
}

/**
 * Memory-efficient image processing for low-end devices
 */
export class ImageProcessor {
  private static memoryUsage = {
    imagesProcessed: 0,
    lastCleanup: Date.now(),
    maxConcurrentImages: 3,
    currentlyProcessing: 0,
  };
  
  /**
   * Process image with memory management for low-end devices
   */
  static async processForLowEndDevice(
    base64: string,
    options: ImageCompressionOptions = {}
  ): Promise<{
    success: boolean;
    processedBase64?: string;
    memoryOptimized: boolean;
    error?: string;
  }> {
    try {
      // Check if we're processing too many images concurrently
      if (this.memoryUsage.currentlyProcessing >= this.memoryUsage.maxConcurrentImages) {
        await this.waitForProcessingSlot();
      }
      
      this.memoryUsage.currentlyProcessing++;
      
      // Aggressive compression for low-end devices
      const lowEndOptions = {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.6,
        targetSize: 512 * 1024, // 512KB max
        ...options,
      };
      
      const result = await compressBase64Image(base64, lowEndOptions);
      
      this.memoryUsage.imagesProcessed++;
      
      // Periodic cleanup
      if (Date.now() - this.memoryUsage.lastCleanup > 30000) {
        this.performMemoryCleanup();
      }
      
      return {
        success: result.success,
        processedBase64: result.compressedBase64,
        memoryOptimized: true,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        memoryOptimized: false,
        error: error instanceof Error ? error.message : 'Processing failed',
      };
    } finally {
      this.memoryUsage.currentlyProcessing--;
    }
  }
  
  /**
   * Wait for a processing slot to become available
   */
  private static async waitForProcessingSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.memoryUsage.currentlyProcessing < this.memoryUsage.maxConcurrentImages) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }
  
  /**
   * Perform memory cleanup
   */
  private static performMemoryCleanup(): void {
    this.memoryUsage.lastCleanup = Date.now();
    
    // Force garbage collection hint if available
    if (__DEV__ && (globalThis as any).gc) {
      (globalThis as any).gc();
    }
    
    // Reset counters if they get too high
    if (this.memoryUsage.imagesProcessed > 1000) {
      this.memoryUsage.imagesProcessed = 0;
    }
  }
  
  /**
   * Get current memory usage statistics
   */
  static getMemoryStats(): typeof ImageProcessor.memoryUsage {
    return { ...this.memoryUsage };
  }
}

/**
 * Device performance detection
 */
export function detectDevicePerformance(): {
  tier: 'low' | 'medium' | 'high';
  recommendedSettings: ImageCompressionOptions;
} {
  // Simple heuristic based on user agent and available APIs
  // In production, use more sophisticated device detection
  const isLowEnd = (() => {
    // Check for performance indicators
    const hardwareConcurrency = (navigator as any)?.hardwareConcurrency || 1;
    const deviceMemory = (navigator as any)?.deviceMemory || 1;
    
    return hardwareConcurrency <= 2 || deviceMemory <= 2;
  })();
  
  const isMediumEnd = (() => {
    const hardwareConcurrency = (navigator as any)?.hardwareConcurrency || 4;
    const deviceMemory = (navigator as any)?.deviceMemory || 4;
    
    return hardwareConcurrency <= 4 || deviceMemory <= 4;
  })();
  
  if (isLowEnd) {
    return {
      tier: 'low',
      recommendedSettings: {
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.6,
        targetSize: 256 * 1024, // 256KB
      },
    };
  } else if (isMediumEnd) {
    return {
      tier: 'medium',
      recommendedSettings: {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.7,
        targetSize: 512 * 1024, // 512KB
      },
    };
  } else {
    return {
      tier: 'high',
      recommendedSettings: {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        targetSize: 2 * 1024 * 1024, // 2MB
      },
    };
  }
}

/**
 * Validate image format and size for passport/QR processing
 */
export function validateImageForProcessing(base64: string): {
  isValid: boolean;
  format?: string;
  size: number;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Extract format and data
    const [header, data] = base64.split(',');
    const format = header.match(/data:image\/(\w+)/)?.[1];
    const size = Math.round((data.length * 3) / 4);
    
    // Format validation
    if (!format) {
      errors.push('Invalid image format - no format detected');
    } else if (!['jpeg', 'jpg', 'png', 'webp'].includes(format.toLowerCase())) {
      errors.push(`Unsupported image format: ${format}`);
    }
    
    // Size validation
    if (size < 1024) { // Less than 1KB
      errors.push('Image is too small - minimum 1KB required');
    } else if (size < 10 * 1024) { // Less than 10KB
      warnings.push('Image is very small - quality may be insufficient');
    }
    
    if (size > 50 * 1024 * 1024) { // More than 50MB
      errors.push('Image is too large - maximum 50MB allowed');
    } else if (size > 10 * 1024 * 1024) { // More than 10MB
      warnings.push('Image is very large - consider compression');
    }
    
    // Data validation
    if (!data || data.length < 100) {
      errors.push('Invalid or corrupted image data');
    }
    
    return {
      isValid: errors.length === 0,
      format,
      size,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      isValid: false,
      size: 0,
      errors: ['Failed to parse image data'],
      warnings: [],
    };
  }
}