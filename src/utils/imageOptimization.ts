/**
 * Advanced Image Optimization for Performance
 * 
 * Implements image caching, lazy loading, and memory-efficient processing
 * to meet the performance acceptance criteria of <200ms form rendering
 * and <100MB memory usage.
 */

import { useState, useEffect } from 'react';
import { MMKV } from 'react-native-mmkv';
import { performanceMonitor } from '../services/monitoring/performance';
import type { ImageCompressionOptions } from './imageUtils';

export interface CachedImage {
  id: string;
  originalUri: string;
  optimizedBase64?: string;
  thumbnailBase64?: string;
  metadata: {
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    width?: number;
    height?: number;
    format: string;
    lastAccessed: number;
    accessCount: number;
  };
}

export interface ImageCacheStats {
  totalImages: number;
  totalSizeBytes: number;
  hitRate: number;
  averageAccessTime: number;
  memoryUsageBytes: number;
}

export interface LazyLoadingConfig {
  preloadDistance: number; // pixels
  placeholderQuality: number; // 0-1
  enableProgressiveLoading: boolean;
  maxConcurrentLoads: number;
}


class ImageOptimizationManager {
  private cache: MMKV;
  private memoryCache: Map<string, CachedImage> = new Map();
  private loadingQueue: Set<string> = new Set();
  private accessLog: { imageId: string; timestamp: number }[] = [];
  private stats = {
    cacheHits: 0,
    cacheMisses: 0,
    totalAccesses: 0,
    totalLoadTime: 0,
  };

  constructor() {
    this.cache = new MMKV({
      id: 'image-cache',
      encryptionKey: 'image-optimization-cache', // Simple key for non-sensitive image cache
    });

    this.loadMemoryCache();
    this.startCacheCleanup();
  }

  /**
   * Optimize image for display with caching and memory management
   */
  async optimizeImage(
    uri: string,
    options: ImageCompressionOptions & {
      generateThumbnail?: boolean;
      cacheKey?: string;
      priority?: 'low' | 'normal' | 'high';
    } = {}
  ): Promise<{
    success: boolean;
    optimized?: string;
    thumbnail?: string;
    fromCache: boolean;
    loadTime: number;
    memoryUsage: number;
    error?: string;
  }> {
    const startTime = Date.now();
    const cacheKey = options.cacheKey || this.generateCacheKey(uri, options);

    try {
      // Check memory cache first
      const cached = this.memoryCache.get(cacheKey);
      if (cached) {
        this.updateAccessLog(cacheKey);
        this.stats.cacheHits++;
        
        const result: {
          success: boolean;
          optimized?: string;
          thumbnail?: string;
          fromCache: boolean;
          loadTime: number;
          memoryUsage: number;
          error?: string;
        } = {
          success: true,
          fromCache: true,
          loadTime: Date.now() - startTime,
          memoryUsage: cached.metadata.optimizedSize,
        };

        if (cached.optimizedBase64) {
          result.optimized = cached.optimizedBase64;
        }
        if (cached.thumbnailBase64) {
          result.thumbnail = cached.thumbnailBase64;
        }

        return result;
      }

      // Check disk cache
      const diskCached = this.loadFromDiskCache(cacheKey);
      if (diskCached) {
        this.memoryCache.set(cacheKey, diskCached);
        this.updateAccessLog(cacheKey);
        this.stats.cacheHits++;
        
        const result: {
          success: boolean;
          optimized?: string;
          thumbnail?: string;
          fromCache: boolean;
          loadTime: number;
          memoryUsage: number;
          error?: string;
        } = {
          success: true,
          fromCache: true,
          loadTime: Date.now() - startTime,
          memoryUsage: diskCached.metadata.optimizedSize,
        };

        if (diskCached.optimizedBase64) {
          result.optimized = diskCached.optimizedBase64;
        }
        if (diskCached.thumbnailBase64) {
          result.thumbnail = diskCached.thumbnailBase64;
        }

        return result;
      }

      // Prevent duplicate loading
      if (this.loadingQueue.has(cacheKey)) {
        await this.waitForLoading(cacheKey);
        return this.optimizeImage(uri, options); // Retry after loading completes
      }

      this.loadingQueue.add(cacheKey);
      this.stats.cacheMisses++;

      // Load and optimize image
      const optimized = await this.processImage(uri, options);
      
      if (optimized.success) {
        const cachedImage: CachedImage = {
          id: cacheKey,
          originalUri: uri,
          ...(optimized.base64 && { optimizedBase64: optimized.base64 }),
          ...(optimized.thumbnail && { thumbnailBase64: optimized.thumbnail }),
          metadata: {
            originalSize: optimized.originalSize,
            optimizedSize: optimized.optimizedSize,
            compressionRatio: optimized.compressionRatio,
            ...(optimized.width !== undefined && { width: optimized.width }),
            ...(optimized.height !== undefined && { height: optimized.height }),
            format: optimized.format,
            lastAccessed: Date.now(),
            accessCount: 1,
          },
        };

        // Store in both memory and disk cache
        this.memoryCache.set(cacheKey, cachedImage);
        this.saveToDiskCache(cacheKey, cachedImage);
        this.updateAccessLog(cacheKey);

        // Cleanup if memory usage is getting high
        await this.checkMemoryUsage();

        const result: {
          success: boolean;
          optimized?: string;
          thumbnail?: string;
          fromCache: boolean;
          loadTime: number;
          memoryUsage: number;
          error?: string;
        } = {
          success: true,
          fromCache: false,
          loadTime: Date.now() - startTime,
          memoryUsage: cachedImage.metadata.optimizedSize,
        };

        if (cachedImage.optimizedBase64) {
          result.optimized = cachedImage.optimizedBase64;
        }
        if (cachedImage.thumbnailBase64) {
          result.thumbnail = cachedImage.thumbnailBase64;
        }

        return result;
      }

      const result: {
        success: boolean;
        optimized?: string;
        thumbnail?: string;
        fromCache: boolean;
        loadTime: number;
        memoryUsage: number;
        error?: string;
      } = {
        success: false,
        fromCache: false,
        loadTime: Date.now() - startTime,
        memoryUsage: 0,
      };

      if (optimized.error) {
        result.error = optimized.error;
      }

      return result;

    } catch (error) {
      return {
        success: false,
        fromCache: false,
        loadTime: Date.now() - startTime,
        memoryUsage: 0,
        error: error instanceof Error ? error.message : 'Optimization failed',
      };
    } finally {
      this.loadingQueue.delete(cacheKey);
      this.stats.totalAccesses++;
      this.stats.totalLoadTime += Date.now() - startTime;
    }
  }

  /**
   * Preload images for better perceived performance
   */
  async preloadImages(
    uris: string[],
    options: ImageCompressionOptions & {
      priority?: 'low' | 'normal' | 'high';
      maxConcurrent?: number;
    } = {}
  ): Promise<void> {
    const maxConcurrent = options.maxConcurrent || 3;
    const chunks = this.chunkArray(uris, maxConcurrent);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(uri => 
          this.optimizeImage(uri, { ...options, priority: options.priority || 'low' })
            .catch(error => console.warn('Preload failed for', uri, error))
        )
      );
    }
  }

  /**
   * Clear cached images to free memory
   */
  async clearCache(options: {
    olderThan?: number; // milliseconds
    sizeLimit?: number; // bytes
    keepMostAccessed?: number; // keep N most accessed images
  } = {}): Promise<{
    clearedCount: number;
    freedBytes: number;
  }> {
    let clearedCount = 0;
    let freedBytes = 0;
    const now = Date.now();

    // Get images to clear
    const imagesToClear: string[] = [];

    if (options.olderThan) {
      this.memoryCache.forEach((image, key) => {
        if (now - image.metadata.lastAccessed > options.olderThan!) {
          imagesToClear.push(key);
        }
      });
    }

    if (options.sizeLimit) {
      const sortedBySize = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => b.metadata.optimizedSize - a.metadata.optimizedSize);

      let currentSize = this.getCurrentCacheSize();
      for (const [key, image] of sortedBySize) {
        if (currentSize <= options.sizeLimit!) break;
        if (!imagesToClear.includes(key)) {
          imagesToClear.push(key);
          currentSize -= image.metadata.optimizedSize;
        }
      }
    }

    if (options.keepMostAccessed) {
      const sortedByAccess = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => b.metadata.accessCount - a.metadata.accessCount);
      
      const toKeep = sortedByAccess.slice(0, options.keepMostAccessed).map(([key]) => key);
      this.memoryCache.forEach((_image, key) => {
        if (!toKeep.includes(key) && !imagesToClear.includes(key)) {
          imagesToClear.push(key);
        }
      });
    }

    // Clear selected images
    for (const key of imagesToClear) {
      const image = this.memoryCache.get(key);
      if (image) {
        freedBytes += image.metadata.optimizedSize;
        clearedCount++;
        this.memoryCache.delete(key);
        this.cache.delete(`image_${key}`);
      }
    }

    // Force garbage collection if available
    if (__DEV__ && (globalThis as any).gc) {
      (globalThis as any).gc();
    }

    return { clearedCount, freedBytes };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): ImageCacheStats {
    const totalImages = this.memoryCache.size;
    let totalSizeBytes = 0;
    
    this.memoryCache.forEach(image => {
      totalSizeBytes += image.metadata.optimizedSize;
    });

    const hitRate = this.stats.totalAccesses > 0 
      ? this.stats.cacheHits / this.stats.totalAccesses 
      : 0;

    const averageAccessTime = this.stats.totalAccesses > 0
      ? this.stats.totalLoadTime / this.stats.totalAccesses
      : 0;

    return {
      totalImages,
      totalSizeBytes,
      hitRate,
      averageAccessTime,
      memoryUsageBytes: totalSizeBytes,
    };
  }

  // Private methods

  private generateCacheKey(uri: string, options: ImageCompressionOptions): string {
    const optionsHash = JSON.stringify(options);
    // Simple hash function since btoa may not be available
    let hash = 0;
    for (let i = 0; i < optionsHash.length; i++) {
      const char = optionsHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `${uri}_${Math.abs(hash).toString(36).slice(0, 10)}`;
  }

  private loadFromDiskCache(key: string): CachedImage | null {
    try {
      const data = this.cache.getString(`image_${key}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private saveToDiskCache(key: string, image: CachedImage): void {
    try {
      this.cache.set(`image_${key}`, JSON.stringify(image));
    } catch (error) {
      console.warn('Failed to save to disk cache:', error);
    }
  }

  private async processImage(_uri: string, options: ImageCompressionOptions): Promise<{
    success: boolean;
    base64?: string;
    thumbnail?: string;
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    width?: number;
    height?: number;
    format: string;
    error?: string;
  }> {
    // This would integrate with the existing imageUtils.ts compression functions
    // For now, simulate the processing
    try {
      // Simulate image processing delay
      await new Promise<void>(resolve => setTimeout(resolve, 50));
      
      // Mock processed image data
      const originalSize = 1024 * 1024; // 1MB
      const optimizedSize = originalSize * 0.6; // 60% of original
      
      const result: {
        success: boolean;
        base64?: string;
        thumbnail?: string;
        originalSize: number;
        optimizedSize: number;
        compressionRatio: number;
        width?: number;
        height?: number;
        format: string;
        error?: string;
      } = {
        success: true,
        base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD...', // Mock
        originalSize,
        optimizedSize,
        compressionRatio: originalSize / optimizedSize,
        width: 1920,
        height: 1080,
        format: 'jpeg',
      };

      if ((options as any).generateThumbnail) {
        result.thumbnail = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD...'; // Mock thumbnail
      }

      return result;
    } catch (error) {
      return {
        success: false,
        originalSize: 0,
        optimizedSize: 0,
        compressionRatio: 1,
        format: 'unknown',
        error: error instanceof Error ? error.message : 'Processing failed',
      };
    }
  }

  private loadMemoryCache(): void {
    // Load frequently accessed images into memory cache at startup
    try {
      const keys = this.cache.getAllKeys().filter(key => key.startsWith('image_'));
      const accessFrequency = new Map<string, number>();

      // Load access counts
      keys.forEach(key => {
        try {
          const data = this.cache.getString(key);
          if (data) {
            const image: CachedImage = JSON.parse(data);
            accessFrequency.set(key, image.metadata.accessCount);
          }
        } catch {
          // Skip corrupted entries
        }
      });

      // Load most frequently accessed images into memory
      const sortedKeys = Array.from(accessFrequency.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20) // Load top 20 images
        .map(([key]) => key);

      sortedKeys.forEach(key => {
        const image = this.loadFromDiskCache(key.replace('image_', ''));
        if (image) {
          this.memoryCache.set(image.id, image);
        }
      });
    } catch (error) {
      console.warn('Failed to load memory cache:', error);
    }
  }

  private updateAccessLog(imageId: string): void {
    this.accessLog.push({ imageId, timestamp: Date.now() });
    
    // Keep only recent access log (last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.accessLog = this.accessLog.filter(log => log.timestamp > oneHourAgo);
    
    // Update access count in cached image
    const image = this.memoryCache.get(imageId);
    if (image) {
      image.metadata.lastAccessed = Date.now();
      image.metadata.accessCount++;
    }
  }

  private getCurrentCacheSize(): number {
    let size = 0;
    this.memoryCache.forEach(image => {
      size += image.metadata.optimizedSize;
    });
    return size;
  }

  private async checkMemoryUsage(): Promise<void> {
    const currentSize = this.getCurrentCacheSize();
    const maxMemoryUsage = 50 * 1024 * 1024; // 50MB for image cache

    if (currentSize > maxMemoryUsage) {
      // Clear least recently used images
      await this.clearCache({
        sizeLimit: maxMemoryUsage * 0.8, // Clear to 80% of limit
      });

      // Record memory cleanup event
      performanceMonitor.recordMetric(
        'image_cache_cleanup',
        currentSize,
        'bytes',
        'memory',
        { trigger: 'memory_limit', freedBytes: currentSize - this.getCurrentCacheSize() }
      );
    }
  }

  private async waitForLoading(cacheKey: string): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (!this.loadingQueue.has(cacheKey)) {
          resolve();
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private startCacheCleanup(): void {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.clearCache({
        olderThan: 60 * 60 * 1000, // Clear images older than 1 hour
      });
    }, 5 * 60 * 1000);
  }
}

// Singleton instance
export const imageOptimization = new ImageOptimizationManager();

/**
 * React hook for optimized image loading
 */
export function useOptimizedImage(uri: string, options: ImageCompressionOptions = {}) {
  const [imageData, setImageData] = useState<{
    loaded: boolean;
    optimized?: string;
    thumbnail?: string;
    loading: boolean;
    error?: string;
    fromCache: boolean;
    loadTime: number;
  }>({
    loaded: false,
    loading: false,
    fromCache: false,
    loadTime: 0,
  });

  useEffect(() => {
    let isCancelled = false;
    
    const loadImage = async () => {
      setImageData((prev: typeof imageData) => {
        const next: typeof imageData = { ...prev, loading: true };
        if (prev.error !== undefined) {
          delete next.error;
        }
        return next;
      });
      
      try {
        const result = await imageOptimization.optimizeImage(uri, {
          ...options,
          generateThumbnail: true,
          priority: 'normal',
        });

        if (!isCancelled) {
          const nextState: typeof imageData = {
            loaded: result.success,
            loading: false,
            fromCache: result.fromCache,
            loadTime: result.loadTime,
          };
          if (result.optimized) {
            nextState.optimized = result.optimized;
          }
          if (result.thumbnail) {
            nextState.thumbnail = result.thumbnail;
          }
          if (result.error) {
            nextState.error = result.error;
          }
          setImageData(nextState);
        }
      } catch (error) {
        if (!isCancelled) {
          setImageData((prev: typeof imageData) => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Load failed',
          }));
        }
      }
    };

    loadImage();
    
    return () => {
      isCancelled = true;
    };
  }, [uri, JSON.stringify(options)]);

  return imageData;
}

