// Asset optimization utilities - no React Native imports for now

/**
 * Asset loading with lazy initialization and caching
 */
class AssetLoader {
  private static instance: AssetLoader;
  private imageCache = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();

  static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  /**
   * Lazy load and cache country flag images
   */
  async loadCountryFlag(countryCode: string): Promise<any> {
    const cacheKey = `flag-${countryCode.toLowerCase()}`;
    
    // Check cache first
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey);
    }

    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // Create loading promise
    const loadingPromise = this.loadFlagImage(countryCode);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const image = await loadingPromise;
      this.imageCache.set(cacheKey, image);
      this.loadingPromises.delete(cacheKey);
      return image;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      console.warn(`Failed to load flag for ${countryCode}:`, error);
      return this.getDefaultFlag();
    }
  }

  private async loadFlagImage(countryCode: string): Promise<any> {
    // Placeholder for future flag loading implementation
    // For now, return default flag for all countries
    console.log(`Loading flag for ${countryCode}`);
    return this.getDefaultFlag();
  }

  private getDefaultFlag(): any {
    // Return a small placeholder flag
    return { uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAyNCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjE4IiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjEiIHk9IjEiIHdpZHRoPSIyMiIgaGVpZ2h0PSIxNiIgc3Ryb2tlPSIjRDFENUQ5IiBzdHJva2Utd2lkdGg9IjAuNSIvPgo8L3N2Zz4K' };
  }

  /**
   * Lazy load icon images with caching
   */
  async loadIcon(iconName: string, size: 'small' | 'medium' | 'large' = 'medium'): Promise<any> {
    const cacheKey = `icon-${iconName}-${size}`;
    
    // Check cache first
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey);
    }

    // Placeholder for future icon loading implementation
    console.log(`Loading icon ${iconName} in size ${size}`);
    
    // Return placeholder icon
    const placeholder = { uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI0Y5RkFGQiIgc3Ryb2tlPSIjRDFEOUQ5Ii8+PC9zdmc+' };
    this.imageCache.set(cacheKey, placeholder);
    return placeholder;
  }

  /**
   * Preload critical assets for better perceived performance
   */
  async preloadCriticalAssets(): Promise<void> {
    const criticalFlags = ['JPN', 'MYS', 'SGP']; // MVP countries
    const criticalIcons = ['camera', 'qr-code', 'user', 'settings'];

    const flagPromises = criticalFlags.map(code => this.loadCountryFlag(code));
    const iconPromises = criticalIcons.map(icon => this.loadIcon(icon, 'medium'));

    await Promise.allSettled([...flagPromises, ...iconPromises]);
  }

  /**
   * Clear cache to free up memory
   */
  clearCache(): void {
    this.imageCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache size for monitoring
   */
  getCacheSize(): { entries: number; estimatedSizeBytes: number } {
    // Rough estimation - each cached image is approximately 1-5KB
    const entries = this.imageCache.size;
    const estimatedSizeBytes = entries * 3 * 1024; // 3KB average per image
    
    return { entries, estimatedSizeBytes };
  }
}

/**
 * Image optimization configuration for better performance
 */
export const ImageOptimizationConfig = {
  // Default props for optimized images
  defaultProps: {
    fadeDuration: 150,
    progressiveRenderingEnabled: true,
    shouldRasterizeIOS: true,
    renderToHardwareTextureAndroid: true,
  },
  
  // Resize modes for different use cases
  resizeModes: {
    flag: 'cover' as const,
    icon: 'contain' as const,
    avatar: 'cover' as const,
    screenshot: 'contain' as const,
  },
};

/**
 * Utility functions for asset optimization
 */
export const AssetUtils = {
  /**
   * Get optimized image dimensions based on screen density
   */
  getOptimizedDimensions(baseWidth: number, baseHeight: number): { width: number; height: number } {
    // Use lower resolution images on lower density screens
    const { PixelRatio } = require('react-native');
    const scale = Math.min(PixelRatio.get(), 2); // Cap at 2x for performance
    
    return {
      width: baseWidth * scale,
      height: baseHeight * scale,
    };
  },

  /**
   * Generate responsive image sizes for different screen densities
   */
  getResponsiveImageUri(baseUri: string, width: number, height: number): string {
    const { Dimensions, PixelRatio } = require('react-native');
    const screenWidth = Dimensions.get('window').width;
    const scale = PixelRatio.get();
    
    // Adjust image size based on screen width and pixel density
    let targetWidth = width;
    let targetHeight = height;
    
    if (screenWidth < 400) { // Small screens
      targetWidth = Math.floor(width * 0.8);
      targetHeight = Math.floor(height * 0.8);
    } else if (scale > 2) { // High density screens
      targetWidth = Math.floor(width * 1.2);
      targetHeight = Math.floor(height * 1.2);
    }
    
    // If using a CDN or image service, append size parameters
    if (baseUri.includes('cloudinary.com') || baseUri.includes('imagekit.io')) {
      return `${baseUri}?w=${targetWidth}&h=${targetHeight}&f=auto&q=auto`;
    }
    
    return baseUri;
  },

  /**
   * Estimate asset bundle size
   */
  estimateAssetBundleSize(): number {
    const estimatedSizes = {
      flags: 8 * 2 * 1024, // 8 countries × 2KB each
      icons: 10 * 3 * 1024, // 10 icons × 3KB each  
      screenshots: 0, // Guide screenshots would be loaded from remote URLs
      fonts: 0, // Using system fonts
    };
    
    return Object.values(estimatedSizes).reduce((total, size) => total + size, 0);
  },
};

// Export singleton instance
export const assetLoader = AssetLoader.getInstance();