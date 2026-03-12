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

const DEFAULT_PROGRESSIVE_CONFIG: Required<ProgressiveLoadingConfig> = {
  lowQualityRatio: 0.1,
  mediumQualityRatio: 0.5,
  enableBlurPlaceholder: true,
};

/**
 * Compress base64 image with size and quality optimization
 * 
 * WARNING: This is a placeholder implementation for development.
 * In production, use proper image processing libraries like:
 * - react-native-image-resizer
 * - expo-image-manipulator 
 * - react-native-image-editor
 */
export function compressBase64Image(
  base64: string,
  _options: ImageCompressionOptions = {}
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
      // Extract format and data from base64
      const [, data] = base64.split(',');
      const originalSize = Math.round((data.length * 3) / 4);
      
      // PLACEHOLDER: Return original image since proper compression requires native libraries
      // This prevents data corruption while maintaining the API contract
      console.warn('[DEV] Using placeholder image compression. Integrate react-native-image-resizer for production.');
      
      resolve({
        success: true,
        compressedBase64: base64, // Return original to prevent corruption
        originalSize,
        compressedSize: originalSize, // Same size since no compression
        compressionRatio: 1, // No compression ratio
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
 * Basic image validation and size analysis
 * 
 * WARNING: This is a simplified placeholder that only validates format and size.
 * For production quality analysis, integrate computer vision libraries that can
 * analyze actual brightness, contrast, sharpness, and other quality metrics.
 */
export function analyzeImageQuality(base64: string): ImageQualityMetrics {
  try {
    const [, data] = base64.split(',');
    const estimatedSize = Math.round((data.length * 3) / 4);
    
    const warnings: string[] = [];
    let confidence = 0.8;
    
    // Only perform basic size and format validation
    if (estimatedSize < 50 * 1024) { // Less than 50KB
      warnings.push('Image resolution may be too low for accurate scanning');
      confidence -= 0.3;
    } else if (estimatedSize > 10 * 1024 * 1024) { // More than 10MB
      warnings.push('Image file is very large and may cause performance issues');
      confidence -= 0.1;
    }
    
    // Data format validation
    if (!data || data.length < 100) {
      warnings.push('Invalid or corrupted image data');
      confidence = 0;
    }
    
    // Return neutral values for brightness/contrast since we can't analyze them
    const brightness = 0.5; // Neutral value
    const contrast = 0.5; // Neutral value
    
    return {
      isValid: confidence > 0.3 && warnings.length === 0,
      warnings,
      estimatedSize,
      confidence: Math.max(0, Math.min(1, confidence)),
      brightness,
      contrast,
    };
  } catch {
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
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
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
      
      const processResult: {
        success: boolean;
        processedBase64?: string;
        originalSize: number;
        compressedSize: number;
        compressionRatio: number;
        memoryOptimized: boolean;
        error?: string;
      } = {
        success: result.success,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: result.compressionRatio,
        memoryOptimized: true,
      };
      if (result.compressedBase64) {
        processResult.processedBase64 = result.compressedBase64;
      }
      if (result.error) {
        processResult.error = result.error;
      }
      return processResult;
    } catch (error) {
      return {
        success: false,
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 1,
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
  const nav = (typeof navigator !== 'undefined' ? navigator : null) as any;
  
  const isLowEnd = (() => {
    // Check for performance indicators
    const hardwareConcurrency = nav?.hardwareConcurrency || 1;
    const deviceMemory = nav?.deviceMemory || 1;
    
    return hardwareConcurrency <= 2 || deviceMemory <= 2;
  })();
  
  const isMediumEnd = (() => {
    const hardwareConcurrency = nav?.hardwareConcurrency || 4;
    const deviceMemory = nav?.deviceMemory || 4;
    
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
    
    const validationResult: {
      isValid: boolean;
      format?: string;
      size: number;
      errors: string[];
      warnings: string[];
    } = {
      isValid: errors.length === 0,
      size,
      errors,
      warnings,
    };
    if (format) {
      validationResult.format = format;
    }
    return validationResult;
  } catch {
    return {
      isValid: false,
      size: 0,
      errors: ['Failed to parse image data'],
      warnings: [],
    };
  }
}